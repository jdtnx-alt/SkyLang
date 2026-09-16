/**
 * Autorización académica: qué puede abrir un aprendiz y qué no.
 *
 * Antes el bloqueo era un campo de presentación (`locked`) que calculaba la
 * consulta de módulos y respetaba únicamente el navegador: una petición directa
 * al RAP 6 funcionaba sin haber tocado el RAP 1. Aquí la regla se aplica en el
 * servidor, en toda lectura y escritura de actividades.
 *
 * Regla vigente (decisión: el progreso se mide por RAP):
 *   - El primer RAP del programa (orden 1) está siempre disponible.
 *   - El RAP N se abre cuando el RAP N-1 alcanzó el 100 % de avance oficial.
 *   - El estado 'bloqueado' solo lo levanta desbloquearSiguientes(), nunca un
 *     recálculo de porcentajes.
 */

/**
 * @returns {Promise<{ permitido: boolean, motivo?: string, estado?: string }>}
 */
export async function puedeAccederRap(client, aprendizId, rapId) {
  const res = await client.query(
    `SELECT r.id, r.orden, r.programa_id,
            p.estado AS estado_progreso,
            anterior.id            AS rap_anterior_id,
            anterior.titulo        AS rap_anterior_titulo,
            pa.porcentaje_maximo   AS avance_anterior
       FROM raps r
       LEFT JOIN progreso_rap_aprendiz p
              ON p.rap_id = r.id AND p.aprendiz_id = $2
       LEFT JOIN raps anterior
              ON anterior.programa_id = r.programa_id AND anterior.orden = r.orden - 1
       LEFT JOIN progreso_rap_aprendiz pa
              ON pa.rap_id = anterior.id AND pa.aprendiz_id = $2
      WHERE r.id = $1`,
    [rapId, aprendizId]
  );

  if (res.rows.length === 0) {
    return { permitido: false, motivo: 'El RAP no existe' };
  }
  const fila = res.rows[0];

  // El aprendiz debe estar matriculado en una ficha del programa del RAP.
  const matricula = await client.query(
    `SELECT 1 FROM aprendiz_ficha af
       JOIN fichas f ON f.id = af.ficha_id
      WHERE af.aprendiz_id = $1 AND f.programa_id = $2 LIMIT 1`,
    [aprendizId, fila.programa_id]
  );
  if (matricula.rows.length === 0) {
    return { permitido: false, motivo: 'No estás matriculado en este programa' };
  }

  if (fila.orden === 1) return { permitido: true, estado: fila.estado_progreso || 'disponible' };

  if (fila.estado_progreso && fila.estado_progreso !== 'bloqueado') {
    return { permitido: true, estado: fila.estado_progreso };
  }

  const avanceAnterior = parseFloat(fila.avance_anterior ?? 0);
  if (avanceAnterior >= 100) {
    return { permitido: true, estado: fila.estado_progreso || 'disponible' };
  }

  return {
    permitido: false,
    estado: 'bloqueado',
    motivo: fila.rap_anterior_titulo
      ? `No cumples los requisitos para acceder: primero debes completar «${fila.rap_anterior_titulo}» (avance actual ${avanceAnterior}%).`
      : 'No cumples los requisitos para acceder.'
  };
}

/** El bloqueo se aplica a los aprendices; instructor y administrador lo omiten. */
export function debeAplicarBloqueo(rol) {
  return (rol || '').toLowerCase() === 'aprendiz';
}

/**
 * Comprueba el acceso al RAP que contiene una actividad. Una actividad puede
 * estar en varios RAP: basta con poder acceder a uno de ellos.
 */
export async function puedeAccederActividad(client, aprendizId, actividadId) {
  const raps = await client.query(
    `SELECT DISTINCT rm.rap_id
       FROM rap_momento_actividades rma
       JOIN rap_momentos rm ON rm.id = rma.rap_momento_id
      WHERE rma.actividad_id = $1`,
    [actividadId]
  );
  if (raps.rows.length === 0) {
    return { permitido: false, motivo: 'La actividad no está vinculada a ningún RAP' };
  }

  let ultimoMotivo = 'No cumples los requisitos para acceder.';
  for (const { rap_id: rapId } of raps.rows) {
    const veredicto = await puedeAccederRap(client, aprendizId, rapId);
    if (veredicto.permitido) return veredicto;
    ultimoMotivo = veredicto.motivo;
  }
  return { permitido: false, estado: 'bloqueado', motivo: ultimoMotivo };
}

/**
 * Crea las filas de progreso al matricular a un aprendiz en una ficha.
 *
 * Sin esto, "no hay fila", "bloqueado" y "disponible" eran indistinguibles y las
 * consultas los colapsaban en el más permisivo con un COALESCE: el estado por
 * defecto de la plataforma era todo abierto.
 */
