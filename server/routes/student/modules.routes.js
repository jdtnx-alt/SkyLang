import express from 'express';
import pool from '../../db.js';
import { verifyToken } from '../../middleware/auth.middleware.js';
import { getFichaDelAprendiz, puedeVerAlAprendiz } from '../../services/student.service.js';

const router = express.Router();

// GET /api/student/modules — modulos aislados por la ficha del aprendiz
router.get('/api/student/modules', verifyToken, async (req, res) => {
  const studentId = Number(req.query.studentId);
  if (!Number.isInteger(studentId)) return res.status(400).json({ error: 'studentId es requerido y debe ser numérico' });

  try {
    if (!(await puedeVerAlAprendiz(req.user, studentId))) {
      return res.status(403).json({ error: 'No tienes permiso para consultar el progreso de este aprendiz' });
    }

    const ficha = await getFichaDelAprendiz(studentId);
    if (!ficha) return res.json([]);

    const { ficha_id: fichaId, programa_id: programaId } = ficha;

    const modulesRes = await pool.query(
      `SELECT
         m.id, m.titulo AS title, m.orden AS "order",
         COALESCE(fa.nombre, '') AS fase,
         COALESCE(pma.porcentaje, 0) AS progress,
         (COALESCE(pma.porcentaje, 0) >= 100) AS completed,
         (
           SELECT JSON_AGG(
             JSON_BUILD_OBJECT(
               'id', r.id, 'titulo', r.titulo, 'orden', r.orden,
               'progreso', COALESCE(pra.porcentaje, 0),
               -- Sin fila de progreso se aplica la misma regla que el backend:
               -- solo el primer RAP del programa nace accesible.
               'estado', COALESCE(pra.estado, CASE WHEN r.orden = 1 THEN 'disponible' ELSE 'bloqueado' END),
               'actividadesTotal', (
                 SELECT COUNT(DISTINCT a.id)
                 FROM actividades a
                 JOIN rap_momento_actividades rma2 ON rma2.actividad_id = a.id
                 JOIN rap_momentos rm2 ON rm2.id = rma2.rap_momento_id
                 WHERE rm2.rap_id = r.id AND a.ficha_id = $1 AND a.obligatoria = true
               ),
               'actividadesCompletadas', (
                 SELECT COUNT(DISTINCT coa.actividad_id)
                 FROM calificacion_oficial_actividad coa
                 JOIN actividades a ON a.id = coa.actividad_id
                 JOIN rap_momento_actividades rma2 ON rma2.actividad_id = a.id
                 JOIN rap_momentos rm2 ON rm2.id = rma2.rap_momento_id
                 WHERE rm2.rap_id = r.id AND coa.aprendiz_id = $2
                   AND a.ficha_id = $1 AND a.obligatoria = true
                   AND coa.aprobada = true
               )
             ) ORDER BY r.orden ASC
           )
           FROM modulo_rap mr2
           JOIN raps r ON r.id = mr2.rap_id
           LEFT JOIN progreso_rap_aprendiz pra ON pra.rap_id = r.id AND pra.aprendiz_id = $2
           WHERE mr2.modulo_id = m.id
         ) AS raps
       FROM modulos m
       LEFT JOIN fases fa ON fa.id = m.fase_id
       LEFT JOIN progreso_modulo_aprendiz pma ON pma.modulo_id = m.id AND pma.aprendiz_id = $2
       WHERE m.programa_id = $3
       ORDER BY m.orden ASC`,
      [fichaId, studentId, programaId]
    );

    const colorPalette = [
      'from-blue-500 to-indigo-600', 'from-purple-500 to-purple-700',
      'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-600'
    ];

    const modules = modulesRes.rows.map((m, idx) => {
      const raps = m.raps || [];
      // El módulo se abre en cuanto alguno de sus RAP está accesible. El bloqueo
      // real vive en el estado del RAP, no en la posición del módulo en el array
      // como hacía la versión anterior.
      const rapsAccesibles = raps.filter((r) => r.estado !== 'bloqueado');
      return {
        id: m.id, title: m.title, order: m.order, fase: m.fase,
        fichaId, programaId,
        raps,
        progress: parseFloat(m.progress || 0),
        completed: Boolean(m.completed),
        locked: raps.length > 0 && rapsAccesibles.length === 0,
        color: colorPalette[idx % colorPalette.length]
      };
    });

    res.json(modules);
  } catch (err) {
    console.error('Error fetching student modules:', err);
    res.status(500).json({ error: 'Server error loading modules' });
  }
});

export default router;
