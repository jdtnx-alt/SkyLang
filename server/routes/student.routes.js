import express from 'express';
import pool from '../db.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { recalcularProgresoAprendiz } from '../services/progress.service.js';

const router = express.Router();

// Helper para calcular nivel según los puntos acumulados
function calculateLevelInfo(totalPoints) {
  const basePointsPerLevel = 1000;
  const level = Math.floor(totalPoints / basePointsPerLevel) + 1;
  const pointsInCurrentLevel = totalPoints % basePointsPerLevel;
  const nextLevelPoints = level * basePointsPerLevel;

  return {
    level,
    points: totalPoints,
    nextLevelPoints,
    progressPercentage: Math.round((pointsInCurrentLevel / basePointsPerLevel) * 100)
  };
}

// Helper: obtener ficha activa del aprendiz (la primera activa si tiene varias)
async function getFichaDelAprendiz(aprendizId) {
  const res = await pool.query(
    `SELECT af.ficha_id, f.programa_id, f.numero_ficha
     FROM aprendiz_ficha af
     JOIN fichas f ON f.id = af.ficha_id
     WHERE af.aprendiz_id = $1 AND f.activo = true
     ORDER BY af.fecha_registro DESC
     LIMIT 1`,
    [aprendizId]
  );
  return res.rows[0] || null;
}

// GET /api/student/dashboard — Métricas y resumen principal del Aprendiz
router.get('/api/student/dashboard', async (req, res) => {
  const { studentId } = req.query;
  if (!studentId) {
    return res.status(400).json({ error: 'studentId es requerido' });
  }

  try {
    // Datos del aprendiz con su ficha activa
    const studentRes = await pool.query(
      `SELECT u.id, u.nombre, u.correo, f.numero_ficha, f.id as ficha_id, f.programa_id, p.nombre as programa_nombre
       FROM usuarios u
       LEFT JOIN aprendiz_ficha af ON af.aprendiz_id = u.id
       LEFT JOIN fichas f ON f.id = af.ficha_id AND f.activo = true
       LEFT JOIN programas p ON p.id = f.programa_id
       WHERE u.id = $1
       ORDER BY af.fecha_registro DESC
       LIMIT 1`,
      [studentId]
    );

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Aprendiz no encontrado' });
    }
    const studentInfo = studentRes.rows[0];
    const fichaId = studentInfo.ficha_id;
    const programaId = studentInfo.programa_id;

    // Obtener puntos acumulados del aprendiz
    const pointsRes = await pool.query(
      `SELECT COALESCE(SUM(cantidad_puntos), 0) as total_puntos FROM registro_puntos WHERE aprendiz_id = $1`,
      [studentId]
    );
    const totalPoints = parseInt(pointsRes.rows[0]?.total_puntos || 0);
    const levelInfo = calculateLevelInfo(totalPoints);

    // Módulos del programa de la ficha del aprendiz — AISLADOS POR FICHA/PROGRAMA
    const modulesRes = await pool.query(
      `SELECT m.id, m.titulo, m.orden, COALESCE(fa.nombre, '') as fase,
              COALESCE(pma.porcentaje, 0) as progress,
              (COALESCE(pma.porcentaje, 0) >= 100) as completed
       FROM modulos m
       LEFT JOIN fases fa ON fa.id = m.fase_id
       LEFT JOIN progreso_modulo_aprendiz pma ON pma.modulo_id = m.id AND pma.aprendiz_id = $1
       WHERE m.programa_id = $2
       ORDER BY m.orden ASC
       LIMIT 5`,
      [studentId, programaId || 0]
    );

    const recentModules = modulesRes.rows.map((m) => ({
      id: m.id,
      title: m.titulo,
      order: m.orden,
      fase: m.fase,
      progress: parseFloat(m.progress || 0),
      completed: Boolean(m.completed)
    }));

    // Progreso general = promedio de módulos del programa de esta ficha
    const overallProgressRes = await pool.query(
      `SELECT COALESCE(AVG(pma.porcentaje), 0) as overall_progress
       FROM progreso_modulo_aprendiz pma
       JOIN modulos m ON m.id = pma.modulo_id
       WHERE pma.aprendiz_id = $1 AND m.programa_id = $2`,
      [studentId, programaId || 0]
    );
    const overallProgress = Math.round(parseFloat(overallProgressRes.rows[0]?.overall_progress || 0));

    // RAP Actual — solo RAPs del programa de la ficha del aprendiz
    const currentRapRes = await pool.query(
      `SELECT r.id, r.titulo, COALESCE(pra.porcentaje, 0) as progress, pra.estado
       FROM raps r
       LEFT JOIN progreso_rap_aprendiz pra ON pra.rap_id = r.id AND pra.aprendiz_id = $1
       WHERE r.programa_id = $2
       ORDER BY r.orden ASC
       LIMIT 1`,
      [studentId, programaId || 0]
    );
    const activeRap = currentRapRes.rows[0];

    res.json({
      student: studentInfo,
      levelInfo,
      progress: overallProgress,
      totalRewards: totalPoints,
      currentRap: {
        rapTitle: activeRap ? activeRap.titulo : 'RAP 1',
        rapSubtitle: activeRap && activeRap.estado === 'completado' ? 'Completado' : 'En progreso',
        moduleTitle: recentModules[0]?.title || 'Módulo 1',
        progress: activeRap ? parseFloat(activeRap.progress) : 0,
        moduleId: recentModules[0]?.id || 1
      },
      recentModules,
      recentAchievements: [
        { title: 'Estudiante Activo', date: 'Hoy', icon: '🔥' }
      ],
      lastActivityText: 'Hoy'
    });
  } catch (err) {
    console.error('Error fetching student dashboard:', err);
    res.status(500).json({ error: 'Server error loading student dashboard' });
  }
});

