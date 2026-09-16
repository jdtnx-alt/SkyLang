/**
 * Cálculo del progreso académico.
 *
 * Decisión de arquitectura: EL PROGRESO SE MIDE POR RAP.
 *   - Avance del RAP  = actividades obligatorias aprobadas / obligatorias del RAP
 *   - Avance del módulo = promedio del avance de los RAP que lo componen
 *
 * Tres correcciones respecto a la versión anterior:
 *   1. Recalcula TODOS los RAP y módulos afectados por la actividad, no el
 *      primero que devolvía un LIMIT 1. Una actividad reutilizada en dos RAP
 *      dejaba el segundo desfasado para siempre.
 *   2. El avance es monótono: porcentaje_maximo y estado nunca descienden,
 *      aunque el instructor amplíe el temario (RN-08, RN-22, cap. 7.4).
 *   3. El umbral de aprobación sale de configuracion_programa, no de un 70
 *      cableado, y la aprobación se lee del booleano decidido al enviar el
 *      intento, no reinterpretando la nota con el umbral de hoy.
 */

import { desbloquearSiguientes } from './access.service.js';

const RANGO_ESTADO_RAP = "ARRAY['bloqueado','disponible','en_progreso','completado','excelencia']";
const RANGO_ESTADO_MODULO = "ARRAY['bloqueado','disponible','en_progreso','completado']";

/**
 * Umbrales institucionales aplicables a una actividad, vía su ficha y programa.
 * @returns {{ aprobacion: number, excelencia: number }}
 */
export async function umbralesDeActividad(client, actividadId) {
  const res = await client.query(
    `SELECT COALESCE(cp.porcentaje_aprobacion, 70) AS aprobacion,
            COALESCE(cp.porcentaje_excelencia, 90) AS excelencia
       FROM actividades a
       JOIN fichas f ON f.id = a.ficha_id
       LEFT JOIN configuracion_programa cp ON cp.programa_id = f.programa_id
      WHERE a.id = $1`,
    [actividadId]
  );
  if (!res.rows.length) return { aprobacion: 70, excelencia: 90 };
  return {
    aprobacion: parseFloat(res.rows[0].aprobacion),
    excelencia: parseFloat(res.rows[0].excelencia)
  };
}

/**
 * Recalcula el progreso del aprendiz en todos los RAP y módulos que dependen de
 * una actividad. Debe ejecutarse dentro de la transacción que registró el intento.
 *
 * @param {import('pg').PoolClient} client
 * @param {number} aprendizId
 * @param {number} actividadId
 * @returns {Promise<{ raps: number[], modulos: number[] }>}
 */
export async function recalcularProgresoAprendiz(client, aprendizId, actividadId) {
  // ── 1. RAP afectados ──────────────────────────────────────────────
  const rapsRes = await client.query(
    `SELECT DISTINCT rm.rap_id
       FROM rap_momento_actividades rma
       JOIN rap_momentos rm ON rm.id = rma.rap_momento_id
      WHERE rma.actividad_id = $1`,
    [actividadId]
  );
  const rapIds = rapsRes.rows.map((r) => r.rap_id);
  if (rapIds.length === 0) return { raps: [], modulos: [] };

  await recalcularRaps(client, aprendizId, rapIds);

  // ── 2. Módulos que agregan esos RAP ───────────────────────────────
  const modulosRes = await client.query(
    `SELECT DISTINCT modulo_id FROM modulo_rap WHERE rap_id = ANY($1::int[])`,
    [rapIds]
  );
  const moduloIds = modulosRes.rows.map((r) => r.modulo_id);
  if (moduloIds.length) await recalcularModulos(client, aprendizId, moduloIds);

  // ── 3. Desbloqueo del RAP siguiente (CU-08) ───────────────────────
  const desbloqueados = await desbloquearSiguientes(client, aprendizId, rapIds);

  return { raps: rapIds, modulos: moduloIds, desbloqueados };
}

