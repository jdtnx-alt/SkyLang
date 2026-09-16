import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// Aplicar autenticación y verificación de roles a las rutas de instructor
router.use('/api/instructor', verifyToken, requireRole('instructor', 'admin', 'administrador'));

// Configuración de subida de archivos
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

router.post('/api/instructor/upload', upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

// GET /api/instructor/dashboard — Métricas principales del Dashboard del Instructor
router.get('/api/instructor/dashboard', async (req, res) => {
  try {
    const instructorId = req.user?.id;
    const isInstructorOnly = req.user?.rol === 'instructor';
    let studentsQuery = "SELECT COUNT(*) FROM usuarios WHERE rol = 'aprendiz'";
    let modulesQuery = "SELECT COUNT(*) FROM modulos";
    let rapsQuery = "SELECT COUNT(*) FROM raps";
    const queryParams = (instructorId && isInstructorOnly) ? [instructorId] : [];

    if (instructorId && isInstructorOnly) {
      studentsQuery = `
        SELECT COUNT(DISTINCT a.id)
        FROM usuarios a
        JOIN aprendiz_ficha af ON a.id = af.aprendiz_id
        JOIN fichas f ON f.id = af.ficha_id
        JOIN instructor_ficha ifi ON ifi.ficha_id = f.id
        WHERE a.rol = 'aprendiz' AND ifi.instructor_id = $1
      `;
      modulesQuery = `
        SELECT COUNT(DISTINCT m.id)
        FROM modulos m
        JOIN fichas f ON f.programa_id = m.programa_id
        JOIN instructor_ficha ifi ON ifi.ficha_id = f.id
        WHERE ifi.instructor_id = $1
      `;
      rapsQuery = `
        SELECT COUNT(DISTINCT r.id)
        FROM raps r
        JOIN fichas f ON f.programa_id = r.programa_id
        JOIN instructor_ficha ifi ON ifi.ficha_id = f.id
        WHERE ifi.instructor_id = $1
      `;
    }

    const [studentsRes, modulesRes, rapsRes] = await Promise.all([
      pool.query(studentsQuery, queryParams),
      pool.query(modulesQuery, queryParams),
      pool.query(rapsQuery, queryParams)
    ]);

    res.json({
      totalStudents: parseInt(studentsRes.rows[0]?.count || 0),
      totalModules: parseInt(modulesRes.rows[0]?.count || 0),
      totalRaps: parseInt(rapsRes.rows[0]?.count || 0)
    });
  } catch (error) {
    console.error('Error fetching instructor dashboard metrics:', error);
    res.status(500).json({ error: 'Server error loading instructor metrics' });
  }
});

// GET /api/instructor/students — Lista de aprendices del instructor
router.get('/api/instructor/students', async (req, res) => {
  try {
    const { search, ficha } = req.query;
    let query = `
      SELECT 
        u.id, 
        u.nombre, 
        u.correo AS email, 
        CASE WHEN u.activo = true THEN 'Activo' ELSE 'Inactivo' END AS estado, 
        f.numero_ficha, 
        p.nombre AS programa_titulo
      FROM usuarios u
      LEFT JOIN aprendiz_ficha af ON u.id = af.aprendiz_id
      LEFT JOIN fichas f ON f.id = af.ficha_id
      LEFT JOIN programas p ON p.id = f.programa_id
      WHERE u.rol = 'aprendiz'
    `;
    const params = [];

    if (req.user?.rol === 'instructor') {
      params.push(req.user.id);
      query += ` AND (
        f.id IN (
          SELECT ifi.ficha_id 
          FROM instructor_ficha ifi 
          WHERE ifi.instructor_id = $${params.length}
        ) OR NOT EXISTS (
          SELECT 1 FROM instructor_ficha ifi2 
          WHERE ifi2.instructor_id = $${params.length}
        )
      )`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (u.nombre ILIKE $${params.length} OR u.correo ILIKE $${params.length} OR f.numero_ficha ILIKE $${params.length})`;
    }

    if (ficha) {
      params.push(ficha);
      query += ` AND f.numero_ficha = $${params.length}`;
    }

    query += ' ORDER BY u.nombre ASC';

    const result = await pool.query(query, params);
    
    // Transform formatting
    const students = result.rows.map(s => ({
      id: s.id,
      nombre: s.nombre,
      email: s.email || 'Sin Correo',
      estado: s.estado || 'Activo',
      numeroFicha: s.numero_ficha || 'Sin Ficha',
      programaTitulo: s.programa_titulo || 'Sin Programa',
      avance: 0
    }));

    res.json(students);
  } catch (error) {
    console.error('Error fetching instructor students:', error);
    res.status(500).json({ error: 'Error al obtener la lista de aprendices' });
  }
});

// GET /api/instructor/programs — Programas y Fichas asignadas al instructor
router.get('/api/instructor/programs', async (req, res) => {
  try {
    const { instructor } = req.query;
    let query = `
      SELECT 
        p.id AS programa_id,
        p.nombre AS programa_titulo,
        p.descripcion AS programa_descripcion,
        f.id AS ficha_id,
        f.numero_ficha,
        f.fecha_inicio,
        f.fecha_fin,
        f.activo,
        (SELECT COUNT(*) FROM aprendiz_ficha af WHERE af.ficha_id = f.id) AS total_aprendices
      FROM fichas f
      JOIN programas p ON p.id = f.programa_id
    `;
    const params = [];

    if (instructor) {
      params.push(instructor);
      query += `
        LEFT JOIN instructor_ficha ifi ON ifi.ficha_id = f.id
        LEFT JOIN usuarios uinst ON uinst.id = ifi.instructor_id
        WHERE (uinst.nombre = $1 OR uinst.correo = $1 OR ifi.instructor_id IS NULL)
      `;
    }

    query += ' ORDER BY p.nombre ASC, f.numero_ficha ASC';

    const result = await pool.query(query, params);
    
    // Group by program
    const programsMap = new Map();

    result.rows.forEach(row => {
      if (!programsMap.has(row.programa_id)) {
        programsMap.set(row.programa_id, {
          id: row.programa_id,
          title: row.programa_titulo,
          description: row.programa_descripcion,
          fichas: []
        });
      }

      programsMap.get(row.programa_id).fichas.push({
        id: row.ficha_id,
        numeroFicha: row.numero_ficha,
        fechaInicio: row.fecha_inicio ? new Date(row.fecha_inicio).toISOString().split('T')[0] : 'N/A',
        fechaFin: row.fecha_fin ? new Date(row.fecha_fin).toISOString().split('T')[0] : 'N/A',
        activo: row.activo !== false,
        totalAprendices: parseInt(row.total_aprendices || 0)
      });
    });

    res.json(Array.from(programsMap.values()));
  } catch (error) {
    console.error('Error fetching instructor programs:', error);
    res.status(500).json({ error: 'Error al obtener programas y fichas asignadas' });
  }
});

// GET /api/instructor/modules — Obtener módulos por programa / ficha
router.get('/api/instructor/modules', async (req, res) => {
  try {
    const { programId, search } = req.query;
    let query = `
      SELECT 
        m.id,
        m.programa_id,
        m.fase_id,
        m.titulo,
        m.descripcion,
        m.orden,
        p.nombre AS programa_titulo,
        (
          SELECT JSON_AGG(JSON_BUILD_OBJECT('id', r.id, 'titulo', r.titulo))
          FROM modulo_rap mr
          JOIN raps r ON r.id = mr.rap_id
          WHERE mr.modulo_id = m.id
        ) AS raps
      FROM modulos m
      JOIN programas p ON p.id = m.programa_id
    `;
    const params = [];

    if (programId) {
      params.push(programId);
      query += ` WHERE m.programa_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += params.length === 1 ? ' WHERE' : ' AND';
      query += ` (m.titulo ILIKE $${params.length} OR m.descripcion ILIKE $${params.length})`;
    }

    query += ' ORDER BY m.programa_id ASC, m.orden ASC';

    const result = await pool.query(query, params);

    const modules = result.rows.map(row => ({
      id: row.id,
      programaId: row.programa_id,
      faseId: row.fase_id || 1,
      titulo: row.titulo,
      descripcion: row.descripcion || 'Sin descripción',
      orden: row.orden || 1,
      programaTitulo: row.programa_titulo,
      raps: row.raps || []
    }));

    res.json(modules);
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ error: 'Error al obtener módulos' });
  }
});

