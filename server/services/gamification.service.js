/**
 * Motor de Gamificación — SkyLang
 *
 * Responsabilidades:
 *   1. Otorgar Puntos de Miel (XP) en registro_puntos cuando un aprendiz
 *      aprueba una actividad. El índice único de la tabla garantiza que no
 *      se dupliquen los puntos por repetición de la misma actividad.
 *   2. Evaluar si el aprendiz cumplió el criterio de alguna insignia y, si
 *      no la tiene aún, insertarla en insignias_aprendiz.
 *   3. Devolver la lista completa de insignias con su progreso para la
 *      vitrina de Logros del aprendiz.
 *
 * Regla de XP por actividad:
 *   - Nota 100%  → 100 puntos
 *   - Nota ≥ 70% → 50 puntos
 *   (Solo en el primer intento aprobado; los intentos posteriores no suman XP)
 */

// ── Tabla de XP fijo que otorga cada insignia al desbloquearse ─────────────
const XP_POR_INSIGNIA = {
  PRIMER_PASO:      50,
  PERFIL_COMPLETO:  30,
  PRIMER_MOMENTO:   40,
  MEMORY_MASTER:    75,
  LISTENING_NURSE:  80,
  VOCABULARIO_PRO: 100,
  NOTA_PERFECTA:   100,
  EMERGENCY_READY: 150,
  RACHA_3_DIAS:     50,
  RACHA_7_DIAS:    120,
  TIEMPO_ESTUDIO_2H:100,
  RAP_1_COMPLETO:  100,
  RAP_2_3_COMPLETO:150,
  RAP_4_5_COMPLETO:150,
  PROGRAMA_COMPLETO:300,
  XP_500:           50,
  XP_1500:         100,
  XP_3000:         200,
};

// ── XP por actividad aprobada ───────────────────────────────────────────────
const XP_NOTA_PERFECTA = 100;
const XP_APROBADA      = 50;

// ────────────────────────────────────────────────────────────────────────────
// 1. OTORGAR XP POR ACTIVIDAD APROBADA
// Debe llamarse dentro de una transacción activa (client) justo después
// de actualizar calificacion_oficial_actividad.
// ────────────────────────────────────────────────────────────────────────────
export async function otorgarXpPorActividad(client, {
  aprendizId,
  fichaId,
  actividadId,
  calificacion,
  esNuevoAprobado,  // true solo si es la primera vez que aprueba
}) {
  if (!esNuevoAprobado) return 0;

  const cantidad = calificacion >= 100 ? XP_NOTA_PERFECTA : XP_APROBADA;

  try {
    await client.query(
      `INSERT INTO registro_puntos
         (aprendiz_id, ficha_id, actividad_id, origen, cantidad_puntos, fecha_obtencion)
       VALUES ($1, $2, $3, 'actividad', $4, NOW())
       ON CONFLICT DO NOTHING`,
      [aprendizId, fichaId, actividadId, cantidad]
    );
  } catch (_) {
    // El índice único uq_puntos_actividad previene duplicados; no es error fatal.
  }

  return cantidad;
}

