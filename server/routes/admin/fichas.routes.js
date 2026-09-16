import express from 'express';
import pool from '../../db.js';

const router = express.Router();

// GET /api/admin/courses (fichas)
router.get('/api/admin/courses', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.id, p.nombre as program_name, f.numero_ficha as title, f.activo as status,
             f.descripcion as description, f.fecha_inicio, f.fecha_fin,
             uinst.nombre as instructor_name,
             (SELECT COUNT(*) FROM raps r WHERE r.programa_id = p.id) as raps_count,
             (SELECT COUNT(*) FROM modulos m WHERE m.programa_id = p.id) as modulos_count
      FROM fichas f
      JOIN programas p ON f.programa_id = p.id
      LEFT JOIN instructor_ficha ifi ON ifi.ficha_id = f.id
      LEFT JOIN usuarios uinst ON uinst.id = ifi.instructor_id
      ORDER BY f.id DESC
    `);
    res.json(result.rows.map(row => ({
      id: row.id, title: row.title, program_name: row.program_name,
      modules: parseInt(row.modulos_count || 0), raps: parseInt(row.raps_count || 0),
      status: row.status ? 'Active' : 'Draft',
      instructor: row.instructor_name || 'Sin Instructor',
      description: row.description || '',
      startDate: row.fecha_inicio ? new Date(row.fecha_inicio).toISOString().split('T')[0] : '',
      endDate: row.fecha_fin ? new Date(row.fecha_fin).toISOString().split('T')[0] : ''
    })));
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/courses/:id/details
router.get('/api/admin/courses/:id/details', async (req, res) => {
  const courseId = req.params.id;
  try {
    const courseResult = await pool.query(`
      SELECT f.id, p.nombre as program_name, p.id as program_id, f.numero_ficha as title,
             f.activo as status, f.descripcion as description, f.fecha_inicio, f.fecha_fin,
             uinst.nombre as instructor_name
      FROM fichas f
      JOIN programas p ON f.programa_id = p.id
      LEFT JOIN instructor_ficha ifi ON ifi.ficha_id = f.id
      LEFT JOIN usuarios uinst ON uinst.id = ifi.instructor_id
      WHERE f.id = $1
    `, [courseId]);
    if (courseResult.rows.length === 0) return res.status(404).json({ error: 'Course not found' });

    const course       = courseResult.rows[0];
    const studentsRes  = await pool.query(`SELECT u.id, u.nombre as name, u.correo as email, u.activo, u.fecha_creacion as "joinDate" FROM usuarios u JOIN aprendiz_ficha af ON u.id = af.aprendiz_id WHERE af.ficha_id = $1`, [courseId]);
    const rapsRes      = await pool.query(`SELECT r.id, r.titulo as title, r.orden FROM raps r WHERE r.programa_id = $1 ORDER BY r.orden ASC`, [course.program_id]);
    const modulesRes   = await pool.query(`SELECT m.id, m.titulo as title, m.orden, COALESCE(f.nombre, '') as fase, mr.rap_id FROM modulos m JOIN fases f ON f.id = m.fase_id LEFT JOIN modulo_rap mr ON m.id = mr.modulo_id WHERE m.programa_id = $1 ORDER BY m.orden ASC`, [course.program_id]);

    res.json({
      course: {
        id: course.id, title: course.title,
        program_name: course.program_name, program_id: course.program_id,
        status: course.status ? 'Active' : 'Draft',
        instructor: course.instructor_name || 'Sin Instructor',
        description: course.description || '',
        startDate: course.fecha_inicio ? new Date(course.fecha_inicio).toISOString().split('T')[0] : '',
        endDate: course.fecha_fin ? new Date(course.fecha_fin).toISOString().split('T')[0] : ''
      },
      students: studentsRes.rows.map(s => ({ id: s.id, name: s.name, email: s.email, status: s.activo ? 'Active' : 'Inactive', joinDate: new Date(s.joinDate).toLocaleDateString() })),
      curriculum: rapsRes.rows.map(rap => ({ ...rap, modules: modulesRes.rows.filter(m => String(m.rap_id) === String(rap.id)) }))
    });
  } catch (error) {
    console.error('Error fetching course details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/courses
router.post('/api/admin/courses', async (req, res) => {
  const { title, programId, startDate, endDate, status, description, instructor } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (!programId) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'El programa de formacion es requerido.' }); }
    const start = startDate || new Date().toISOString().split('T')[0];
    const end   = endDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
    const fichaRes = await client.query('INSERT INTO fichas (programa_id, numero_ficha, fecha_inicio, fecha_fin, activo, descripcion) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [programId, title, start, end, status === 'Active', description]);
    const fichaId = fichaRes.rows[0].id;
    if (instructor && String(instructor).trim() !== '') {
      const instUser = await client.query(
        "SELECT id FROM usuarios WHERE (nombre = $1 OR id::text = $1) AND rol::text IN ('instructor','admin','administrador') LIMIT 1",
        [String(instructor)]
      );
      if (instUser.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'El instructor indicado no existe.' });
      }
      await client.query('INSERT INTO instructor_ficha (instructor_id, ficha_id) VALUES ($1, $2)', [instUser.rows[0].id, fichaId]);
    }
    await client.query('COMMIT');
    res.status(201).json({ id: fichaId, success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating course (ficha):', error);
    if (error.code === '23505') return res.status(400).json({ error: `El numero de ficha "${title}" ya existe.` });
    res.status(500).json({ error: 'Error interno del servidor al crear la ficha.' });
  } finally { client.release(); }
});

// PUT /api/admin/courses/:id
router.put('/api/admin/courses/:id', async (req, res) => {
  const { id } = req.params;
  const { title, startDate, endDate, status, description, instructor } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const start = startDate || new Date().toISOString().split('T')[0];
    const end   = endDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
    await client.query('UPDATE fichas SET numero_ficha = $1, fecha_inicio = $2, fecha_fin = $3, activo = $4, descripcion = $5 WHERE id = $6', [title, start, end, status === 'Active', description, id]);
    // 'instructor' ausente = no se toca la asignación.
    // 'instructor' vacío     = se retira el instructor de la ficha.
    // Antes, elegir «sin asignar» no quitaba nada porque solo actuaba si venía valor.
    if (instructor !== undefined) {
      await client.query('DELETE FROM instructor_ficha WHERE ficha_id = $1', [id]);
      if (String(instructor).trim() !== '') {
        const instUser = await client.query(
          "SELECT id FROM usuarios WHERE (nombre = $1 OR id::text = $1) AND rol::text IN ('instructor','admin','administrador') LIMIT 1",
          [String(instructor)]
        );
        if (instUser.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'El instructor indicado no existe.' });
        }
        await client.query('INSERT INTO instructor_ficha (instructor_id, ficha_id) VALUES ($1, $2)', [instUser.rows[0].id, id]);
      }
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(400).json({ error: `El numero de ficha "${title}" ya existe.` });
    res.status(500).json({ error: 'Error al actualizar la ficha' });
  } finally { client.release(); }
});

// DELETE /api/admin/courses/:id
router.delete('/api/admin/courses/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. (retirado) La retroalimentacion del instructor no es alcanzable desde
    //    calificacion_oficial_actividad: su FK apunta a resultados_actividades, tabla
    //    eliminada por la migracion 001. Se rehace al reapuntar la FK en la fase 1.

    // 2. Calificaciones e intentos de actividades
    await client.query('DELETE FROM calificacion_oficial_actividad WHERE actividad_id IN (SELECT id FROM actividades WHERE ficha_id = $1)', [id]);
    await client.query('DELETE FROM intentos_actividad WHERE actividad_id IN (SELECT id FROM actividades WHERE ficha_id = $1)', [id]);

    // 3. Vínculos de actividades y actividades de la ficha
    await client.query('DELETE FROM rap_momento_actividades WHERE actividad_id IN (SELECT id FROM actividades WHERE ficha_id = $1)', [id]);
    await client.query('DELETE FROM actividades WHERE ficha_id = $1', [id]);

    // 4. Vínculos de contenidos y contenidos de la ficha
    await client.query('DELETE FROM rap_momento_contenidos WHERE contenido_id IN (SELECT id FROM contenidos WHERE ficha_id = $1)', [id]);
    await client.query('DELETE FROM contenidos WHERE ficha_id = $1', [id]);

    // 5. Puntos, sesiones y reportes de la ficha
    await client.query('DELETE FROM registro_puntos WHERE ficha_id = $1', [id]);
    await client.query('DELETE FROM sesiones_estudio WHERE ficha_id = $1', [id]);
    await client.query('DELETE FROM reportes_generados WHERE ficha_id = $1', [id]);

    // 6. Matrículas de aprendices e instructores
    await client.query('DELETE FROM aprendiz_ficha WHERE ficha_id = $1', [id]);
    await client.query('DELETE FROM instructor_ficha WHERE ficha_id = $1', [id]);

    // 7. Ficha
    await client.query('DELETE FROM fichas WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar ficha (course):', err);
    res.status(500).json({ error: 'Error al eliminar la ficha' });
  } finally { client.release(); }
});

export default router;