// POST /api/instructor/modules — Crear nuevo módulo
router.post('/api/instructor/modules', async (req, res) => {
  try {
    const { programaId, titulo, descripcion, orden, faseId } = req.body;
    if (!programaId || !titulo) {
      return res.status(400).json({ error: 'Programa y título son obligatorios' });
    }

    const insertQuery = `
      INSERT INTO modulos (programa_id, titulo, descripcion, orden, fase_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(insertQuery, [
      programaId,
      titulo,
      descripcion || '',
      orden || 1,
      faseId || 1
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating module:', error);
    res.status(500).json({ error: 'Error al crear el módulo' });
  }
});

// PUT /api/instructor/modules/:id — Actualizar módulo
router.put('/api/instructor/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, orden, faseId } = req.body;

    const updateQuery = `
      UPDATE modulos
      SET titulo = COALESCE($1, titulo),
          descripcion = COALESCE($2, descripcion),
          orden = COALESCE($3, orden),
          fase_id = COALESCE($4, fase_id)
      WHERE id = $5
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [titulo, descripcion, orden, faseId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating module:', error);
    res.status(500).json({ error: 'Error al actualizar el módulo' });
  }
});

// DELETE /api/instructor/modules/:id — Eliminar módulo
router.delete('/api/instructor/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleteQuery = 'DELETE FROM modulos WHERE id = $1 RETURNING id';
    const result = await pool.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }

    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting module:', error);
    res.status(500).json({ error: 'Error al eliminar el módulo' });
  }
});

export default router;
