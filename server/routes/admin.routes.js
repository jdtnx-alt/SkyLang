import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { replaceModuleRapLinks } from '../services/seed.service.js';
import { verifyToken, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// Aplicar autenticación y verificación de rol admin a las rutas de administración
router.use('/api/admin', verifyToken, requireRole('admin', 'administrador'));

// Helper para reasignación al eliminar usuario
async function getReplacementUserId(client, deletedUserId) {
  const result = await client.query(
    `SELECT id
     FROM usuarios
     WHERE id <> $1
     ORDER BY
       CASE rol::text
         WHEN 'admin' THEN 1
         WHEN 'administrador' THEN 1
         WHEN 'instructor' THEN 2
         ELSE 3
       END,
       id ASC
     LIMIT 1`,
    [deletedUserId]
  );
  return result.rows.length ? result.rows[0].id : null;
}

// ── Estado de Base de Datos & Dashboard Admin ──────────────────────────────
router.get('/api/db-status', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, status: 'Connected (PostgreSQL)' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/api/admin/dashboard', async (req, res) => {
  try {
    const usersRes = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN rol::text = 'aprendiz' THEN 1 END) as students,
        COUNT(CASE WHEN rol::text = 'instructor' THEN 1 END) as instructors,
        COUNT(CASE WHEN rol::text IN ('admin', 'administrador') THEN 1 END) as admins,
        COUNT(CASE WHEN rol::text = 'aprendiz' AND activo = true THEN 1 END) as active_students
      FROM usuarios
    `);

    const rapsRes = await pool.query(`SELECT COUNT(*) as total_raps FROM raps`);
    const modulesRes = await pool.query(`SELECT COUNT(*) as total_modules FROM modulos`);

    const totalUsers = parseInt(usersRes.rows[0].total_users) || 0;
    const students = parseInt(usersRes.rows[0].students) || 0;
    const instructors = parseInt(usersRes.rows[0].instructors) || 0;
    const admins = parseInt(usersRes.rows[0].admins) || 0;
    const activeStudents = parseInt(usersRes.rows[0].active_students) || 0;
    const activeRate = students > 0 ? Math.round((activeStudents / students) * 100) : 100;

    const totalRaps = parseInt(rapsRes.rows[0].total_raps) || 0;
    const totalModules = parseInt(modulesRes.rows[0].total_modules) || 0;

    // Datos de crecimiento mensual
    const monthsRes = await pool.query(`
      SELECT TO_CHAR(fecha_creacion, 'Mon') as month, COUNT(*) as users
      FROM usuarios
      GROUP BY TO_CHAR(fecha_creacion, 'Mon'), DATE_TRUNC('month', fecha_creacion)
      ORDER BY DATE_TRUNC('month', fecha_creacion) ASC
      LIMIT 6
    `);

    const userGrowthData = monthsRes.rows.length > 0
      ? monthsRes.rows.map(r => ({ month: r.month, users: parseInt(r.users) || 0 }))
      : [
          { month: "Ene", users: Math.max(1, Math.round(totalUsers * 0.4)) },
          { month: "Feb", users: Math.max(1, Math.round(totalUsers * 0.7)) },
          { month: "Mar", users: totalUsers }
        ];

    // Actividad por día de la semana
    const activityData = [
      { day: "Lun", logins: Math.round(activeStudents * 0.8) },
      { day: "Mar", logins: Math.round(activeStudents * 0.9) },
      { day: "Mié", logins: Math.round(activeStudents * 0.85) },
      { day: "Jue", logins: Math.round(activeStudents * 0.95) },
      { day: "Vie", logins: Math.round(activeStudents * 0.75) },
      { day: "Sáb", logins: Math.round(activeStudents * 0.4) },
      { day: "Dom", logins: Math.round(activeStudents * 0.3) }
    ];

    // Actividades recientes registradas
    const recentUsersRes = await pool.query(`
      SELECT nombre, fecha_creacion
      FROM usuarios
      ORDER BY fecha_creacion DESC
      LIMIT 5
    `);

    const recentActivity = recentUsersRes.rows.map(u => ({
      text: `Usuario registrado: ${u.nombre}`,
      time: new Date(u.fecha_creacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    }));

    res.json({
      totalUsers,
      activeStudents,
      activeRate,
      totalRaps,
      totalModules,
      dailyActive: Math.round(activeStudents * 0.7),
      usersByRole: {
        students,
        instructors,
        admins
      },
      userGrowthData,
      activityData,
      recentActivity
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard de admin:', error);
    res.status(500).json({ error: 'Server error al obtener estadísticas del dashboard' });
  }
});

// ── CRUD de Usuarios ──────────────────────────────────────────
router.get('/api/admin/users', async (req, res) => {
  try {
    const { role, status, search } = req.query;
    let query = `
      SELECT u.id, u.nombre as name, u.correo as email, u.rol as role, u.activo, u.fecha_creacion as "joinDate",
             u.identificacion as "idNumber", af.ficha_id, f.programa_id
      FROM usuarios u
      LEFT JOIN aprendiz_ficha af ON u.id = af.aprendiz_id
      LEFT JOIN fichas f ON af.ficha_id = f.id
    `;
    const params = [];
    const conditions = [];

    if (role && role !== 'All Roles') {
      let dbRole = 'aprendiz';
      if (role === 'Instructor') dbRole = 'instructor';
      if (role === 'Admin') dbRole = 'admin';
      params.push(dbRole);
      conditions.push(`u.rol::text = $${params.length}`);
    }

    if (status && status !== 'All Status') {
      const activeBool = status === 'Active';
      params.push(activeBool);
      conditions.push(`u.activo = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.nombre ILIKE $${params.length} OR u.correo ILIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY id DESC';

    const result = await pool.query(query, params);

    const formattedUsers = result.rows.map(user => {
      let roleName = 'Student';
      if (user.role === 'instructor') roleName = 'Instructor';
      if (user.role === 'admin' || user.role === 'administrador') roleName = 'Admin';

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: roleName,
        status: user.activo ? 'Active' : 'Inactive',
        joinDate: new Date(user.joinDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
        idNumber: user.idNumber || "",
        programa_id: user.programa_id ? String(user.programa_id) : "",
        ficha_id: user.ficha_id ? String(user.ficha_id) : ""
      };
    });

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/api/admin/users', async (req, res) => {
  const { name, email, role, status, password, ficha_id, idNumber } = req.body;
  try {
    const emailExists = await pool.query('SELECT id FROM usuarios WHERE correo = $1', [email]);
    if (emailExists.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'El correo ya está registrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const pass = password || '1234';
    const hashedPassword = await bcrypt.hash(pass, salt);

    let dbRole = 'aprendiz';
    if (role === 'Instructor') dbRole = 'instructor';
    if (role === 'Admin') dbRole = 'admin';

    const active = status === 'Active';

    const newUser = await pool.query(
      'INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo, identificacion) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nombre as name, correo as email, rol as role, activo, identificacion as "idNumber"',
      [name, email, hashedPassword, dbRole, active, idNumber || null]
    );

    if (dbRole === 'aprendiz' && ficha_id) {
      await pool.query('INSERT INTO aprendiz_ficha (aprendiz_id, ficha_id) VALUES ($1, $2)', [newUser.rows[0].id, ficha_id]);
    }

    res.status(201).json({ success: true, user: newUser.rows[0] });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ success: false, message: 'Error al crear el usuario en el servidor.' });
  }
});

