import express from 'express';
import pool from '../../db.js';
import { verifyToken } from '../../middleware/auth.middleware.js';
import { recalcularProgresoAprendiz, umbralesDeActividad } from '../../services/progress.service.js';
import { calificarIntento, enunciadoSeguro } from '../../services/grading.service.js';
import { puedeAccederActividad, debeAplicarBloqueo } from '../../services/access.service.js';
import { otorgarXpPorActividad, evaluarInsignias } from '../../services/gamification.service.js';

const router = express.Router();

/**
 * Comprueba el bloqueo académico antes de dejar operar sobre una actividad.
 * Devuelve null si puede seguir, o la respuesta de error si no.
 */
async function bloqueoAcademico(client, req, aprendizId, actividadId) {
  if (!debeAplicarBloqueo(req.user?.rol)) return null;
  const veredicto = await puedeAccederActividad(client, aprendizId, actividadId);
  if (veredicto.permitido) return null;
  return { estado: 423, cuerpo: { error: veredicto.motivo, bloqueado: true } };
}

const ESTADOS_ABIERTOS = ['en_curso', 'guardada'];

/**
 * Decide sobre qué aprendiz se opera. El aprendiz opera sobre sí mismo; el
 * instructor sobre los de sus fichas; el administrador sobre cualquiera.
 * Quien ejecuta la acción queda siempre registrado en el intento.
 */
async function resolverDestinatario(req, aprendizSolicitado) {
  const rol = (req.user?.rol || '').toLowerCase();

  if (rol === 'aprendiz') return { aprendizId: req.user.id };

  const objetivo = aprendizSolicitado || req.user.id;

  if (rol === 'instructor') {
    const permitido = await pool.query(
      `SELECT 1 FROM aprendiz_ficha af
         JOIN instructor_ficha ifi ON ifi.ficha_id = af.ficha_id
        WHERE af.aprendiz_id = $1 AND ifi.instructor_id = $2 LIMIT 1`,
      [objetivo, req.user.id]
    );
    if (permitido.rows.length === 0) {
      return { error: 'El aprendiz no pertenece a ninguna ficha asignada a este instructor' };
    }
    return { aprendizId: objetivo };
  }

  if (rol === 'admin' || rol === 'administrador') return { aprendizId: objetivo };

  return { error: 'Rol no reconocido' };
}

/** La actividad debe pertenecer a una ficha en la que el aprendiz esté matriculado. */
async function cargarActividadDelAprendiz(client, actividadId, aprendizId) {
  const res = await client.query(
    `SELECT a.id, a.titulo, a.tipo::text AS tipo, a.instrucciones, a.datos_json, a.obligatoria, a.ficha_id
       FROM actividades a
       JOIN aprendiz_ficha af ON af.ficha_id = a.ficha_id
      WHERE a.id = $1 AND af.aprendiz_id = $2`,
    [actividadId, aprendizId]
  );
  return res.rows[0] || null;
}

/** Serializa un intento para el cliente, sin filtrar la clave de corrección. */
function intentoPublico(fila) {
  return {
    id: fila.id,
    numeroIntento: fila.numero_intento,
    estado: fila.estado,
    respuestas: fila.respuestas_json,
    calificacion: fila.calificacion === null || fila.calificacion === undefined
      ? null : parseFloat(fila.calificacion),
    fechaInicio: fila.fecha_inicio,
    fechaFin: fila.fecha_fin,
    duracionSegundos: fila.duracion_segundos
  };
}

/**
 * Cierra un intento abierto: lo califica en el servidor, actualiza la nota
 * oficial y recalcula el progreso. Todo dentro de la transacción recibida.
 */