// ────────────────────────────────────────────────────────────────────────────
// 2. OTORGAR XP POR INSIGNIA
// Se llama cuando se desbloquea una insignia nueva.
// ────────────────────────────────────────────────────────────────────────────
async function otorgarXpPorInsignia(client, { aprendizId, fichaId, codigoCriterio }) {
  const cantidad = XP_POR_INSIGNIA[codigoCriterio] || 0;
  if (!cantidad) return;

  await client.query(
    `INSERT INTO registro_puntos
       (aprendiz_id, ficha_id, origen, cantidad_puntos, fecha_obtencion)
     VALUES ($1, $2, 'insignia', $3, NOW())`,
    [aprendizId, fichaId, cantidad]
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 3. CONCEDER UNA INSIGNIA NUEVA (si no la tiene ya)
// Devuelve true si fue otorgada en esta llamada.
// ────────────────────────────────────────────────────────────────────────────
async function concederInsignia(client, { aprendizId, fichaId, codigo }) {
  // Buscar la insignia por código
  const ins = await client.query(
    `SELECT id FROM insignias WHERE codigo_criterio = $1`,
    [codigo]
  );
  if (!ins.rows.length) return false;

  const insigniaId = ins.rows[0].id;

  // Insertar solo si no la tiene (ON CONFLICT DO NOTHING)
  const result = await client.query(
    `INSERT INTO insignias_aprendiz (aprendiz_id, insignia_id, fecha_otorgada)
     VALUES ($1, $2, NOW())
     ON CONFLICT (aprendiz_id, insignia_id) DO NOTHING
     RETURNING insignia_id`,
    [aprendizId, insigniaId]
  );

  if (result.rows.length === 0) return false; // ya la tenía

  // Otorgar XP bono por esta insignia
  await otorgarXpPorInsignia(client, { aprendizId, fichaId, codigoCriterio: codigo });
  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// 4. EVALUAR TODAS LAS INSIGNIAS TRAS UN INTENTO ENVIADO
// Se llama desde cerrarIntento, dentro de la misma transacción.
// ────────────────────────────────────────────────────────────────────────────
export async function evaluarInsignias(client, { aprendizId, fichaId, calificacion }) {
  const otorgadas = [];

  // ── Helpers internos ──────────────────────────────────────────────────────

  async function otorgarSi(condicion, codigo) {
    if (!condicion) return;
    const nueva = await concederInsignia(client, { aprendizId, fichaId, codigo });
    if (nueva) otorgadas.push(codigo);
  }

  // ── 1. PRIMER_PASO: primera actividad aprobada ───────────────────────────
  const primeraAprobada = await client.query(
    `SELECT 1 FROM calificacion_oficial_actividad
     WHERE aprendiz_id = $1 AND aprobada = true LIMIT 1`,
    [aprendizId]
  );
  await otorgarSi(primeraAprobada.rows.length > 0, 'PRIMER_PASO');

  // ── 1b. PRIMER_MOMENTO: TODAS las actividades de algún momento completas ──
  // Busca cualquier rap_momento donde la cantidad total de actividades de la
  // ficha del aprendiz sea igual a la cantidad de actividades ya aprobadas.
  if (fichaId) {
    const momentoCompletoRes = await client.query(
      `SELECT rm.id
       FROM rap_momentos rm
       JOIN rap_momento_actividades rma ON rma.rap_momento_id = rm.id
       JOIN actividades a ON a.id = rma.actividad_id AND a.ficha_id = $2
       GROUP BY rm.id
       HAVING COUNT(a.id) > 0
          AND COUNT(a.id) = COUNT(
            CASE WHEN EXISTS (
              SELECT 1 FROM calificacion_oficial_actividad coa
              WHERE coa.actividad_id = a.id
                AND coa.aprendiz_id = $1
                AND coa.aprobada = true
            ) THEN 1 END
          )
       LIMIT 1`,
      [aprendizId, fichaId]
    );
    await otorgarSi(momentoCompletoRes.rows.length > 0, 'PRIMER_MOMENTO');
  }

  // ── 2. NOTA_PERFECTA: 100% en cualquier actividad ───────────────────────
  await otorgarSi(calificacion >= 100, 'NOTA_PERFECTA');

  // ── 3. RACHA_3_DIAS y RACHA_7_DIAS ───────────────────────────────────────
  const rachaRes = await client.query(
    `SELECT COUNT(DISTINCT DATE(fecha_fin))::int AS dias
     FROM intentos_actividad
     WHERE aprendiz_id = $1
       AND fecha_fin >= NOW() - INTERVAL '7 days'
       AND fecha_fin IS NOT NULL`,
    [aprendizId]
  );
  const diasActivos = rachaRes.rows[0]?.dias || 0;
  await otorgarSi(diasActivos >= 3, 'RACHA_3_DIAS');
  await otorgarSi(diasActivos >= 7, 'RACHA_7_DIAS');

  // ── 4. TIEMPO_ESTUDIO_2H ─────────────────────────────────────────────────
  const tiempoRes = await client.query(
    `SELECT COALESCE(SUM(duracion_segundos), 0)::int AS segundos
     FROM intentos_actividad
     WHERE aprendiz_id = $1 AND duracion_segundos IS NOT NULL`,
    [aprendizId]
  );
  const minutosTotal = (tiempoRes.rows[0]?.segundos || 0) / 60;
  await otorgarSi(minutosTotal >= 120, 'TIEMPO_ESTUDIO_2H');

  // ── 5. VOCABULARIO_PRO: 5 actividades de vocabulario completadas ─────────
  const vocabRes = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM calificacion_oficial_actividad coa
     JOIN actividades a ON a.id = coa.actividad_id
     WHERE coa.aprendiz_id = $1
       AND a.tipo::text = 'vocabulario'
       AND coa.aprobada = true`,
    [aprendizId]
  );
  await otorgarSi((vocabRes.rows[0]?.total || 0) >= 5, 'VOCABULARIO_PRO');

  // ── 6. MEMORY_MASTER: 3 juegos de memoria superados (tipo 'otro' con gameType memory) ─
  const memRes = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM calificacion_oficial_actividad coa
     JOIN actividades a ON a.id = coa.actividad_id
     WHERE coa.aprendiz_id = $1
       AND a.tipo::text = 'otro'
       AND a.datos_json->>'gameType' = 'memory'
       AND coa.aprobada = true`,
    [aprendizId]
  );
  await otorgarSi((memRes.rows[0]?.total || 0) >= 3, 'MEMORY_MASTER');

  // ── 7. RAP_1_COMPLETO ────────────────────────────────────────────────────
  const rap1Res = await client.query(
    `SELECT pra.porcentaje
     FROM progreso_rap_aprendiz pra
     JOIN raps r ON r.id = pra.rap_id
     WHERE pra.aprendiz_id = $1 AND r.orden = 1 LIMIT 1`,
    [aprendizId]
  );
  await otorgarSi((rap1Res.rows[0]?.porcentaje || 0) >= 100, 'RAP_1_COMPLETO');

  // ── 8. RAP_2_3_COMPLETO ──────────────────────────────────────────────────
  const rap23Res = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM progreso_rap_aprendiz pra
     JOIN raps r ON r.id = pra.rap_id
     WHERE pra.aprendiz_id = $1 AND r.orden IN (2,3) AND pra.porcentaje >= 100`,
    [aprendizId]
  );
  await otorgarSi((rap23Res.rows[0]?.total || 0) >= 2, 'RAP_2_3_COMPLETO');

  // ── 9. RAP_4_5_COMPLETO ──────────────────────────────────────────────────
  const rap45Res = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM progreso_rap_aprendiz pra
     JOIN raps r ON r.id = pra.rap_id
     WHERE pra.aprendiz_id = $1 AND r.orden IN (4,5) AND pra.porcentaje >= 100`,
    [aprendizId]
  );
  await otorgarSi((rap45Res.rows[0]?.total || 0) >= 2, 'RAP_4_5_COMPLETO');

  // ── 10. EMERGENCY_READY: RAP 6 completo ──────────────────────────────────
  const rap6Res = await client.query(
    `SELECT pra.porcentaje
     FROM progreso_rap_aprendiz pra
     JOIN raps r ON r.id = pra.rap_id
     WHERE pra.aprendiz_id = $1 AND r.orden = 6 LIMIT 1`,
    [aprendizId]
  );
  await otorgarSi((rap6Res.rows[0]?.porcentaje || 0) >= 100, 'EMERGENCY_READY');

  // ── 11. PROGRAMA_COMPLETO: todos los RAPs al 100% ────────────────────────
  const todosRes = await client.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE pra.porcentaje >= 100)::int AS completados
     FROM progreso_rap_aprendiz pra
     JOIN raps r ON r.id = pra.rap_id
     WHERE pra.aprendiz_id = $1`,
    [aprendizId]
  );
  const tr = todosRes.rows[0] || {};
  await otorgarSi(tr.total > 0 && tr.total === tr.completados, 'PROGRAMA_COMPLETO');

  // ── 12. Insignias de XP acumulado ────────────────────────────────────────
  // Las evaluamos DESPUÉS de otorgar XP por la actividad actual.
  const xpRes = await client.query(
    `SELECT COALESCE(SUM(cantidad_puntos), 0)::int AS total
     FROM registro_puntos WHERE aprendiz_id = $1`,
    [aprendizId]
  );
  const xpTotal = xpRes.rows[0]?.total || 0;
  await otorgarSi(xpTotal >= 500,  'XP_500');
  await otorgarSi(xpTotal >= 1500, 'XP_1500');
  await otorgarSi(xpTotal >= 3000, 'XP_3000');

  return otorgadas;
}

// ────────────────────────────────────────────────────────────────────────────
// 4b. EVALUACIÓN RETROACTIVA
// Se llama desde GET /api/student/badges para otorgar badges que el aprendiz
// ya mereció pero que nunca se evaluaron (e.g. antes del deploy de este módulo,
// o porque completó las condiciones fuera del flujo de envío de intento).
// Usa pool directamente (sin transacción abierta) para no interferir con otras ops.
// ────────────────────────────────────────────────────────────────────────────
export async function evaluarInsigniasRetroactivo(pool, aprendizId) {
  // Obtener ficha del aprendiz
  const fichaRes = await pool.query(
    `SELECT af.ficha_id FROM aprendiz_ficha af WHERE af.aprendiz_id = $1 LIMIT 1`,
    [aprendizId]
  );
  const fichaId = fichaRes.rows[0]?.ficha_id || null;

  // Helper: otorgar si no la tiene aún
  async function otorgarSiRetro(condicion, codigo) {
    if (!condicion) return;
    const ins = await pool.query(
      `SELECT id FROM insignias WHERE codigo_criterio = $1`, [codigo]
    );
    if (!ins.rows.length) return;
    const insigniaId = ins.rows[0].id;
    const result = await pool.query(
      `INSERT INTO insignias_aprendiz (aprendiz_id, insignia_id, fecha_otorgada)
       VALUES ($1, $2, NOW())
       ON CONFLICT (aprendiz_id, insignia_id) DO NOTHING
       RETURNING insignia_id`,
      [aprendizId, insigniaId]
    );
    if (result.rows.length > 0) {
      const xpBonus = XP_POR_INSIGNIA[codigo] || 0;
      if (xpBonus > 0 && fichaId) {
        await pool.query(
          `INSERT INTO registro_puntos (aprendiz_id, ficha_id, origen, cantidad_puntos, fecha_obtencion)
           VALUES ($1, $2, 'insignia', $3, NOW())`,
          [aprendizId, fichaId, xpBonus]
        );
      }
    }
  }

  try {
    // 1. PRIMER_PASO
    const paso = await pool.query(
      `SELECT 1 FROM calificacion_oficial_actividad WHERE aprendiz_id = $1 AND aprobada = true LIMIT 1`,
      [aprendizId]
    );
    await otorgarSiRetro(paso.rows.length > 0, 'PRIMER_PASO');

    // 2. PRIMER_MOMENTO
    if (fichaId) {
      const momento = await pool.query(
        `SELECT rm.id
         FROM rap_momentos rm
         JOIN rap_momento_actividades rma ON rma.rap_momento_id = rm.id
         JOIN actividades a ON a.id = rma.actividad_id AND a.ficha_id = $2
         GROUP BY rm.id
         HAVING COUNT(a.id) > 0
            AND COUNT(a.id) = COUNT(
              CASE WHEN EXISTS (
                SELECT 1 FROM calificacion_oficial_actividad coa
                WHERE coa.actividad_id = a.id AND coa.aprendiz_id = $1 AND coa.aprobada = true
              ) THEN 1 END
            )
         LIMIT 1`,
        [aprendizId, fichaId]
      );
      await otorgarSiRetro(momento.rows.length > 0, 'PRIMER_MOMENTO');
    }

    // 3. NOTA_PERFECTA (desde historial, no desde calificación del intento actual)
    const perfecta = await pool.query(
      `SELECT 1 FROM calificacion_oficial_actividad
       WHERE aprendiz_id = $1 AND mejor_calificacion >= 100 LIMIT 1`,
      [aprendizId]
    );
    await otorgarSiRetro(perfecta.rows.length > 0, 'NOTA_PERFECTA');

    // 4. RACHA
    const rachaRes = await pool.query(
      `SELECT COUNT(DISTINCT DATE(fecha_fin))::int AS dias
       FROM intentos_actividad
       WHERE aprendiz_id = $1 AND fecha_fin >= NOW() - INTERVAL '7 days' AND fecha_fin IS NOT NULL`,
      [aprendizId]
    );
    const dias = rachaRes.rows[0]?.dias || 0;
    await otorgarSiRetro(dias >= 3, 'RACHA_3_DIAS');
    await otorgarSiRetro(dias >= 7, 'RACHA_7_DIAS');

    // 5. TIEMPO
    const tiempoRes = await pool.query(
      `SELECT COALESCE(SUM(duracion_segundos), 0)::int AS seg
       FROM intentos_actividad WHERE aprendiz_id = $1 AND duracion_segundos IS NOT NULL`,
      [aprendizId]
    );
    await otorgarSiRetro((tiempoRes.rows[0]?.seg || 0) / 60 >= 120, 'TIEMPO_ESTUDIO_2H');

    // 6. VOCABULARIO
    const voc = await pool.query(
      `SELECT COUNT(*)::int AS total FROM calificacion_oficial_actividad coa
       JOIN actividades a ON a.id = coa.actividad_id
       WHERE coa.aprendiz_id = $1 AND a.tipo::text = 'vocabulario' AND coa.aprobada = true`,
      [aprendizId]
    );
    await otorgarSiRetro((voc.rows[0]?.total || 0) >= 5, 'VOCABULARIO_PRO');

    // 7. MEMORY
    const mem = await pool.query(
      `SELECT COUNT(*)::int AS total FROM calificacion_oficial_actividad coa
       JOIN actividades a ON a.id = coa.actividad_id
       WHERE coa.aprendiz_id = $1 AND a.tipo::text = 'otro'
         AND a.datos_json->>'gameType' = 'memory' AND coa.aprobada = true`,
      [aprendizId]
    );
    await otorgarSiRetro((mem.rows[0]?.total || 0) >= 3, 'MEMORY_MASTER');

    // 8. RAPs
    const rapsRes = await pool.query(
      `SELECT r.orden, COALESCE(pra.porcentaje, 0) AS porcentaje
       FROM raps r
       LEFT JOIN progreso_rap_aprendiz pra ON pra.rap_id = r.id AND pra.aprendiz_id = $1
       ORDER BY r.orden ASC`,
      [aprendizId]
    );
    const rapPct = {};
    rapsRes.rows.forEach((r) => { rapPct[r.orden] = parseFloat(r.porcentaje) || 0; });

    await otorgarSiRetro((rapPct[1] || 0) >= 100, 'RAP_1_COMPLETO');
    await otorgarSiRetro(
      (rapPct[2] || 0) >= 100 && (rapPct[3] || 0) >= 100,
      'RAP_2_3_COMPLETO'
    );
    await otorgarSiRetro(
      (rapPct[4] || 0) >= 100 && (rapPct[5] || 0) >= 100,
      'RAP_4_5_COMPLETO'
    );
    await otorgarSiRetro((rapPct[6] || 0) >= 100, 'EMERGENCY_READY');

    const totalRaps = Object.keys(rapPct).length;
    const completados = Object.values(rapPct).filter((v) => v >= 100).length;
    await otorgarSiRetro(totalRaps > 0 && totalRaps === completados, 'PROGRAMA_COMPLETO');

    // 9. XP acumulado
    const xpRes = await pool.query(
      `SELECT COALESCE(SUM(cantidad_puntos), 0)::int AS total FROM registro_puntos WHERE aprendiz_id = $1`,
      [aprendizId]
    );
    const xp = xpRes.rows[0]?.total || 0;
    await otorgarSiRetro(xp >= 500,  'XP_500');
    await otorgarSiRetro(xp >= 1500, 'XP_1500');
    await otorgarSiRetro(xp >= 3000, 'XP_3000');

  } catch (err) {
    // No lanzamos: la evaluación retroactiva es best-effort, no bloquea la carga de la vitrina
    console.warn('[gamification] Error en evaluación retroactiva:', err.message);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 5. OBTENER INSIGNIAS DEL APRENDIZ CON PROGRESO
// Para la vitrina de Logros (/api/student/badges).
// ────────────────────────────────────────────────────────────────────────────
export async function obtenerInsigniasConProgreso(pool, aprendizId) {
  // Traer todas las insignias y marcar cuáles ya tiene el aprendiz
  const res = await pool.query(
    `SELECT
       i.id,
       i.nombre,
       i.descripcion,
       i.codigo_criterio AS codigo,
       i.tipo_badge      AS tipo,
       ia.fecha_otorgada
     FROM insignias i
     LEFT JOIN insignias_aprendiz ia
       ON ia.insignia_id = i.id AND ia.aprendiz_id = $1
     ORDER BY i.id ASC`,
    [aprendizId]
  );

  // Calcular progreso parcial para insignias no desbloqueadas
  const progresoPorCodigo = await calcularProgresoParcial(pool, aprendizId);

  const insignias = res.rows.map((row) => {
    const desbloqueada = Boolean(row.fecha_otorgada);
    const prog = progresoPorCodigo[row.codigo] || { actual: 0, meta: 1, porcentaje: 0 };
    return {
      id:            row.id,
      nombre:        row.nombre,
      descripcion:   row.descripcion,
      codigo:        row.codigo,
      tipo:          row.tipo,
      desbloqueada,
      fechaOtorgada: row.fecha_otorgada || null,
      progreso:      desbloqueada
        ? { actual: prog.meta, meta: prog.meta, porcentaje: 100 }
        : prog,
    };
  });

  const desbloqueadas = insignias.filter((i) => i.desbloqueada).length;

  // Puntos y nivel
  const xpRes = await pool.query(
    `SELECT COALESCE(SUM(cantidad_puntos), 0)::int AS total FROM registro_puntos WHERE aprendiz_id = $1`,
    [aprendizId]
  );
  const xpTotal = xpRes.rows[0]?.total || 0;
  const nivel   = Math.floor(xpTotal / 1000) + 1;

  return {
    resumen: {
      totalInsignias: insignias.length,
      desbloqueadas,
      puntosTotales:  xpTotal,
      nivel,
    },
    insignias,
  };
}

// ── Helper: calcula el progreso parcial de cada criterio ─────────────────────
async function calcularProgresoParcial(pool, aprendizId) {
  const p = {};

  const mk = (actual, meta) => ({
    actual,
    meta,
    porcentaje: meta > 0 ? Math.min(100, Math.round((actual / meta) * 100)) : 0,
  });

  // PRIMER_PASO: primera actividad aprobada (0 o 1)
  const aprobRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM calificacion_oficial_actividad WHERE aprendiz_id = $1 AND aprobada = true`,
    [aprendizId]
  );
  const aprobTotal = aprobRes.rows[0]?.total || 0;
  p['PRIMER_PASO'] = mk(Math.min(aprobTotal, 1), 1);

  // PRIMER_MOMENTO: progreso del momento más avanzado (actividades aprobadas / total en ese momento)
  // Encuentra el rap_momento con más actividades aprobadas y muestra su progreso real.
  const mejorMomentoRes = await pool.query(
    `SELECT
       COUNT(a.id)::int AS total,
       COUNT(CASE WHEN coa.aprobada = true THEN 1 END)::int AS aprobadas
     FROM rap_momentos rm
     JOIN rap_momento_actividades rma ON rma.rap_momento_id = rm.id
     JOIN actividades a ON a.id = rma.actividad_id
     LEFT JOIN calificacion_oficial_actividad coa
       ON coa.actividad_id = a.id AND coa.aprendiz_id = $1
     GROUP BY rm.id
     HAVING COUNT(a.id) > 0
     ORDER BY
       COUNT(CASE WHEN coa.aprobada = true THEN 1 END) DESC,
       COUNT(a.id) ASC
     LIMIT 1`,
    [aprendizId]
  );
  if (mejorMomentoRes.rows.length > 0) {
    const { aprobadas, total } = mejorMomentoRes.rows[0];
    p['PRIMER_MOMENTO'] = mk(aprobadas, total);
  } else {
    p['PRIMER_MOMENTO'] = mk(0, 1);
  }

  // Perfil (se devuelve 0 o 1; la evaluación real ocurre en el endpoint)
  p['PERFIL_COMPLETO'] = mk(0, 1);

  // Vocabulario
  const vocRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM calificacion_oficial_actividad coa
     JOIN actividades a ON a.id = coa.actividad_id
     WHERE coa.aprendiz_id = $1 AND a.tipo::text = 'vocabulario' AND coa.aprobada = true`,
    [aprendizId]
  );
  p['VOCABULARIO_PRO'] = mk(Math.min(vocRes.rows[0]?.total || 0, 5), 5);

  // Memory games
  const memRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM calificacion_oficial_actividad coa
     JOIN actividades a ON a.id = coa.actividad_id
     WHERE coa.aprendiz_id = $1 AND a.tipo::text = 'otro'
       AND a.datos_json->>'gameType' = 'memory' AND coa.aprobada = true`,
    [aprendizId]
  );
  p['MEMORY_MASTER'] = mk(Math.min(memRes.rows[0]?.total || 0, 3), 3);

  // Nota perfecta: 1 o 0
  const perfRes = await pool.query(
    `SELECT 1 FROM calificacion_oficial_actividad WHERE aprendiz_id = $1 AND mejor_calificacion >= 100 LIMIT 1`,
    [aprendizId]
  );
  p['NOTA_PERFECTA'] = mk(perfRes.rows.length, 1);

  // Racha de días activos (últimos 7)
  const rachaRes = await pool.query(
    `SELECT COUNT(DISTINCT DATE(fecha_fin))::int AS dias
     FROM intentos_actividad
     WHERE aprendiz_id = $1 AND fecha_fin >= NOW() - INTERVAL '7 days' AND fecha_fin IS NOT NULL`,
    [aprendizId]
  );
  const dias = rachaRes.rows[0]?.dias || 0;
  p['RACHA_3_DIAS'] = mk(Math.min(dias, 3), 3);
  p['RACHA_7_DIAS'] = mk(Math.min(dias, 7), 7);

  // Tiempo de estudio
  const tiempoRes = await pool.query(
    `SELECT COALESCE(SUM(duracion_segundos), 0)::int AS seg FROM intentos_actividad WHERE aprendiz_id = $1 AND duracion_segundos IS NOT NULL`,
    [aprendizId]
  );
  const minutos = Math.floor((tiempoRes.rows[0]?.seg || 0) / 60);
  p['TIEMPO_ESTUDIO_2H'] = mk(Math.min(minutos, 120), 120);

  // RAPs
  const rapsRes = await pool.query(
    `SELECT r.orden, COALESCE(pra.porcentaje, 0) AS porcentaje
     FROM raps r
     LEFT JOIN progreso_rap_aprendiz pra ON pra.rap_id = r.id AND pra.aprendiz_id = $1
     ORDER BY r.orden ASC`,
    [aprendizId]
  );
  const rapPct = {};
  rapsRes.rows.forEach((r) => { rapPct[r.orden] = parseFloat(r.porcentaje) || 0; });

  p['RAP_1_COMPLETO']   = mk(Math.min(rapPct[1] || 0, 100), 100);
  p['RAP_2_3_COMPLETO'] = mk(
    ((rapPct[2] >= 100 ? 1 : 0) + (rapPct[3] >= 100 ? 1 : 0)),
    2
  );
  p['RAP_4_5_COMPLETO'] = mk(
    ((rapPct[4] >= 100 ? 1 : 0) + (rapPct[5] >= 100 ? 1 : 0)),
    2
  );
  p['EMERGENCY_READY'] = mk(Math.min(rapPct[6] || 0, 100), 100);

  const totalRaps    = Object.keys(rapPct).length;
  const completados  = Object.values(rapPct).filter((v) => v >= 100).length;
  p['PROGRAMA_COMPLETO'] = mk(completados, totalRaps || 6);

  // XP acumulado
  const xpRes = await pool.query(
    `SELECT COALESCE(SUM(cantidad_puntos), 0)::int AS total FROM registro_puntos WHERE aprendiz_id = $1`,
    [aprendizId]
  );
  const xp = xpRes.rows[0]?.total || 0;
  p['XP_500']  = mk(Math.min(xp, 500),  500);
  p['XP_1500'] = mk(Math.min(xp, 1500), 1500);
  p['XP_3000'] = mk(Math.min(xp, 3000), 3000);

  return p;
}