/**
 * Avance de un conjunto de RAP para un aprendiz, en una sola sentencia.
 * El universo de actividades se limita a las fichas en las que el aprendiz está
 * matriculado dentro del programa del RAP: antes se resolvía con un LIMIT 1 que
 * podía elegir una ficha de otro programa.
 */
export async function recalcularRaps(client, aprendizId, rapIds) {
  await client.query(
    `
    WITH raps_afectados AS (
      SELECT r.id AS rap_id, r.programa_id
        FROM raps r
       WHERE r.id = ANY($2::int[])
    ),
    umbrales AS (
      SELECT ra.rap_id,
             COALESCE(cp.porcentaje_excelencia, 90) AS excelencia
        FROM raps_afectados ra
        LEFT JOIN configuracion_programa cp ON cp.programa_id = ra.programa_id
    ),
    obligatorias AS (
      SELECT ra.rap_id, a.id AS actividad_id
        FROM raps_afectados ra
        JOIN rap_momentos rm            ON rm.rap_id = ra.rap_id
        JOIN rap_momento_actividades rma ON rma.rap_momento_id = rm.id
        JOIN actividades a               ON a.id = rma.actividad_id
        JOIN aprendiz_ficha af           ON af.ficha_id = a.ficha_id AND af.aprendiz_id = $1
        JOIN fichas f                    ON f.id = af.ficha_id AND f.programa_id = ra.programa_id
       WHERE a.obligatoria = true
       GROUP BY ra.rap_id, a.id
    ),
    metricas AS (
      SELECT o.rap_id,
             COUNT(*)::int                                        AS totales,
             COUNT(*) FILTER (WHERE coa.aprobada)::int            AS completadas,
             ROUND(AVG(COALESCE(coa.mejor_calificacion, 0)), 2)   AS nota_promedio,
             BOOL_OR(coa.actividad_id IS NOT NULL)                AS hay_actividad
        FROM obligatorias o
        LEFT JOIN calificacion_oficial_actividad coa
               ON coa.actividad_id = o.actividad_id AND coa.aprendiz_id = $1
       GROUP BY o.rap_id
    ),
    calculo AS (
      SELECT ra.rap_id,
             COALESCE(m.totales, 0)     AS totales,
             COALESCE(m.completadas, 0) AS completadas,
             m.nota_promedio,
             CASE WHEN COALESCE(m.totales, 0) = 0 THEN 0
                  ELSE ROUND((m.completadas::numeric / m.totales) * 100, 2)
             END AS porcentaje,
             COALESCE(m.hay_actividad, false) AS hay_actividad,
             u.excelencia
        FROM raps_afectados ra
        LEFT JOIN metricas m  ON m.rap_id = ra.rap_id
        LEFT JOIN umbrales u  ON u.rap_id = ra.rap_id
    )
    INSERT INTO progreso_rap_aprendiz
      (rap_id, aprendiz_id, estado, porcentaje, porcentaje_maximo,
       actividades_completadas, actividades_totales, nota_promedio,
       fecha_inicio, fecha_completado, actualizado_en)
    SELECT c.rap_id, $1,
           CASE
             WHEN c.totales = 0                                     THEN 'disponible'
             WHEN c.completadas >= c.totales
                  AND COALESCE(c.nota_promedio, 0) >= c.excelencia  THEN 'excelencia'
             WHEN c.completadas >= c.totales                        THEN 'completado'
             WHEN c.completadas > 0 OR c.hay_actividad              THEN 'en_progreso'
             ELSE 'disponible'
           END,
           c.porcentaje, c.porcentaje,
           c.completadas, c.totales, c.nota_promedio,
           NOW(),
           CASE WHEN c.totales > 0 AND c.completadas >= c.totales THEN NOW() ELSE NULL END,
           NOW()
      FROM calculo c
    ON CONFLICT (rap_id, aprendiz_id) DO UPDATE SET
      porcentaje              = EXCLUDED.porcentaje,
      porcentaje_maximo       = GREATEST(progreso_rap_aprendiz.porcentaje_maximo, EXCLUDED.porcentaje),
      actividades_completadas = EXCLUDED.actividades_completadas,
      actividades_totales     = EXCLUDED.actividades_totales,
      nota_promedio           = EXCLUDED.nota_promedio,
      -- Un RAP bloqueado solo lo abre desbloquearSiguientes(); recalcular
      -- porcentajes nunca debe levantar el bloqueo. Por encima de ahí, el estado
      -- es monótono: no retrocede aunque el temario crezca.
      estado = CASE
        WHEN progreso_rap_aprendiz.estado = 'bloqueado' THEN 'bloqueado'
        WHEN array_position(${RANGO_ESTADO_RAP}, EXCLUDED.estado)
           > array_position(${RANGO_ESTADO_RAP}, progreso_rap_aprendiz.estado)
        THEN EXCLUDED.estado ELSE progreso_rap_aprendiz.estado END,
      fecha_inicio     = COALESCE(progreso_rap_aprendiz.fecha_inicio, EXCLUDED.fecha_inicio),
      fecha_completado = COALESCE(progreso_rap_aprendiz.fecha_completado, EXCLUDED.fecha_completado),
      actualizado_en   = NOW()
    `,
    [aprendizId, rapIds]
  );
}