export async function materializarProgreso(client, aprendizId, fichaId) {
  await client.query(
    `INSERT INTO progreso_rap_aprendiz
       (rap_id, aprendiz_id, estado, porcentaje, porcentaje_maximo,
        actividades_completadas, actividades_totales, desbloqueado_en)
     SELECT r.id, $1,
            CASE WHEN r.orden = 1 THEN 'disponible' ELSE 'bloqueado' END,
            0, 0, 0, 0,
            CASE WHEN r.orden = 1 THEN NOW() ELSE NULL END
       FROM fichas f
       JOIN raps r ON r.programa_id = f.programa_id
      WHERE f.id = $2
     ON CONFLICT (rap_id, aprendiz_id) DO NOTHING`,
    [aprendizId, fichaId]
  );

  // El módulo no tiene bloqueo propio: su accesibilidad se deriva de sus RAP.
  await client.query(
    `INSERT INTO progreso_modulo_aprendiz
       (modulo_id, aprendiz_id, estado, porcentaje, porcentaje_maximo, raps_completados, raps_totales)
     SELECT m.id, $1, 'disponible', 0, 0, 0,
            (SELECT COUNT(*) FROM modulo_rap mr WHERE mr.modulo_id = m.id)
       FROM fichas f
       JOIN modulos m ON m.programa_id = f.programa_id
      WHERE f.id = $2
     ON CONFLICT (modulo_id, aprendiz_id) DO NOTHING`,
    [aprendizId, fichaId]
  );
}

/**
 * Abre el RAP siguiente a cada RAP que haya alcanzado el 100 % (CU-08).
 * Devuelve los RAP recién desbloqueados, para poder notificarlos.
 */
export async function desbloquearSiguientes(client, aprendizId, rapIds) {
  // Inserta la fila si no existía. Con un UPDATE a secas, un aprendiz cuyo
  // progreso no estuviera materializado —el caso de una base recién creada—
  // completaba el RAP y el siguiente no se abría nunca, porque no había nada
  // que actualizar.
  const res = await client.query(
    `INSERT INTO progreso_rap_aprendiz
       (rap_id, aprendiz_id, estado, porcentaje, porcentaje_maximo,
        actividades_completadas, actividades_totales, desbloqueado_en, actualizado_en)
     SELECT r_sig.id, $1, 'disponible', 0, 0, 0, 0, NOW(), NOW()
       FROM raps r_actual
       JOIN raps r_sig
         ON r_sig.programa_id = r_actual.programa_id
        AND r_sig.orden = r_actual.orden + 1
       JOIN progreso_rap_aprendiz p_actual
         ON p_actual.rap_id = r_actual.id AND p_actual.aprendiz_id = $1
      WHERE r_actual.id = ANY($2::int[])
        AND p_actual.porcentaje_maximo >= 100
     ON CONFLICT (rap_id, aprendiz_id) DO UPDATE SET
       estado          = 'disponible',
       desbloqueado_en = COALESCE(progreso_rap_aprendiz.desbloqueado_en, NOW()),
       actualizado_en  = NOW()
     -- Solo se toca lo que estaba bloqueado: así el resultado sigue diciendo
     -- qué se acaba de abrir, y llamarlo dos veces no reabre nada.
     WHERE progreso_rap_aprendiz.estado = 'bloqueado'
     RETURNING rap_id`,
    [aprendizId, rapIds]
  );
  return res.rows.map((r) => r.rap_id);
}

// ══════════════════════════════════════════════════════════════════════
// Alcance del instructor
//
// requireRole solo comprueba el rol ("¿eres instructor?"), nunca la pertenencia
// ("¿es tuya esta ficha?"). Sin esto, cualquier instructor podía crear
// actividades en la ficha de otro y borrar módulos de cualquier programa,
// arrastrando el progreso de todos sus aprendices.
// ══════════════════════════════════════════════════════════════════════

export function esAdministrador(rol) {
  const r = (rol || '').toLowerCase();
  return r === 'admin' || r === 'administrador';
}

/** El instructor gestiona una ficha si la tiene asignada. El admin, cualquiera. */
export async function gestionaFicha(client, user, fichaId) {
  if (esAdministrador(user?.rol)) return true;
  const res = await client.query(
    `SELECT 1 FROM instructor_ficha WHERE instructor_id = $1 AND ficha_id = $2 LIMIT 1`,
    [user?.id, fichaId]
  );
  return res.rows.length > 0;
}

/** El instructor gestiona un programa si tiene alguna ficha suya dentro de él. */
export async function gestionaPrograma(client, user, programaId) {
  if (esAdministrador(user?.rol)) return true;
  const res = await client.query(
    `SELECT 1 FROM instructor_ficha ifi
       JOIN fichas f ON f.id = ifi.ficha_id
      WHERE ifi.instructor_id = $1 AND f.programa_id = $2 LIMIT 1`,
    [user?.id, programaId]
  );
  return res.rows.length > 0;
}

/** Igual que gestionaPrograma, pero partiendo de un módulo. */
export async function gestionaModulo(client, user, moduloId) {
  const res = await client.query('SELECT programa_id FROM modulos WHERE id = $1', [moduloId]);
  if (res.rows.length === 0) return { existe: false, permitido: false };
  const permitido = await gestionaPrograma(client, user, res.rows[0].programa_id);
  return { existe: true, permitido, programaId: res.rows[0].programa_id };
}