router.put('/api/admin/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, role, status, password, ficha_id, idNumber } = req.body;

  try {
    let dbRole = 'aprendiz';
    if (role === 'Instructor') dbRole = 'instructor';
    if (role === 'Admin') dbRole = 'admin';

    const active = status === 'Active';

    let result;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      result = await pool.query(
        'UPDATE usuarios SET nombre = $1, correo = $2, rol = $3, activo = $4, identificacion = $5, contrasena_hash = $6 WHERE id = $7 RETURNING id',
        [name, email, dbRole, active, idNumber || null, hashedPassword, id]
      );
    } else {
      result = await pool.query(
        'UPDATE usuarios SET nombre = $1, correo = $2, rol = $3, activo = $4, identificacion = $5 WHERE id = $6 RETURNING id',
        [name, email, dbRole, active, idNumber || null, id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    if (dbRole === 'aprendiz' && ficha_id) {
      const checkFicha = await pool.query('SELECT * FROM aprendiz_ficha WHERE aprendiz_id = $1', [id]);
      if (checkFicha.rows.length > 0) {
        await pool.query('UPDATE aprendiz_ficha SET ficha_id = $1 WHERE aprendiz_id = $2', [ficha_id, id]);
      } else {
        await pool.query('INSERT INTO aprendiz_ficha (aprendiz_id, ficha_id) VALUES ($1, $2)', [id, ficha_id]);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar el usuario.' });
  }
});

router.delete('/api/admin/users/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query('SELECT id, rol FROM usuarios WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const user = userResult.rows[0];

    if (user.rol === 'admin' || user.rol === 'administrador') {
      const adminCount = await client.query("SELECT COUNT(*) FROM usuarios WHERE rol::text = 'admin' OR rol::text = 'administrador'");
      if (parseInt(adminCount.rows[0].count) <= 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar el último administrador del sistema.'
        });
      }
    }

    const replacementUserId = await getReplacementUserId(client, id);

    await client.query('DELETE FROM retroalimentacion_instructor WHERE instructor_id = $1', [id]);
    await client.query(
      `DELETE FROM retroalimentacion_instructor
       WHERE resultado_actividad_id IN (
         SELECT id FROM resultados_actividades WHERE aprendiz_id = $1
       )`,
      [id]
    );
    await client.query('DELETE FROM calificacion_oficial_actividad WHERE aprendiz_id = $1', [id]);
    await client.query('DELETE FROM resultados_evaluaciones WHERE aprendiz_id = $1', [id]);
    await client.query('DELETE FROM resultados_actividades WHERE aprendiz_id = $1', [id]);
    await client.query('DELETE FROM intentos_actividad WHERE aprendiz_id = $1', [id]);
    await client.query('DELETE FROM intentos_actividades WHERE aprendiz_id = $1', [id]);
    await client.query('DELETE FROM progreso_rap_aprendiz WHERE aprendiz_id = $1', [id]);
    await client.query('DELETE FROM progreso_modulo_aprendiz WHERE aprendiz_id = $1', [id]);
    await client.query('DELETE FROM registro_puntos WHERE aprendiz_id = $1', [id]);
    await client.query('DELETE FROM insignias_aprendiz WHERE aprendiz_id = $1', [id]);
    await client.query('DELETE FROM sesiones_estudio WHERE aprendiz_id = $1', [id]);
    await client.query('DELETE FROM aprendiz_ficha WHERE aprendiz_id = $1', [id]);
    await client.query('DELETE FROM instructor_ficha WHERE instructor_id = $1', [id]);
    await client.query('DELETE FROM notificaciones WHERE usuario_id = $1', [id]);

    await client.query('UPDATE recursos SET subido_por = NULL WHERE subido_por = $1', [id]);
    await client.query('UPDATE reportes_generados SET instructor_id = NULL WHERE instructor_id = $1', [id]);

    if (replacementUserId) {
      await client.query('UPDATE contenidos SET creado_por = $1 WHERE creado_por = $2', [replacementUserId, id]);
      await client.query('UPDATE actividades SET creado_por = $1 WHERE creado_por = $2', [replacementUserId, id]);
    } else {
      await client.query('DELETE FROM contenidos WHERE creado_por = $1', [id]);
      await client.query('DELETE FROM actividades WHERE creado_por = $1', [id]);
    }

    const result = await client.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      message: error.code === '23503'
        ? 'El usuario tiene datos relacionados que impiden eliminarlo.'
        : 'Error al eliminar el usuario.'
    });
  } finally {
    client.release();
  }
});