// GET /api/student/modules — Módulos del Aprendiz AISLADOS por su Ficha/Programa
router.get('/api/student/modules', async (req, res) => {
  const { studentId } = req.query;
  if (!studentId) {
    return res.status(400).json({ error: 'studentId es requerido' });
  }

  try {
    // 1. Obtener ficha activa del aprendiz para saber su programa
    const ficha = await getFichaDelAprendiz(studentId);

    if (!ficha) {
      // Sin ficha asignada: devolver lista vacía — no debe ver módulos de otro programa
      return res.json([]);
    }

    const { ficha_id: fichaId, programa_id: programaId } = ficha;

    // 2. Módulos del programa — filtrados por programa_id de la ficha del aprendiz
    const modulesRes = await pool.query(
      `SELECT m.id, m.titulo as title, m.orden as order, COALESCE(fa.nombre, '') as fase,
              COALESCE(pma.porcentaje, 0) as progress,
              (COALESCE(pma.porcentaje, 0) >= 100) as completed,
              (
                SELECT JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', r.id,
                    'titulo', r.titulo,
                    'orden', r.orden,
                    'progreso', COALESCE(pra.porcentaje, 0),
                    'estado', COALESCE(pra.estado, 'disponible'),
                    'actividadesTotal', (
                      SELECT COUNT(DISTINCT a.id)
                      FROM actividades a
                      JOIN rap_momento_actividades rma ON rma.actividad_id = a.id
                      JOIN rap_momentos rm ON rm.id = rma.rap_momento_id
                      WHERE rm.rap_id = r.id AND a.ficha_id = $1 AND a.obligatoria = true
                    ),
                    'actividadesCompletadas', (
                      SELECT COUNT(DISTINCT coa.actividad_id)
                      FROM calificacion_oficial_actividad coa
                      JOIN actividades a ON a.id = coa.actividad_id
                      JOIN rap_momento_actividades rma ON rma.actividad_id = a.id
                      JOIN rap_momentos rm ON rm.id = rma.rap_momento_id
                      WHERE rm.rap_id = r.id AND coa.aprendiz_id = $2
                        AND a.ficha_id = $1 AND a.obligatoria = true
                        AND coa.mejor_calificacion >= 70
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
      'from-blue-500 to-indigo-600',
      'from-purple-500 to-purple-700',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600'
    ];

    const modules = modulesRes.rows.map((m, idx) => ({
      id: m.id,
      title: m.title,
      order: m.order,
      fase: m.fase,
      fichaId: fichaId,          // <- incluir ficha para el frontend
      programaId: programaId,    // <- incluir programa para el frontend
      raps: m.raps || [],
      progress: parseFloat(m.progress || 0),
      completed: Boolean(m.completed),
      locked: idx > 0 && parseFloat(modulesRes.rows[idx - 1]?.progress || 0) < 100,
      color: colorPalette[idx % colorPalette.length]
    }));

    res.json(modules);
  } catch (err) {
    console.error('Error fetching student modules:', err);
    res.status(500).json({ error: 'Server error loading modules' });
  }
});

// GET /api/student/rap/:rapId/actividades — Actividades de un RAP AISLADAS por Ficha del Aprendiz
router.get('/api/student/rap/:rapId/actividades', verifyToken, async (req, res) => {
  const { rapId } = req.params;
  const aprendizId = req.user.id;

  try {
    // Obtener ficha activa del aprendiz
    const ficha = await getFichaDelAprendiz(aprendizId);
    if (!ficha) {
      return res.status(403).json({ error: 'El aprendiz no tiene ficha activa asignada' });
    }
    const fichaId = ficha.ficha_id;

    // Actividades del RAP — SOLO las de la ficha del aprendiz
    const actividadesRes = await pool.query(
      `SELECT
         a.id, a.titulo, a.tipo, a.instrucciones, a.datos_json, a.obligatoria,
         rm.orden as momento_orden, m.nombre as momento_nombre,
         COALESCE(coa.mejor_calificacion, 0) as mejor_calificacion,
         COALESCE(coa.estado, 'pendiente') as estado,
         (SELECT COUNT(*) FROM intentos_actividad ia WHERE ia.actividad_id = a.id AND ia.aprendiz_id = $1) as num_intentos
       FROM actividades a
       JOIN rap_momento_actividades rma ON rma.actividad_id = a.id
       JOIN rap_momentos rm ON rm.id = rma.rap_momento_id
       JOIN momentos m ON m.id = rm.momento_id
       LEFT JOIN calificacion_oficial_actividad coa ON coa.actividad_id = a.id AND coa.aprendiz_id = $1
       WHERE rm.rap_id = $2
         AND a.ficha_id = $3
       ORDER BY rm.orden ASC, rma.orden ASC`,
      [aprendizId, rapId, fichaId]
    );

    res.json({
      rapId: parseInt(rapId),
      fichaId,
      actividades: actividadesRes.rows
    });
  } catch (err) {
    console.error('Error fetching RAP actividades:', err);
    res.status(500).json({ error: 'Error al obtener actividades del RAP' });
  }
});

// POST /api/student/activities/attempt — Registrar intento de actividad del Aprendiz
router.post('/api/student/activities/attempt', verifyToken, async (req, res) => {
  const { actividad_id, aprendiz_id, calificacion, respuestas_json } = req.body;
  const userRole = (req.user?.rol || '').toLowerCase();
  let targetStudentId;

  if (userRole === 'aprendiz') {
    // rol 'aprendiz' -> ignorar aprendiz_id del body, usar siempre req.user.id
    targetStudentId = req.user.id;
  } else if (userRole === 'instructor') {
    // rol 'instructor' -> validar que aprendiz_id pertenezca a una ficha asignada a ese instructor
    targetStudentId = aprendiz_id || req.user.id;
    const checkFicha = await pool.query(
      `SELECT 1 FROM aprendiz_ficha af
       JOIN instructor_ficha ifi ON ifi.ficha_id = af.ficha_id
       WHERE af.aprendiz_id = $1 AND ifi.instructor_id = $2`,
      [targetStudentId, req.user.id]
    );
    if (checkFicha.rows.length === 0) {
      return res.status(403).json({ error: 'Acceso denegado: El aprendiz no pertenece a ninguna ficha asignada a este instructor' });
    }
  } else if (userRole === 'admin' || userRole === 'administrador') {
    // rol 'admin' -> permitir cualquier aprendiz_id sin restricción de ficha
    targetStudentId = aprendiz_id || req.user.id;
  } else {
    return res.status(403).json({ error: 'Acceso prohibido: Rol no reconocido' });
  }

  if (!actividad_id) {
    return res.status(400).json({ error: 'actividad_id es requerido' });
  }

  // Verificar que la actividad pertenece a la ficha del aprendiz (aislamiento)
  const fichaCheck = await pool.query(
    `SELECT 1 FROM actividades a
     JOIN aprendiz_ficha af ON af.ficha_id = a.ficha_id
     WHERE a.id = $1 AND af.aprendiz_id = $2`,
    [actividad_id, targetStudentId]
  );
  if (fichaCheck.rows.length === 0) {
    return res.status(403).json({ error: 'Acceso denegado: Esta actividad no pertenece a la ficha del aprendiz' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Bloqueo de concurrencia para serializar peticiones simultáneas del mismo aprendiz
    await client.query('SELECT id FROM usuarios WHERE id = $1 FOR UPDATE', [targetStudentId]);

    // Obtener número de intento actual de forma segura
    const lastIntentoRes = await client.query(
      `SELECT COALESCE(MAX(numero_intento), 0) as max_intento
       FROM intentos_actividad
       WHERE actividad_id = $1 AND aprendiz_id = $2`,
      [actividad_id, targetStudentId]
    );
    const nextIntento = parseInt(lastIntentoRes.rows[0].max_intento) + 1;
    const estadoIntento = Number(calificacion) >= 70 ? 'aprobada' : 'reprobada';

    // Insertar intento en intentos_actividad
    const insertAttemptRes = await client.query(
      `INSERT INTO intentos_actividad (actividad_id, aprendiz_id, numero_intento, estado, respuestas_json, calificacion, fecha_fin)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id`,
      [actividad_id, targetStudentId, nextIntento, estadoIntento, respuestas_json ? JSON.stringify(respuestas_json) : null, calificacion]
    );
    const attemptId = insertAttemptRes.rows[0].id;

    // Actualizar calificacion_oficial_actividad (mejor calificación)
    await client.query(
      `INSERT INTO calificacion_oficial_actividad (actividad_id, aprendiz_id, mejor_calificacion, intento_id, estado, fecha_actualizacion)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (actividad_id, aprendiz_id) DO UPDATE SET
         mejor_calificacion = GREATEST(calificacion_oficial_actividad.mejor_calificacion, EXCLUDED.mejor_calificacion),
         intento_id = EXCLUDED.intento_id,
         estado = CASE WHEN EXCLUDED.mejor_calificacion >= 70 THEN 'aprobada' ELSE calificacion_oficial_actividad.estado END,
         fecha_actualizacion = NOW()`,
      [actividad_id, targetStudentId, calificacion, attemptId, estadoIntento]
    );

    // Recalcular el progreso dentro de la misma transacción
    await recalcularProgresoAprendiz(client, targetStudentId, actividad_id);

    await client.query('COMMIT');
    res.status(201).json({ success: true, attemptId, numeroIntento: nextIntento });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error registrando intento de actividad:', err);
    res.status(500).json({ error: 'Error en el servidor al guardar el intento de actividad' });
  } finally {
    client.release();
  }
});

export default router;


// Helper para calcular nivel según los puntos acumulados
function calculateLevelInfo(totalPoints) {
  const basePointsPerLevel = 1000;
  const level = Math.floor(totalPoints / basePointsPerLevel) + 1;
  const pointsInCurrentLevel = totalPoints % basePointsPerLevel;
  const nextLevelPoints = level * basePointsPerLevel;

  return {
    level,
    points: totalPoints,
    nextLevelPoints,
    progressPercentage: Math.round((pointsInCurrentLevel / basePointsPerLevel) * 100)
  };
}

// GET /api/student/dashboard — Métricas y resumen principal del Aprendiz
router.get('/api/student/dashboard', async (req, res) => {
  const { studentId } = req.query;
  if (!studentId) {
    return res.status(400).json({ error: 'studentId es requerido' });
  }

  try {
    const studentRes = await pool.query(
      `SELECT u.id, u.nombre, u.correo, f.numero_ficha, f.id as ficha_id, f.programa_id, p.nombre as programa_nombre
       FROM usuarios u
       LEFT JOIN aprendiz_ficha af ON af.aprendiz_id = u.id
       LEFT JOIN fichas f ON f.id = af.ficha_id
       LEFT JOIN programas p ON p.id = f.programa_id
       WHERE u.id = $1`,
      [studentId]
    );

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Aprendiz no encontrado' });
    }
    const studentInfo = studentRes.rows[0];

    // Obtener puntos y racha
    const pointsRes = await pool.query(
      `SELECT COALESCE(SUM(cantidad_puntos), 0) as total_puntos FROM registro_puntos WHERE aprendiz_id = $1`,
      [studentId]
    );
    const totalPoints = parseInt(pointsRes.rows[0]?.total_puntos || 0);
    const levelInfo = calculateLevelInfo(totalPoints);

    // Módulos recientes con progreso real desde BD
    const modulesRes = await pool.query(
      `SELECT m.id, m.titulo, m.orden, COALESCE(f.nombre, '') as fase,
              COALESCE(pma.porcentaje, 0) as progress,
              (COALESCE(pma.porcentaje, 0) >= 100) as completed
       FROM modulos m
       LEFT JOIN fases f ON f.id = m.fase_id
       LEFT JOIN progreso_modulo_aprendiz pma ON pma.modulo_id = m.id AND pma.aprendiz_id = $1
       ORDER BY m.orden ASC LIMIT 5`,
      [studentId]
    );

    const recentModules = modulesRes.rows.map((m) => ({
      id: m.id,
      title: m.titulo,
      order: m.orden,
      fase: m.fase,
      progress: parseFloat(m.progress || 0),
      completed: Boolean(m.completed)
    }));

    // Calcular progreso general del programa como promedio de módulos
    const overallProgressRes = await pool.query(
      `SELECT COALESCE(AVG(porcentaje), 0) as overall_progress
       FROM progreso_modulo_aprendiz
       WHERE aprendiz_id = $1`,
      [studentId]
    );
    const overallProgress = Math.round(parseFloat(overallProgressRes.rows[0]?.overall_progress || 0));

    // RAP Actual
    const currentRapRes = await pool.query(
      `SELECT r.id, r.titulo, COALESCE(pra.porcentaje, 0) as progress, pra.estado
       FROM raps r
       LEFT JOIN progreso_rap_aprendiz pra ON pra.rap_id = r.id AND pra.aprendiz_id = $1
       ORDER BY r.orden ASC LIMIT 1`,
      [studentId]
    );
    const activeRap = currentRapRes.rows[0];

    res.json({
      student: studentInfo,
      levelInfo,
      progress: overallProgress,
      totalRewards: totalPoints,
      currentRap: {
        rapTitle: activeRap ? activeRap.titulo : 'RAP 1',
        rapSubtitle: activeRap && activeRap.estado === 'completado' ? 'Completado' : 'En progreso',
        moduleTitle: recentModules[0]?.title || 'Módulo 1',
        progress: activeRap ? parseFloat(activeRap.progress) : 0,
        moduleId: recentModules[0]?.id || 1
      },
      recentModules,
      recentAchievements: [
        { title: 'Estudiante Activo', date: 'Hoy', icon: '🔥' }
      ],
      lastActivityText: 'Hoy'
    });
  } catch (err) {
    console.error('Error fetching student dashboard:', err);
    res.status(500).json({ error: 'Server error loading student dashboard' });
  }
});

// GET /api/student/modules — Listado básico de módulos para el Aprendiz
router.get('/api/student/modules', async (req, res) => {
  const { studentId } = req.query;
  try {
    const modulesRes = await pool.query(
      `SELECT m.id, m.titulo as title, m.orden as order, COALESCE(f.nombre, '') as fase,
              COALESCE(pma.porcentaje, 0) as progress,
              (COALESCE(pma.porcentaje, 0) >= 100) as completed
       FROM modulos m
       LEFT JOIN fases f ON f.id = m.fase_id
       LEFT JOIN progreso_modulo_aprendiz pma ON pma.modulo_id = m.id AND pma.aprendiz_id = $1
       ORDER BY m.orden ASC`,
      [studentId || null]
    );

    const colorPalette = [
      'from-blue-500 to-indigo-600',
      'from-purple-500 to-purple-700',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600'
    ];

    const modules = modulesRes.rows.map((m, idx) => ({
      id: m.id,
      title: m.title,
      order: m.order,
      fase: m.fase,
      raps: [],
      progress: parseFloat(m.progress || 0),
      completed: Boolean(m.completed),
      locked: idx > 0 && parseFloat(modulesRes.rows[idx - 1]?.progress || 0) < 100,
      color: colorPalette[idx % colorPalette.length]
    }));

    res.json(modules);
  } catch (err) {
    console.error('Error fetching student modules:', err);
    res.status(500).json({ error: 'Server error loading modules' });
  }
});

// POST /api/student/activities/attempt — Registrar intento de actividad del Aprendiz
router.post('/api/student/activities/attempt', verifyToken, async (req, res) => {
  const { actividad_id, aprendiz_id, calificacion, respuestas_json } = req.body;
  const userRole = (req.user?.rol || '').toLowerCase();
  let targetStudentId;

  if (userRole === 'aprendiz') {
    // rol 'aprendiz' -> ignorar aprendiz_id del body, usar siempre req.user.id
    targetStudentId = req.user.id;
  } else if (userRole === 'instructor') {
    // rol 'instructor' -> validar que aprendiz_id pertenezca a una ficha asignada a ese instructor vía instructor_ficha; si no, rechazar 403
    targetStudentId = aprendiz_id || req.user.id;
    const checkFicha = await pool.query(
      `SELECT 1 FROM aprendiz_ficha af
       JOIN instructor_ficha ifi ON ifi.ficha_id = af.ficha_id
       WHERE af.aprendiz_id = $1 AND ifi.instructor_id = $2`,
      [targetStudentId, req.user.id]
    );
    if (checkFicha.rows.length === 0) {
      return res.status(403).json({ error: 'Acceso denegado: El aprendiz no pertenece a ninguna ficha asignada a este instructor' });
    }
  } else if (userRole === 'admin' || userRole === 'administrador') {
    // rol 'admin' -> permitir cualquier aprendiz_id sin restricción de ficha
    targetStudentId = aprendiz_id || req.user.id;
  } else {
    // cualquier otro caso (rol ausente o no reconocido) -> rechazar 403
    return res.status(403).json({ error: 'Acceso prohibido: Rol no reconocido' });
  }

  if (!actividad_id) {
    return res.status(400).json({ error: 'actividad_id es requerido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Bloqueo de concurrencia a nivel de usuario para serializar peticiones simultáneas del mismo aprendiz
    await client.query('SELECT id FROM usuarios WHERE id = $1 FOR UPDATE', [targetStudentId]);

    // Obtener número de intento actual de forma segura
    const lastIntentoRes = await client.query(
      `SELECT COALESCE(MAX(numero_intento), 0) as max_intento
       FROM intentos_actividad
       WHERE actividad_id = $1 AND aprendiz_id = $2`,
      [actividad_id, targetStudentId]
    );
    const nextIntento = parseInt(lastIntentoRes.rows[0].max_intento) + 1;
    const estadoIntento = Number(calificacion) >= 70 ? 'aprobada' : 'reprobada';

    // Insertar intento en intentos_actividad (tabla activa)
    const insertAttemptRes = await client.query(
      `INSERT INTO intentos_actividad (actividad_id, aprendiz_id, numero_intento, estado, respuestas_json, calificacion, fecha_fin)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id`,
      [actividad_id, targetStudentId, nextIntento, estadoIntento, respuestas_json ? JSON.stringify(respuestas_json) : null, calificacion]
    );
    const attemptId = insertAttemptRes.rows[0].id;

    // Actualizar calificacion_oficial_actividad (mejor calificación)
    await client.query(
      `INSERT INTO calificacion_oficial_actividad (actividad_id, aprendiz_id, mejor_calificacion, intento_id, estado, fecha_actualizacion)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (actividad_id, aprendiz_id) DO UPDATE SET
         mejor_calificacion = GREATEST(calificacion_oficial_actividad.mejor_calificacion, EXCLUDED.mejor_calificacion),
         intento_id = EXCLUDED.intento_id,
         estado = CASE WHEN EXCLUDED.mejor_calificacion >= 70 THEN 'aprobada' ELSE calificacion_oficial_actividad.estado END,
         fecha_actualizacion = NOW()`,
      [actividad_id, targetStudentId, calificacion, attemptId, estadoIntento]
    );

    // Recalcular el progreso dinámicamente dentro de la misma transacción
    await recalcularProgresoAprendiz(client, targetStudentId, actividad_id);

    await client.query('COMMIT');
    res.status(201).json({ success: true, attemptId, numeroIntento: nextIntento });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error registrando intento de actividad:', err);
    res.status(500).json({ error: 'Error en el servidor al guardar el intento de actividad' });
  } finally {
    client.release();
  }
});

export default router;