async function cerrarIntento(client, { intento, actividad, respuestas, aprendizId, registradoPor }) {
  const resultado = calificarIntento(actividad, respuestas);
  const umbrales = await umbralesDeActividad(client, actividad.id);

  // Las actividades que exigen criterio humano quedan a la espera del
  // instructor: no producen nota ni mueven el progreso.
  if (resultado.modo === 'manual') {
    const fila = await client.query(
      `UPDATE intentos_actividad
          SET estado = 'enviada', respuestas_json = $2, detalle_calificacion = $3,
              registrado_por = $4, fecha_actualizacion = NOW()
        WHERE id = $1
        RETURNING *`,
      [intento.id, respuestas ? JSON.stringify(respuestas) : null,
       JSON.stringify(resultado.detalle), registradoPor]
    );
    return {
      intento: intentoPublico(fila.rows[0]),
      modo: resultado.modo,
      pendienteRevision: true,
      aprobada: false,
      umbralAplicado: umbrales.aprobacion
    };
  }

  const calificacion = resultado.calificacion;
  const aprobada = calificacion >= umbrales.aprobacion;

  const filaRes = await client.query(
    `UPDATE intentos_actividad
        SET estado = $2, calificacion = $3, respuestas_json = $4,
            detalle_calificacion = $5, umbral_aplicado = $6, registrado_por = $7,
            fecha_fin = NOW(),
            duracion_segundos = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - fecha_inicio))::int),
            fecha_actualizacion = NOW()
      WHERE id = $1
      RETURNING *`,
    [intento.id, aprobada ? 'aprobada' : 'reprobada', calificacion,
     respuestas ? JSON.stringify(respuestas) : null,
     JSON.stringify(resultado.detalle), umbrales.aprobacion, registradoPor]
  );
  const fila = filaRes.rows[0];

  // Nota oficial = mejor nota histórica (RN-33). El vínculo al intento solo se
  // mueve cuando la nota realmente mejora, para que la evidencia corresponda.
  const oficialRes = await client.query(
    `INSERT INTO calificacion_oficial_actividad
       (actividad_id, aprendiz_id, mejor_calificacion, intento_id, aprobada,
        numero_intentos, primer_intento_en, fecha_actualizacion)
     VALUES ($1, $2, $3, $4, $5, 1, NOW(), NOW())
     ON CONFLICT (actividad_id, aprendiz_id) DO UPDATE SET
       mejor_calificacion = GREATEST(calificacion_oficial_actividad.mejor_calificacion, EXCLUDED.mejor_calificacion),
       intento_id = CASE
         WHEN EXCLUDED.mejor_calificacion > calificacion_oficial_actividad.mejor_calificacion
         THEN EXCLUDED.intento_id ELSE calificacion_oficial_actividad.intento_id END,
       aprobada = calificacion_oficial_actividad.aprobada OR EXCLUDED.aprobada,
       numero_intentos = calificacion_oficial_actividad.numero_intentos + 1,
       primer_intento_en = COALESCE(calificacion_oficial_actividad.primer_intento_en, EXCLUDED.primer_intento_en),
       fecha_actualizacion = NOW()
     RETURNING mejor_calificacion, aprobada, numero_intentos`,
    [actividad.id, aprendizId, calificacion, fila.id, aprobada]
  );
  const oficial = oficialRes.rows[0];

  const alcance = await recalcularProgresoAprendiz(client, aprendizId, actividad.id);

  // ── Gamificación: XP + Insignias ─────────────────────────────────────────
  // El XP solo se otorga la primera vez que aprueba (primer intento aprobado).
  const esNuevoAprobado = aprobada && oficial.numero_intentos === 1;
  const fichaRes = await client.query(
    `SELECT ficha_id FROM actividades WHERE id = $1`,
    [actividad.id]
  );
  const fichaId = fichaRes.rows[0]?.ficha_id || null;

  const xpGanado = await otorgarXpPorActividad(client, {
    aprendizId,
    fichaId,
    actividadId: actividad.id,
    calificacion,
    esNuevoAprobado,
  });

  const insigniasNuevas = aprobada
    ? await evaluarInsignias(client, { aprendizId, fichaId, calificacion })
    : [];
  // ─────────────────────────────────────────────────────────────────────────

  return {
    intento: intentoPublico(fila),
    modo: resultado.modo,
    aprobada,
    umbralAplicado: umbrales.aprobacion,
    detalle: resultado.detalle,
    oficial: {
      mejorCalificacion: parseFloat(oficial.mejor_calificacion),
      aprobada: oficial.aprobada,
      numeroIntentos: oficial.numero_intentos
    },
    progresoRecalculado: alcance,
    gamificacion: {
      xpGanado,
      insigniasNuevas,
    },
  };
}