// ── CRUD de Programas ─────────────────────────────────────────
router.get('/api/admin/programs', async (req, res) => {
  try {
    const query = `
      SELECT p.id, p.nombre as title, p.activo as status, p.descripcion as description,
             (SELECT COUNT(*) FROM raps r WHERE r.programa_id = p.id) as raps_count,
             (SELECT COUNT(*) FROM modulos m WHERE m.programa_id = p.id) as modulos_count,
             (
               SELECT u.nombre
               FROM fichas f
               JOIN instructor_ficha ifi ON ifi.ficha_id = f.id
               JOIN usuarios u ON u.id = ifi.instructor_id
               WHERE f.programa_id = p.id
               ORDER BY f.id DESC
               LIMIT 1
             ) as instructor_nombre
      FROM programas p
      ORDER BY p.id DESC
    `;
    const result = await pool.query(query);
    const programs = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      modules: parseInt(row.modulos_count || 0),
      raps: parseInt(row.raps_count || 0),
      status: row.status ? 'Active' : 'Draft',
      instructor: row.instructor_nombre || '',
      description: row.description || ''
    }));
    res.json(programs);
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/api/admin/programs', async (req, res) => {
  const { title, status, description } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const active = status === 'Active';

    const progRes = await client.query(
      'INSERT INTO programas (nombre, activo, descripcion) VALUES ($1, $2, $3) RETURNING id',
      [title, active, description]
    );
    const programaId = progRes.rows[0].id;

    // Create 6 default RAPs
    const rapIds = [];
    for (let r = 1; r <= 6; r++) {
      const rapRes = await client.query(
        'INSERT INTO raps (programa_id, titulo, orden) VALUES ($1, $2, $3) RETURNING id',
        [programaId, `RAP ${r} - ${title}`, r]
      );
      rapIds.push(rapRes.rows[0].id);
    }

    // Get Fases
    const fasesRes = await client.query('SELECT id, orden FROM fases ORDER BY orden ASC');
    const faseMap = {};
    fasesRes.rows.forEach(f => { faseMap[f.orden] = f.id; });

    // Create 4 default Modulos
    const modDefs = [
      { titulo: 'Modulo 1', faseId: faseMap[1] || 1, raps: [rapIds[0]] },
      { titulo: 'Modulo 2', faseId: faseMap[2] || 2, raps: [rapIds[1], rapIds[2]] },
      { titulo: 'Modulo 3', faseId: faseMap[3] || 3, raps: [rapIds[3], rapIds[4]] },
      { titulo: 'Modulo 4', faseId: faseMap[4] || 4, raps: [rapIds[5]] }
    ];

    for (let m = 0; m < modDefs.length; m++) {
      const def = modDefs[m];
      const modRes = await client.query(
        'INSERT INTO modulos (programa_id, fase_id, titulo, orden) VALUES ($1, $2, $3, $4) RETURNING id',
        [programaId, def.faseId, def.titulo, m + 1]
      );
      await replaceModuleRapLinks(client, modRes.rows[0].id, def.raps);
    }

    await client.query('COMMIT');
    res.status(201).json({ id: programaId, success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating program:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.put('/api/admin/programs/:id', async (req, res) => {
  const { id } = req.params;
  const { title, status, description } = req.body;
  try {
    const active = status === 'Active';
    await pool.query('UPDATE programas SET nombre = $1, activo = $2, descripcion = $3 WHERE id = $4', [title, active, description, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating program:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/api/admin/programs/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fichas = await client.query('SELECT id FROM fichas WHERE programa_id = $1', [id]);
    for (const f of fichas.rows) {
      const fId = f.id;
      await client.query(
        'DELETE FROM retroalimentacion_instructor WHERE resultado_actividad_id IN (SELECT id FROM resultados_actividades WHERE actividad_id IN (SELECT id FROM actividades WHERE ficha_id = $1))',
        [fId]
      );
      await client.query('DELETE FROM resultados_actividades WHERE actividad_id IN (SELECT id FROM actividades WHERE ficha_id = $1)', [fId]);
      await client.query('DELETE FROM actividades WHERE ficha_id = $1', [fId]);
      await client.query('DELETE FROM contenidos WHERE ficha_id = $1', [fId]);
      await client.query('DELETE FROM registro_puntos WHERE ficha_id = $1', [fId]);
      await client.query('DELETE FROM aprendiz_ficha WHERE ficha_id = $1', [fId]);
      await client.query('DELETE FROM instructor_ficha WHERE ficha_id = $1', [fId]);
    }
    await client.query('DELETE FROM fichas WHERE programa_id = $1', [id]);
    await client.query('DELETE FROM programas WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting program:', err);
    res.status(500).json({ error: 'Error al eliminar el programa' });
  } finally {
    client.release();
  }
});

router.get('/api/admin/programs/:id/details', async (req, res) => {
  const programId = req.params.id;
  try {
    const programQuery = `
      SELECT id, nombre as title, descripcion as description, activo as status
      FROM programas
      WHERE id = $1
    `;
    const programResult = await pool.query(programQuery, [programId]);
    if (programResult.rows.length === 0) {
      return res.status(404).json({ error: 'Program not found' });
    }
    const program = programResult.rows[0];

    const fichasQuery = `
      SELECT id, numero_ficha as title, fecha_inicio, fecha_fin, activo as status
      FROM fichas
      WHERE programa_id = $1
      ORDER BY id DESC
    `;
    const fichasResult = await pool.query(fichasQuery, [programId]);

    res.json({
      program: {
        id: program.id,
        title: program.title,
        description: program.description || '',
        status: program.status ? 'Active' : 'Draft',
        instructor: 'Main Instructor'
      },
      courses: fichasResult.rows.map(f => ({
        id: f.id,
        title: f.title,
        startDate: f.fecha_inicio ? new Date(f.fecha_inicio).toISOString().split('T')[0] : '',
        endDate: f.fecha_fin ? new Date(f.fecha_fin).toISOString().split('T')[0] : '',
        instructor: 'Main Instructor',
        status: f.status ? 'Active' : 'Draft'
      }))
    });
  } catch (error) {
    console.error('Error fetching program details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── CRUD de Cursos / Fichas ───────────────────────────────────
router.get('/api/admin/courses', async (req, res) => {
  try {
    const query = `
      SELECT f.id, p.nombre as program_name, f.numero_ficha as title, f.activo as status, f.descripcion as description,
             f.fecha_inicio, f.fecha_fin,
             uinst.nombre as instructor_name,
             (SELECT COUNT(*) FROM raps r WHERE r.programa_id = p.id) as raps_count,
             (SELECT COUNT(*) FROM modulos m WHERE m.programa_id = p.id) as modulos_count
      FROM fichas f
      JOIN programas p ON f.programa_id = p.id
      LEFT JOIN instructor_ficha ifi ON ifi.ficha_id = f.id
      LEFT JOIN usuarios uinst ON uinst.id = ifi.instructor_id
      ORDER BY f.id DESC
    `;
    const result = await pool.query(query);
    const courses = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      program_name: row.program_name,
      modules: parseInt(row.modulos_count || 0),
      raps: parseInt(row.raps_count || 0),
      status: row.status ? 'Active' : 'Draft',
      instructor: row.instructor_name || 'Sin Instructor',
      description: row.description || '',
      startDate: row.fecha_inicio ? new Date(row.fecha_inicio).toISOString().split('T')[0] : '',
      endDate: row.fecha_fin ? new Date(row.fecha_fin).toISOString().split('T')[0] : ''
    }));
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/api/admin/courses/:id/details', async (req, res) => {
  const courseId = req.params.id;
  try {
    const courseQuery = `
      SELECT f.id, p.nombre as program_name, p.id as program_id, f.numero_ficha as title, f.activo as status, f.descripcion as description,
             f.fecha_inicio, f.fecha_fin, uinst.nombre as instructor_name
      FROM fichas f
      JOIN programas p ON f.programa_id = p.id
      LEFT JOIN instructor_ficha ifi ON ifi.ficha_id = f.id
      LEFT JOIN usuarios uinst ON uinst.id = ifi.instructor_id
      WHERE f.id = $1
    `;
    const courseResult = await pool.query(courseQuery, [courseId]);
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    const course = courseResult.rows[0];

    const studentsQuery = `
      SELECT u.id, u.nombre as name, u.correo as email, u.activo, u.fecha_creacion as "joinDate"
      FROM usuarios u
      JOIN aprendiz_ficha af ON u.id = af.aprendiz_id
      WHERE af.ficha_id = $1
    `;
    const studentsResult = await pool.query(studentsQuery, [courseId]);

    const rapsQuery = `
      SELECT r.id, r.titulo as title, r.orden
      FROM raps r
      WHERE r.programa_id = $1
      ORDER BY r.orden ASC
    `;
    const rapsResult = await pool.query(rapsQuery, [course.program_id]);

    const modulesQuery = `
      SELECT m.id, m.titulo as title, m.orden, COALESCE(f.nombre, '') as fase, mr.rap_id
      FROM modulos m
      JOIN fases f ON f.id = m.fase_id
      LEFT JOIN modulo_rap mr ON m.id = mr.modulo_id
      WHERE m.programa_id = $1
      ORDER BY m.orden ASC
    `;
    const modulesResult = await pool.query(modulesQuery, [course.program_id]);

    const curriculum = rapsResult.rows.map(rap => ({
      ...rap,
      modules: modulesResult.rows.filter(m => String(m.rap_id) === String(rap.id))
    }));

    res.json({
      course: {
        id: course.id,
        title: course.title,
        program_name: course.program_name,
        status: course.status ? 'Active' : 'Draft',
        instructor: course.instructor_name || 'Sin Instructor',
        description: course.description || '',
        startDate: course.fecha_inicio ? new Date(course.fecha_inicio).toISOString().split('T')[0] : '',
        endDate: course.fecha_fin ? new Date(course.fecha_fin).toISOString().split('T')[0] : ''
      },
      students: studentsResult.rows.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        status: s.activo ? 'Active' : 'Inactive',
        joinDate: new Date(s.joinDate).toLocaleDateString()
      })),
      curriculum
    });
  } catch (error) {
    console.error('Error fetching course details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/api/admin/courses', async (req, res) => {
  const { title, programId, startDate, endDate, status, description, instructor } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const active = status === 'Active';

    if (!programId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El programa de formación es requerido.' });
    }

    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
    const fichaRes = await client.query(
      'INSERT INTO fichas (programa_id, numero_ficha, fecha_inicio, fecha_fin, activo, descripcion) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [programId, title, start, end, active, description]
    );

    const fichaId = fichaRes.rows[0].id;

    if (instructor) {
      const instUser = await client.query(
        "SELECT id FROM usuarios WHERE (nombre = $1 OR id::text = $1) AND (rol = 'instructor' OR rol = 'admin') LIMIT 1",
        [instructor]
      );
      if (instUser.rows.length) {
        await client.query(
          'INSERT INTO instructor_ficha (instructor_id, ficha_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [instUser.rows[0].id, fichaId]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ id: fichaId, success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating course (ficha):', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: `El número de ficha "${title}" ya existe en la base de datos.` });
    }
    res.status(500).json({ error: 'Error interno del servidor al crear la ficha.' });
  } finally {
    client.release();
  }
});

router.put('/api/admin/courses/:id', async (req, res) => {
  const { id } = req.params;
  const { title, startDate, endDate, status, description, instructor } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const active = status === 'Active';
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

    await client.query(
      'UPDATE fichas SET numero_ficha = $1, fecha_inicio = $2, fecha_fin = $3, activo = $4, descripcion = $5 WHERE id = $6',
      [title, start, end, active, description, id]
    );

    if (instructor) {
      const instUser = await client.query(
        "SELECT id FROM usuarios WHERE (nombre = $1 OR id::text = $1) AND (rol = 'instructor' OR rol = 'admin') LIMIT 1",
        [instructor]
      );
      if (instUser.rows.length) {
        await client.query('DELETE FROM instructor_ficha WHERE ficha_id = $1', [id]);
        await client.query(
          'INSERT INTO instructor_ficha (instructor_id, ficha_id) VALUES ($1, $2)',
          [instUser.rows[0].id, id]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating course:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: `El número de ficha "${title}" ya existe.` });
    }
    res.status(500).json({ error: 'Error al actualizar la ficha' });
  } finally {
    client.release();
  }
});

router.delete('/api/admin/courses/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'DELETE FROM retroalimentacion_instructor WHERE resultado_actividad_id IN (SELECT id FROM resultados_actividades WHERE actividad_id IN (SELECT id FROM actividades WHERE ficha_id = $1))',
      [id]
    );
    await client.query('DELETE FROM resultados_actividades WHERE actividad_id IN (SELECT id FROM actividades WHERE ficha_id = $1)', [id]);
    await client.query('DELETE FROM actividades WHERE ficha_id = $1', [id]);
    await client.query('DELETE FROM contenidos WHERE ficha_id = $1', [id]);
    await client.query('DELETE FROM registro_puntos WHERE ficha_id = $1', [id]);
    await client.query('DELETE FROM aprendiz_ficha WHERE ficha_id = $1', [id]);
    await client.query('DELETE FROM instructor_ficha WHERE ficha_id = $1', [id]);
    await client.query('DELETE FROM fichas WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting course:', err);
    res.status(500).json({ error: 'Error al eliminar la ficha' });
  } finally {
    client.release();
  }
});

// ── Dashboard de Contenido Admin ──────────────────────────────
router.get('/api/admin/content', async (req, res) => {
  try {
    const rapsRes = await pool.query('SELECT COUNT(*) FROM raps');
    const modulesRes = await pool.query('SELECT COUNT(*) FROM modulos');
    const resourcesRes = await pool.query('SELECT tipo_mime, COUNT(*) FROM recursos GROUP BY tipo_mime');

    let videoCount = 0, audioCount = 0, imageCount = 0;
    resourcesRes.rows.forEach(r => {
      if (r.tipo_mime && r.tipo_mime.startsWith('video/')) videoCount += parseInt(r.count);
      if (r.tipo_mime && r.tipo_mime.startsWith('audio/')) audioCount += parseInt(r.count);
      if (r.tipo_mime && r.tipo_mime.startsWith('image/')) imageCount += parseInt(r.count);
    });

    const programsOverviewRes = await pool.query(`
      SELECT p.id, p.nombre as name,
             (SELECT COUNT(*) FROM raps r WHERE r.programa_id = p.id) as raps,
             (SELECT COUNT(*) FROM modulos m WHERE m.programa_id = p.id) as modules
      FROM programas p
      ORDER BY p.id DESC
      LIMIT 10
    `);

    const recentRes = await pool.query(`
      SELECT titulo as title, tipo_mime as type, 'Admin' as author, fecha_creacion as date, 'Published' as status
      FROM recursos
      ORDER BY fecha_creacion DESC LIMIT 5
    `);

    res.json({
      contentStats: [
        { type: "RAPS", count: parseInt(rapsRes.rows[0].count) },
        { type: "Modules", count: parseInt(modulesRes.rows[0].count) },
        { type: "Videos", count: videoCount },
        { type: "Audio Files", count: audioCount },
        { type: "Images", count: imageCount },
      ],
      rapsOverview: programsOverviewRes.rows.map(r => ({
        name: r.name,
        modules: parseInt(r.modules),
        status: "Published"
      })),
      storageUsage: {
        totalUsed: 0,
        totalLimit: 10,
        percentage: 0,
        videos: "0 MB",
        audio: "0 MB",
        images: "0 MB",
        documents: "0 MB"
      },
      recentContent: recentRes.rows.map(r => ({
        title: r.title,
        type: r.type ? r.type.split('/')[0] : 'Document',
        author: r.author,
        date: new Date(r.date).toLocaleDateString(),
        status: r.status
      }))
    });
  } catch (error) {
    console.error('Error fetching admin content:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