/** Avance de los módulos como agregación de sus RAP. */
export async function recalcularModulos(client, aprendizId, moduloIds) {
  await client.query(
    `
    WITH metricas AS (
      SELECT mr.modulo_id,
             COUNT(*)::int                                                  AS raps_totales,
             COUNT(*) FILTER (WHERE COALESCE(p.porcentaje, 0) >= 100)::int  AS raps_completados,
             ROUND(AVG(COALESCE(p.porcentaje, 0)), 2)                       AS porcentaje,
             BOOL_OR(COALESCE(p.porcentaje, 0) > 0)                         AS iniciado
        FROM modulo_rap mr
        LEFT JOIN progreso_rap_aprendiz p
               ON p.rap_id = mr.rap_id AND p.aprendiz_id = $1
       WHERE mr.modulo_id = ANY($2::int[])
       GROUP BY mr.modulo_id
    )
    INSERT INTO progreso_modulo_aprendiz
      (modulo_id, aprendiz_id, estado, porcentaje, porcentaje_maximo,
       raps_completados, raps_totales, fecha_inicio, fecha_completado, actualizado_en)
    SELECT m.modulo_id, $1,
           CASE
             WHEN m.raps_totales = 0                    THEN 'disponible'
             WHEN m.raps_completados >= m.raps_totales  THEN 'completado'
             WHEN m.iniciado                            THEN 'en_progreso'
             ELSE 'disponible'
           END,
           m.porcentaje, m.porcentaje,
           m.raps_completados, m.raps_totales,
           NOW(),
           CASE WHEN m.raps_totales > 0 AND m.raps_completados >= m.raps_totales THEN NOW() ELSE NULL END,
           NOW()
      FROM metricas m
    ON CONFLICT (modulo_id, aprendiz_id) DO UPDATE SET
      porcentaje        = EXCLUDED.porcentaje,
      porcentaje_maximo = GREATEST(progreso_modulo_aprendiz.porcentaje_maximo, EXCLUDED.porcentaje),
      raps_completados  = EXCLUDED.raps_completados,
      raps_totales      = EXCLUDED.raps_totales,
      estado = CASE
        WHEN array_position(${RANGO_ESTADO_MODULO}, EXCLUDED.estado)
           > array_position(${RANGO_ESTADO_MODULO}, progreso_modulo_aprendiz.estado)
        THEN EXCLUDED.estado ELSE progreso_modulo_aprendiz.estado END,
      fecha_inicio     = COALESCE(progreso_modulo_aprendiz.fecha_inicio, EXCLUDED.fecha_inicio),
      fecha_completado = COALESCE(progreso_modulo_aprendiz.fecha_completado, EXCLUDED.fecha_completado),
      actualizado_en   = NOW()
    `,
    [aprendizId, moduloIds]
  );
}