/** Abre un intento nuevo o devuelve el que estuviera abierto. */
async function abrirIntento(client, { actividadId, aprendizId, registradoPor }) {
  // Bloqueo por par (aprendiz, actividad): no serializa toda la actividad del
  // usuario, solo la de esta actividad concreta.
  await client.query('SELECT pg_advisory_xact_lock($1::int, $2::int)', [aprendizId, actividadId]);

  const abierto = await client.query(
    `SELECT * FROM intentos_actividad
      WHERE actividad_id = $1 AND aprendiz_id = $2 AND estado = ANY($3)
      ORDER BY numero_intento DESC LIMIT 1`,
    [actividadId, aprendizId, ESTADOS_ABIERTOS]
  );
  if (abierto.rows.length) return { fila: abierto.rows[0], reanudado: true };

  const siguiente = await client.query(
    `SELECT COALESCE(MAX(numero_intento), 0) + 1 AS n
       FROM intentos_actividad WHERE actividad_id = $1 AND aprendiz_id = $2`,
    [actividadId, aprendizId]
  );

  const creado = await client.query(
    `INSERT INTO intentos_actividad
       (actividad_id, aprendiz_id, numero_intento, estado, fecha_inicio, registrado_por)
     VALUES ($1, $2, $3, 'en_curso', NOW(), $4)
     RETURNING *`,
    [actividadId, aprendizId, siguiente.rows[0].n, registradoPor]
  );
  return { fila: creado.rows[0], reanudado: false };
}

/** Carga un intento comprobando que quien pide puede operar sobre él. */
async function cargarIntento(client, intentoId, aprendizId) {
  const res = await client.query(
    `SELECT i.*, a.titulo, a.tipo::text AS tipo, a.datos_json, a.ficha_id
       FROM intentos_actividad i
       JOIN actividades a ON a.id = i.actividad_id
      WHERE i.id = $1 AND i.aprendiz_id = $2`,
    [intentoId, aprendizId]
  );
  return res.rows[0] || null;
}

