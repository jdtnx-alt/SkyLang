import express from 'express';
import pool from '../../db.js';
import { verifyToken } from '../../middleware/auth.middleware.js';
import { puedeVerAlAprendiz, getFichaDelAprendiz } from '../../services/student.service.js';
import { recalcularRaps, recalcularModulos } from '../../services/progress.service.js';

const router = express.Router();

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Página «Mi progreso» del aprendiz.
 *
 * Todo lo que devuelve sale de datos reales:
 *   - el tiempo se mide con la duración de los intentos (desde que abre la
 *     actividad hasta que la envía); no incluye leer el material, porque eso
 *     hoy no se registra;
 *   - la evolución mensual se reconstruye con la fecha en que cada actividad
 *     obligatoria se aprobó por primera vez, ya que no se guardan instantáneas
 *     históricas del progreso;
 *   - la actividad reciente son intentos, RAP completados y RAP desbloqueados.
 *     No aparecen insignias porque todavía no se otorgan.
 */
router.get('/api/student/progreso', verifyToken, async (req, res) => {
  const studentId = Number(req.query.studentId);
  if (!Number.isInteger(studentId)) {
    return res.status(400).json({ error: 'studentId es requerido y debe ser numérico' });
  }

  try {
    if (!(await puedeVerAlAprendiz(req.user, studentId))) {
      return res.status(403).json({ error: 'No tienes permiso para consultar el progreso de este aprendiz' });
    }

    const ficha = await getFichaDelAprendiz(studentId);
    if (!ficha) {
      return res.json({
        resumen: { avanceGeneral: 0, modulosCompletados: 0, modulosTotales: 0, horasEstaSemana: 0, notaMedia: null },
        tiempoSemanal: DIAS.map((dia) => ({ dia, horas: 0 })),
        evolucion: [],
        raps: [],
        actividadReciente: [],
        sinFicha: true
      });
    }
    const { ficha_id: fichaId, programa_id: programaId } = ficha;

    // El progreso guardado es una caché que solo se refresca cuando el aprendiz
    // envía un intento. Si el instructor añadió o quitó actividades después, la
    // cifra almacenada se queda vieja y la pantalla mostraría dos números
    // distintos para lo mismo. Al abrir esta página se pone al día.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const rapsDelPrograma = await client.query('SELECT id FROM raps WHERE programa_id = $1', [programaId]);
      const rapIds = rapsDelPrograma.rows.map((r) => r.id);
      if (rapIds.length) {
        await recalcularRaps(client, studentId, rapIds);
        const modulos = await client.query(
          'SELECT DISTINCT modulo_id FROM modulo_rap WHERE rap_id = ANY($1::int[])', [rapIds]
        );
        if (modulos.rows.length) {
          await recalcularModulos(client, studentId, modulos.rows.map((m) => m.modulo_id));
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('No se pudo poner al día el progreso antes de mostrarlo:', e.message);
    } finally {
      client.release();
    }

    // ── Resumen ───────────────────────────────────────────────────────
    const rapsRes = await pool.query(
      `SELECT r.id, r.titulo, r.orden,
              COALESCE(pra.porcentaje, 0) AS porcentaje,
              COALESCE(pra.estado, 'bloqueado') AS estado,
              pra.nota_promedio
         FROM raps r
         LEFT JOIN progreso_rap_aprendiz pra ON pra.rap_id = r.id AND pra.aprendiz_id = $1
        WHERE r.programa_id = $2
        ORDER BY r.orden ASC`,
      [studentId, programaId]
    );

    const porcentajes = rapsRes.rows.map((r) => parseFloat(r.porcentaje));
    const avanceGeneral = porcentajes.length
      ? Math.round(porcentajes.reduce((a, b) => a + b, 0) / porcentajes.length)
      : 0;

    const modulosRes = await pool.query(
      `SELECT COUNT(m.id)::int AS totales,
              COUNT(m.id) FILTER (WHERE COALESCE(pma.porcentaje, 0) >= 100)::int AS completados
         FROM modulos m
         LEFT JOIN progreso_modulo_aprendiz pma ON pma.modulo_id = m.id AND pma.aprendiz_id = $1
        WHERE m.programa_id = $2`,
      [studentId, programaId]
    );

    const notaRes = await pool.query(
      `SELECT ROUND(AVG(mejor_calificacion))::int AS media
         FROM calificacion_oficial_actividad
        WHERE aprendiz_id = $1`,
      [studentId]
    );

    // ── Tiempo dedicado esta semana, por día ──────────────────────────
    const tiempoRes = await pool.query(
      `SELECT EXTRACT(ISODOW FROM fecha_fin)::int AS dia,
              COALESCE(SUM(duracion_segundos), 0)::int AS segundos
         FROM intentos_actividad
        WHERE aprendiz_id = $1
          AND fecha_fin >= date_trunc('week', NOW())
          AND fecha_fin <  date_trunc('week', NOW()) + INTERVAL '7 days'
        GROUP BY 1`,
      [studentId]
    );
    const porDia = Object.fromEntries(tiempoRes.rows.map((r) => [r.dia, r.segundos]));
    const tiempoSemanal = DIAS.map((dia, i) => ({
      dia,
      horas: Math.round(((porDia[i + 1] || 0) / 3600) * 100) / 100
    }));
    const horasEstaSemana = Math.round(tiempoSemanal.reduce((a, d) => a + d.horas, 0) * 10) / 10;

    // ── Evolución mensual, reconstruida desde los intentos ────────────
    // Para cada obligatoria se toma la fecha del PRIMER intento aprobado y se
    // recalcula el avance de cada RAP mes a mes.
    const obligatoriasRes = await pool.query(
      `SELECT DISTINCT rm.rap_id, a.id AS actividad_id
         FROM actividades a
         JOIN rap_momento_actividades rma ON rma.actividad_id = a.id
         JOIN rap_momentos rm ON rm.id = rma.rap_momento_id
         JOIN raps r ON r.id = rm.rap_id
        WHERE a.obligatoria = true AND a.ficha_id = $1 AND r.programa_id = $2`,
      [fichaId, programaId]
    );

    const aprobadasRes = await pool.query(
      `SELECT actividad_id, MIN(fecha_fin) AS aprobada_en
         FROM intentos_actividad
        WHERE aprendiz_id = $1 AND estado = 'aprobada' AND fecha_fin IS NOT NULL
        GROUP BY actividad_id`,
      [studentId]
    );
    const aprobadaEn = new Map(aprobadasRes.rows.map((r) => [r.actividad_id, new Date(r.aprobada_en)]));

    // Se parte de TODOS los RAP del programa, no solo de los que tienen
    // actividades: si no, un RAP vacío quedaba fuera del promedio y la curva
    // terminaba en un número distinto del avance general que muestra la tarjeta.
    const totalPorRap = new Map(rapsRes.rows.map((r) => [r.id, 0]));
    const actividadesPorRap = new Map(rapsRes.rows.map((r) => [r.id, []]));
    obligatoriasRes.rows.forEach((r) => {
      totalPorRap.set(r.rap_id, (totalPorRap.get(r.rap_id) || 0) + 1);
      actividadesPorRap.get(r.rap_id).push(r.actividad_id);
    });

    const fechas = [...aprobadaEn.values()].sort((a, b) => a - b);
    const evolucion = [];
    if (fechas.length) {
      const inicio = new Date(fechas[0].getFullYear(), fechas[0].getMonth(), 1);
      const hoy = new Date();
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

      for (let m = new Date(inicio); m <= fin; m.setMonth(m.getMonth() + 1)) {
        const corte = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59);
        const porRap = [...totalPorRap.entries()].map(([rapId, total]) => {
          const aprobadas = actividadesPorRap.get(rapId)
            .filter((actId) => aprobadaEn.has(actId) && aprobadaEn.get(actId) <= corte).length;
          return total ? (aprobadas / total) * 100 : 0;
        });
        const media = porRap.length ? porRap.reduce((a, b) => a + b, 0) / porRap.length : 0;
        evolucion.push({ mes: `${MESES[m.getMonth()]} ${String(m.getFullYear()).slice(2)}`, avance: Math.round(media) });
      }
    }

    // ── Actividad reciente ────────────────────────────────────────────
    const intentosRes = await pool.query(
      `SELECT a.titulo, i.calificacion, i.estado, i.fecha_fin
         FROM intentos_actividad i
         JOIN actividades a ON a.id = i.actividad_id
        WHERE i.aprendiz_id = $1 AND i.fecha_fin IS NOT NULL
        ORDER BY i.fecha_fin DESC LIMIT 10`,
      [studentId]
    );

    const hitosRes = await pool.query(
      `SELECT r.titulo, pra.fecha_completado, pra.desbloqueado_en, pra.estado
         FROM progreso_rap_aprendiz pra
         JOIN raps r ON r.id = pra.rap_id
        WHERE pra.aprendiz_id = $1 AND r.programa_id = $2
          AND (pra.fecha_completado IS NOT NULL OR pra.desbloqueado_en IS NOT NULL)`,
      [studentId, programaId]
    );

    const actividadReciente = [
      ...intentosRes.rows.map((i) => ({
        texto: i.estado === 'aprobada' ? `Aprobaste «${i.titulo}»` : `Intento en «${i.titulo}»`,
        nota: i.calificacion !== null ? Math.round(parseFloat(i.calificacion)) : null,
        fecha: i.fecha_fin,
        tipo: i.estado === 'aprobada' ? 'aprobada' : 'intento'
      })),
      ...hitosRes.rows.filter((h) => h.fecha_completado).map((h) => ({
        texto: `Completaste «${h.titulo}»`, nota: null, fecha: h.fecha_completado, tipo: 'rap_completado'
      })),
      ...hitosRes.rows.filter((h) => h.desbloqueado_en).map((h) => ({
        texto: `Se desbloqueó «${h.titulo}»`, nota: null, fecha: h.desbloqueado_en, tipo: 'rap_desbloqueado'
      }))
    ]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 8);

    res.json({
      resumen: {
        avanceGeneral,
        modulosCompletados: modulosRes.rows[0]?.completados || 0,
        modulosTotales: modulosRes.rows[0]?.totales || 0,
        horasEstaSemana,
        notaMedia: notaRes.rows[0]?.media ?? null
      },
      tiempoSemanal,
      evolucion,
      raps: rapsRes.rows.map((r) => ({
        id: r.id, titulo: r.titulo, orden: r.orden,
        porcentaje: Math.round(parseFloat(r.porcentaje)),
        estado: r.estado,
        notaPromedio: r.nota_promedio !== null ? Math.round(parseFloat(r.nota_promedio)) : null
      })),
      actividadReciente
    });
  } catch (err) {
    console.error('Error obteniendo el progreso del aprendiz:', err);
    res.status(500).json({ error: 'Error al obtener el progreso' });
  }
});

export default router;
