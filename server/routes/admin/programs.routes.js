import express from 'express';
import pool from '../../db.js';
import { replaceModuleRapLinks } from '../../services/seed.service.js';

const router = express.Router();

// GET /api/admin/programs
router.get('/api/admin/programs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.nombre as title, p.activo as status, p.descripcion as description,
             (SELECT COUNT(*) FROM raps r WHERE r.programa_id = p.id) as raps_count,
             (SELECT COUNT(*) FROM modulos m WHERE m.programa_id = p.id) as modulos_count
      FROM programas p ORDER BY p.id DESC
    `);
    res.json(result.rows.map(row => ({
      id: row.id, title: row.title,
      modules: parseInt(row.modulos_count || 0), raps: parseInt(row.raps_count || 0),
      status: row.status ? 'Active' : 'Draft',
      instructor: 'Instructor Asignado', description: row.description || ''
    })));
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/programs/:id/details
router.get('/api/admin/programs/:id/details', async (req, res) => {
  const programId = req.params.id;
  try {
    const programResult = await pool.query('SELECT id, nombre as title, descripcion as description, activo as status FROM programas WHERE id = $1', [programId]);
    if (programResult.rows.length === 0) return res.status(404).json({ error: 'Program not found' });
    const program = programResult.rows[0];
    // El instructor y el número de aprendices salen de la base: antes eran el
    // literal 'Main Instructor' para todas las fichas.
    const fichasResult = await pool.query(
      `SELECT f.id, f.numero_ficha AS title, f.descripcion, f.fecha_inicio, f.fecha_fin, f.activo AS status,
              u.id AS instructor_id, u.nombre AS instructor_nombre,
              (SELECT COUNT(*) FROM aprendiz_ficha af WHERE af.ficha_id = f.id)::int AS aprendices
         FROM fichas f
         LEFT JOIN instructor_ficha inf ON inf.ficha_id = f.id
         LEFT JOIN usuarios u ON u.id = inf.instructor_id
        WHERE f.programa_id = $1
        ORDER BY f.id DESC`,
      [programId]
    );

    res.json({
      program: { id: program.id, title: program.title, description: program.description || '', status: program.status ? 'Active' : 'Draft' },
      courses: fichasResult.rows.map(f => ({
        id: f.id,
        title: f.title,
        description: f.descripcion || '',
        startDate: f.fecha_inicio ? new Date(f.fecha_inicio).toISOString().split('T')[0] : '',
        endDate: f.fecha_fin ? new Date(f.fecha_fin).toISOString().split('T')[0] : '',
        instructorId: f.instructor_id || null,
        instructor: f.instructor_nombre || 'Sin instructor asignado',
        aprendices: f.aprendices,
        status: f.status ? 'Active' : 'Draft'
      }))
    });
  } catch (error) {
    console.error('Error fetching program details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/programs
router.post('/api/admin/programs', async (req, res) => {
  const { title, status, description } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const progRes = await client.query('INSERT INTO programas (nombre, activo, descripcion) VALUES ($1, $2, $3) RETURNING id', [title, status === 'Active', description]);
    const programaId = progRes.rows[0].id;
    const rapIds = [];
    for (let r = 1; r <= 6; r++) {
      const rapRes = await client.query('INSERT INTO raps (programa_id, titulo, orden) VALUES ($1, $2, $3) RETURNING id', [programaId, `RAP ${r} - ${title}`, r]);
      rapIds.push(rapRes.rows[0].id);
    }
    const fasesRes = await client.query('SELECT id, orden FROM fases ORDER BY orden ASC');
    const faseMap = {};
    fasesRes.rows.forEach(f => { faseMap[f.orden] = f.id; });
    const modDefs = [
      { titulo: 'Modulo 1', faseId: faseMap[1] || 1, raps: [rapIds[0]] },
      { titulo: 'Modulo 2', faseId: faseMap[2] || 2, raps: [rapIds[1], rapIds[2]] },
      { titulo: 'Modulo 3', faseId: faseMap[3] || 3, raps: [rapIds[3], rapIds[4]] },
      { titulo: 'Modulo 4', faseId: faseMap[4] || 4, raps: [rapIds[5]] }
    ];
    for (let m = 0; m < modDefs.length; m++) {
      const def = modDefs[m];
      const modRes = await client.query('INSERT INTO modulos (programa_id, fase_id, titulo, orden) VALUES ($1, $2, $3, $4) RETURNING id', [programaId, def.faseId, def.titulo, m + 1]);
      await replaceModuleRapLinks(client, modRes.rows[0].id, def.raps);
    }
    await client.query('COMMIT');
    res.status(201).json({ id: programaId, success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating program:', error);
    res.status(500).json({ error: 'Server error' });
  } finally { client.release(); }
});

// PUT /api/admin/programs/:id
router.put('/api/admin/programs/:id', async (req, res) => {
  const { id } = req.params;
  const { title, status, description } = req.body;
  try {
    await pool.query('UPDATE programas SET nombre = $1, activo = $2, descripcion = $3 WHERE id = $4', [title, status === 'Active', description, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating program:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/programs/:id
router.delete('/api/admin/programs/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fichas = await client.query('SELECT id FROM fichas WHERE programa_id = $1', [id]);
    for (const f of fichas.rows) {
      const fId = f.id;
      // (retirado) retroalimentacion_instructor no es alcanzable desde calificacion_oficial_actividad.
      await client.query('DELETE FROM calificacion_oficial_actividad WHERE actividad_id IN (SELECT id FROM actividades WHERE ficha_id = $1)', [fId]);
      await client.query('DELETE FROM intentos_actividad WHERE actividad_id IN (SELECT id FROM actividades WHERE ficha_id = $1)', [fId]);
      await client.query('DELETE FROM rap_momento_actividades WHERE actividad_id IN (SELECT id FROM actividades WHERE ficha_id = $1)', [fId]);
      await client.query('DELETE FROM actividades WHERE ficha_id = $1', [fId]);
      await client.query('DELETE FROM rap_momento_contenidos WHERE contenido_id IN (SELECT id FROM contenidos WHERE ficha_id = $1)', [fId]);
      await client.query('DELETE FROM contenidos WHERE ficha_id = $1', [fId]);
      await client.query('DELETE FROM registro_puntos WHERE ficha_id = $1', [fId]);
      await client.query('DELETE FROM sesiones_estudio WHERE ficha_id = $1', [fId]);
      await client.query('DELETE FROM reportes_generados WHERE ficha_id = $1', [fId]);
      await client.query('DELETE FROM aprendiz_ficha WHERE ficha_id = $1', [fId]);
      await client.query('DELETE FROM instructor_ficha WHERE ficha_id = $1', [fId]);
    }
    await client.query('DELETE FROM fichas WHERE programa_id = $1', [id]);
    await client.query('DELETE FROM modulo_rap WHERE modulo_id IN (SELECT id FROM modulos WHERE programa_id = $1)', [id]);
    await client.query('DELETE FROM modulos WHERE programa_id = $1', [id]);
    await client.query('DELETE FROM rap_momento_actividades WHERE rap_momento_id IN (SELECT id FROM rap_momentos WHERE rap_id IN (SELECT id FROM raps WHERE programa_id = $1))', [id]);
    await client.query('DELETE FROM rap_momento_contenidos WHERE rap_momento_id IN (SELECT id FROM rap_momentos WHERE rap_id IN (SELECT id FROM raps WHERE programa_id = $1))', [id]);
    await client.query('DELETE FROM rap_momentos WHERE rap_id IN (SELECT id FROM raps WHERE programa_id = $1)', [id]);
    await client.query('DELETE FROM raps WHERE programa_id = $1', [id]);
    await client.query('DELETE FROM programas WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting program:', err);
    res.status(500).json({ error: 'Error al eliminar el programa' });
  } finally { client.release(); }
});

export default router;