// ══════════════════════════════════════════════════════════════════════
// POST /api/student/actividades/:actividadId/intentos
// Abre un intento, o devuelve el que quedó a medias (RF-24: reanudar).
// ══════════════════════════════════════════════════════════════════════
router.post('/api/student/actividades/:actividadId/intentos', verifyToken, async (req, res) => {
  const actividadId = Number(req.params.actividadId);
  if (!Number.isInteger(actividadId)) return res.status(400).json({ error: 'Actividad no válida' });

  const destino = await resolverDestinatario(req, Number(req.body?.aprendiz_id) || null);
  if (destino.error) return res.status(403).json({ error: destino.error });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const actividad = await cargarActividadDelAprendiz(client, actividadId, destino.aprendizId);
    if (!actividad) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Esta actividad no pertenece a la ficha del aprendiz' });
    }

    const bloqueo = await bloqueoAcademico(client, req, destino.aprendizId, actividadId);
    if (bloqueo) {
      await client.query('ROLLBACK');
      return res.status(bloqueo.estado).json(bloqueo.cuerpo);
    }

    const { fila, reanudado } = await abrirIntento(client, {
      actividadId, aprendizId: destino.aprendizId, registradoPor: req.user.id
    });

    await client.query('COMMIT');

    res.status(reanudado ? 200 : 201).json({
      reanudado,
      intento: intentoPublico(fila),
      actividad: {
        id: actividad.id,
        titulo: actividad.titulo,
        tipo: actividad.tipo,
        instrucciones: actividad.instrucciones,
        obligatoria: actividad.obligatoria,
        // El enunciado viaja sin la clave de corrección.
        datos_json: enunciadoSeguro(actividad.datos_json)
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error abriendo intento:', err);
    res.status(500).json({ error: 'No se pudo abrir el intento' });
  } finally {
    client.release();
  }
});

// ══════════════════════════════════════════════════════════════════════
// PATCH /api/student/intentos/:intentoId
// Guardado automático del avance parcial (RF-23).
// ══════════════════════════════════════════════════════════════════════
router.patch('/api/student/intentos/:intentoId', verifyToken, async (req, res) => {
  const intentoId = Number(req.params.intentoId);
  if (!Number.isInteger(intentoId)) return res.status(400).json({ error: 'Intento no válido' });

  const destino = await resolverDestinatario(req, Number(req.body?.aprendiz_id) || null);
  if (destino.error) return res.status(403).json({ error: destino.error });

  try {
    const actual = await cargarIntento(pool, intentoId, destino.aprendizId);
    if (!actual) return res.status(404).json({ error: 'Intento no encontrado' });
    if (!ESTADOS_ABIERTOS.includes(actual.estado)) {
      return res.status(409).json({ error: `El intento ya está ${actual.estado} y no admite cambios` });
    }

    const guardado = await pool.query(
      `UPDATE intentos_actividad
          SET respuestas_json = $2, estado = 'guardada', fecha_actualizacion = NOW()
        WHERE id = $1 RETURNING *`,
      [intentoId, req.body?.respuestas_json ? JSON.stringify(req.body.respuestas_json) : null]
    );

    res.json({ guardado: true, intento: intentoPublico(guardado.rows[0]) });
  } catch (err) {
    console.error('Error guardando avance del intento:', err);
    res.status(500).json({ error: 'No se pudo guardar el avance' });
  }
});

// ══════════════════════════════════════════════════════════════════════
// POST /api/student/intentos/:intentoId/enviar
// Califica en el servidor, cierra el intento y recalcula el progreso.
// ══════════════════════════════════════════════════════════════════════
router.post('/api/student/intentos/:intentoId/enviar', verifyToken, async (req, res) => {
  const intentoId = Number(req.params.intentoId);
  if (!Number.isInteger(intentoId)) return res.status(400).json({ error: 'Intento no válido' });

  const destino = await resolverDestinatario(req, Number(req.body?.aprendiz_id) || null);
  if (destino.error) return res.status(403).json({ error: destino.error });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const actual = await cargarIntento(client, intentoId, destino.aprendizId);
    if (!actual) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Intento no encontrado' });
    }
    if (!ESTADOS_ABIERTOS.includes(actual.estado)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `El intento ya está ${actual.estado}` });
    }

    await client.query('SELECT pg_advisory_xact_lock($1::int, $2::int)',
      [destino.aprendizId, actual.actividad_id]);

    const respuestas = req.body?.respuestas_json ?? actual.respuestas_json;
    const resultado = await cerrarIntento(client, {
      intento: actual,
      actividad: { id: actual.actividad_id, tipo: actual.tipo, datos_json: actual.datos_json },
      respuestas,
      aprendizId: destino.aprendizId,
      registradoPor: req.user.id
    });

    await client.query('COMMIT');
    res.json(resultado);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error enviando intento:', err);
    res.status(500).json({ error: 'No se pudo enviar el intento' });
  } finally {
    client.release();
  }
});

// ══════════════════════════════════════════════════════════════════════
// POST /api/student/activities/attempt
// Compatibilidad: abre y envía en una sola llamada, para actividades que se
// resuelven de una sentada. La calificación que envíe el cliente se ignora.
// ══════════════════════════════════════════════════════════════════════
router.post('/api/student/activities/attempt', verifyToken, async (req, res) => {
  const actividadId = Number(req.body?.actividad_id);
  if (!Number.isInteger(actividadId)) return res.status(400).json({ error: 'actividad_id es requerido' });

  const destino = await resolverDestinatario(req, Number(req.body?.aprendiz_id) || null);
  if (destino.error) return res.status(403).json({ error: destino.error });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const actividad = await cargarActividadDelAprendiz(client, actividadId, destino.aprendizId);
    if (!actividad) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Esta actividad no pertenece a la ficha del aprendiz' });
    }

    const bloqueo = await bloqueoAcademico(client, req, destino.aprendizId, actividadId);
    if (bloqueo) {
      await client.query('ROLLBACK');
      return res.status(bloqueo.estado).json(bloqueo.cuerpo);
    }

    const { fila } = await abrirIntento(client, {
      actividadId, aprendizId: destino.aprendizId, registradoPor: req.user.id
    });

    const resultado = await cerrarIntento(client, {
      intento: fila,
      actividad,
      respuestas: req.body?.respuestas_json ?? null,
      aprendizId: destino.aprendizId,
      registradoPor: req.user.id
    });

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      attemptId: resultado.intento.id,
      numeroIntento: resultado.intento.numeroIntento,
      ...resultado
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error registrando intento de actividad:', err);
    res.status(500).json({ error: 'Error en el servidor al guardar el intento de actividad' });
  } finally {
    client.release();
  }
});

export default router;
