import express from 'express';
import pool from '../../db.js';
import { verifyToken } from '../../middleware/auth.middleware.js';
import { calculateLevelInfo, puedeVerAlAprendiz } from '../../services/student.service.js';

const router = express.Router();

// GET /api/student/dashboard
router.get('/api/student/dashboard', verifyToken, async (req, res) => {
  const studentId = Number(req.query.studentId);
  if (!Number.isInteger(studentId)) return res.status(400).json({ error: 'studentId es requerido y debe ser numérico' });

  try {
    if (!(await puedeVerAlAprendiz(req.user, studentId))) {
      return res.status(403).json({ error: 'No tienes permiso para consultar el progreso de este aprendiz' });
    }

    const studentRes = await pool.query(
      `SELECT u.id, u.nombre, u.correo,
              f.numero_ficha, f.id as ficha_id, f.programa_id,
              p.nombre as programa_nombre
       FROM usuarios u
       LEFT JOIN aprendiz_ficha af ON af.aprendiz_id = u.id
       LEFT JOIN fichas f ON f.id = af.ficha_id AND f.activo = true
       LEFT JOIN programas p ON p.id = f.programa_id
       WHERE u.id = $1
       ORDER BY af.fecha_registro DESC
       LIMIT 1`,
      [studentId]
    );

    if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Aprendiz no encontrado' });

    const studentInfo = studentRes.rows[0];
    const { ficha_id: fichaId, programa_id: programaId } = studentInfo;

    const pointsRes = await pool.query(
      `SELECT COALESCE(SUM(cantidad_puntos), 0) as total_puntos FROM registro_puntos WHERE aprendiz_id = $1`,
      [studentId]
    );
    const totalPoints = parseInt(pointsRes.rows[0]?.total_puntos || 0);
    const levelInfo = calculateLevelInfo(totalPoints);

    const modulesRes = await pool.query(
      `SELECT m.id, m.titulo, m.orden, COALESCE(fa.nombre, '') as fase,
              COALESCE(pma.porcentaje, 0) as progress,
              (COALESCE(pma.porcentaje, 0) >= 100) as completed
       FROM modulos m
       LEFT JOIN fases fa ON fa.id = m.fase_id
       LEFT JOIN progreso_modulo_aprendiz pma ON pma.modulo_id = m.id AND pma.aprendiz_id = $1
       WHERE m.programa_id = $2
       ORDER BY m.orden ASC`,
      [studentId, programaId || 0]
    );

    const recentModules = modulesRes.rows.map(m => ({
      id: m.id, title: m.titulo, order: m.orden, fase: m.fase,
      progress: parseFloat(m.progress || 0), completed: Boolean(m.completed)
    }));

    // El avance general se mide por RAP, igual que en la vista del instructor.
    // Antes se promediaban los módulos y cada pantalla daba una cifra distinta
    // para el mismo aprendiz.
    const overallProgressRes = await pool.query(
      `SELECT COALESCE(ROUND(AVG(pra.porcentaje)), 0) AS avance,
              COUNT(*)::int AS raps_totales,
              COUNT(*) FILTER (WHERE pra.porcentaje >= 100)::int AS raps_completados
         FROM progreso_rap_aprendiz pra
         JOIN raps r ON r.id = pra.rap_id
        WHERE pra.aprendiz_id = $1 AND r.programa_id = $2`,
      [studentId, programaId || 0]
    );
    const actividadRes = await pool.query(
      `SELECT COUNT(DISTINCT DATE(fecha_fin))::int AS dias_activos,
              MAX(fecha_fin) AS ultima
         FROM intentos_actividad
        WHERE aprendiz_id = $1 AND fecha_fin IS NOT NULL`,
      [studentId]
    );

    const resumen = overallProgressRes.rows[0] || {};
    const overallProgress = Math.round(parseFloat(resumen.avance || 0));

    // El RAP en curso es el primero accesible que aún no está completo, no el
    // primero del programa. Con el RAP 1 terminado, el panel seguía mandando ahí.
    const currentRapRes = await pool.query(
      `SELECT r.id, r.titulo, r.orden,
              COALESCE(pra.porcentaje, 0) AS progress,
              COALESCE(pra.estado, 'bloqueado') AS estado,
              mr.modulo_id, m.titulo AS modulo_titulo
         FROM raps r
         LEFT JOIN progreso_rap_aprendiz pra ON pra.rap_id = r.id AND pra.aprendiz_id = $1
         LEFT JOIN modulo_rap mr ON mr.rap_id = r.id
         LEFT JOIN modulos m ON m.id = mr.modulo_id
        WHERE r.programa_id = $2
          AND COALESCE(pra.porcentaje_maximo, 0) < 100
          AND COALESCE(pra.estado, 'disponible') <> 'bloqueado'
        ORDER BY r.orden ASC LIMIT 1`,
      [studentId, programaId || 0]
    );

    // Si no queda ninguno pendiente accesible, se muestra el último trabajado.
    const ultimoRes = currentRapRes.rows.length ? null : await pool.query(
      `SELECT r.id, r.titulo, r.orden,
              COALESCE(pra.porcentaje, 0) AS progress,
              COALESCE(pra.estado, 'disponible') AS estado,
              mr.modulo_id, m.titulo AS modulo_titulo
         FROM raps r
         JOIN progreso_rap_aprendiz pra ON pra.rap_id = r.id AND pra.aprendiz_id = $1
         LEFT JOIN modulo_rap mr ON mr.rap_id = r.id
         LEFT JOIN modulos m ON m.id = mr.modulo_id
        WHERE r.programa_id = $2
        ORDER BY r.orden DESC LIMIT 1`,
      [studentId, programaId || 0]
    );

    const activeRap = currentRapRes.rows[0] || ultimoRes?.rows[0] || null;
    const programaCompleto = !currentRapRes.rows.length &&
      parseInt(resumen.raps_completados || 0) > 0 &&
      parseInt(resumen.raps_completados || 0) === parseInt(resumen.raps_totales || 0);

    const subtitulo = programaCompleto
      ? 'Programa completado'
      : activeRap?.estado === 'excelencia' ? 'Completado con excelencia'
      : activeRap?.estado === 'completado' ? 'Completado'
      : activeRap?.estado === 'en_progreso' ? 'En progreso'
      : 'Por comenzar';

    res.json({
      student: studentInfo, levelInfo,
      progress: overallProgress, totalRewards: totalPoints,
      rapsTotales: parseInt(resumen.raps_totales || 0),
      rapsCompletados: parseInt(resumen.raps_completados || 0),
      programaCompleto,
      currentRap: {
        rapId:       activeRap?.id || null,
        rapTitle:    activeRap ? activeRap.titulo : 'Sin RAP asignado',
        rapSubtitle: subtitulo,
        moduleTitle: activeRap?.modulo_titulo || 'Sin módulo',
        progress:    activeRap ? parseFloat(activeRap.progress) : 0,
        moduleId:    activeRap?.modulo_id || null
      },
      recentModules,
      diasActivos: parseInt(actividadRes.rows[0]?.dias_activos || 0),
      ultimaActividad: actividadRes.rows[0]?.ultima || null
    });
  } catch (err) {
    console.error('Error fetching student dashboard:', err);
    res.status(500).json({ error: 'Server error loading student dashboard' });
  }
});

export default router;
