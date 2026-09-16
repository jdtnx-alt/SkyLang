import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../../db.js';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';
import { gestionaPrograma, gestionaModulo, esAdministrador } from '../../services/access.service.js';
import { tipoDeArchivoPermitido, categoriaDeArchivo, TAMANO_MAXIMO_BYTES } from '../../services/media.service.js';
import contentRoutes from './content.routes.js';

const router = express.Router();


// Auth guard para todas las rutas del instructor
router.use('/api/instructor', verifyToken, requireRole('instructor', 'admin', 'administrador'));

// Subida de archivos del material de estudio: documentos, imágenes, audio y vídeo.
// Antes solo aceptaba el campo 'audio', sin límite de tamaño ni filtro de tipo, y
// no registraba nada en la tabla de recursos: el archivo quedaba suelto en disco.
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize: TAMANO_MAXIMO_BYTES },
  fileFilter: (req, file, cb) => {
    if (tipoDeArchivoPermitido(file.mimetype)) return cb(null, true);
    cb(new Error(`Tipo de archivo no admitido: ${file.mimetype}`));
  }
});

router.post('/api/instructor/upload', (req, res) => {
  // 'archivo' es el campo nuevo; 'audio' se mantiene por compatibilidad.
  const recibir = upload.fields([{ name: 'archivo', maxCount: 1 }, { name: 'audio', maxCount: 1 }]);

  recibir(req, res, async (err) => {
    if (err) {
      const mensaje = err.code === 'LIMIT_FILE_SIZE'
        ? `El archivo supera el máximo de ${Math.round(TAMANO_MAXIMO_BYTES / 1024 / 1024)} MB.`
        : err.message;
      return res.status(400).json({ error: mensaje });
    }

    const file = req.files?.archivo?.[0] || req.files?.audio?.[0];
    if (!file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });

    try {
      const recurso = await pool.query(
        `INSERT INTO recursos (titulo, ruta_archivo, tipo_mime, subido_por)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [file.originalname, `/uploads/${file.filename}`, file.mimetype, req.user.id]
      );

      res.json({
        recurso_id: recurso.rows[0].id,
        url: `/uploads/${file.filename}`,
        nombre: file.originalname,
        tipo_mime: file.mimetype,
        categoria: categoriaDeArchivo(file.mimetype),
        tamano: file.size
      });
    } catch (e) {
      console.error('Error registrando el recurso subido:', e);
      res.status(500).json({ error: 'El archivo se subió pero no pudo registrarse.' });
    }
  });
});

// GET /api/instructor/dashboard
router.get('/api/instructor/dashboard', async (req, res) => {
  try {
    const instructorId = req.user?.id;
    const isInstructorOnly = req.user?.rol === 'instructor';
    const queryParams = (instructorId && isInstructorOnly) ? [instructorId] : [];

    let studentsQuery = "SELECT COUNT(*) FROM usuarios WHERE rol = 'aprendiz'";
    let modulesQuery  = "SELECT COUNT(*) FROM modulos";
    let rapsQuery     = "SELECT COUNT(*) FROM raps";

    if (instructorId && isInstructorOnly) {
      studentsQuery = `SELECT COUNT(DISTINCT a.id) FROM usuarios a JOIN aprendiz_ficha af ON a.id = af.aprendiz_id JOIN fichas f ON f.id = af.ficha_id JOIN instructor_ficha ifi ON ifi.ficha_id = f.id WHERE a.rol = 'aprendiz' AND ifi.instructor_id = $1`;
      modulesQuery  = `SELECT COUNT(DISTINCT m.id) FROM modulos m JOIN fichas f ON f.programa_id = m.programa_id JOIN instructor_ficha ifi ON ifi.ficha_id = f.id WHERE ifi.instructor_id = $1`;
      rapsQuery     = `SELECT COUNT(DISTINCT r.id) FROM raps r JOIN fichas f ON f.programa_id = r.programa_id JOIN instructor_ficha ifi ON ifi.ficha_id = f.id WHERE ifi.instructor_id = $1`;
    }

    const [studentsRes, modulesRes, rapsRes] = await Promise.all([
      pool.query(studentsQuery, queryParams),
      pool.query(modulesQuery, queryParams),
      pool.query(rapsQuery, queryParams)
    ]);

    res.json({
      totalStudents: parseInt(studentsRes.rows[0]?.count || 0),
      totalModules:  parseInt(modulesRes.rows[0]?.count || 0),
      totalRaps:     parseInt(rapsRes.rows[0]?.count || 0)
    });
  } catch (error) {
    console.error('Error fetching instructor dashboard metrics:', error);
    res.status(500).json({ error: 'Server error loading instructor metrics' });
  }
});

// GET /api/instructor/students
router.get('/api/instructor/students', async (req, res) => {
  try {
    const { search, ficha } = req.query;
    // El avance se calcula de verdad: promedio del porcentaje de los RAP del
    // programa de su ficha. Antes la lista devolvía siempre 0.
    let query = `SELECT u.id, u.nombre, u.correo AS email,
                        CASE WHEN u.activo = true THEN 'Activo' ELSE 'Inactivo' END AS estado,
                        f.numero_ficha, p.nombre AS programa_titulo,
                        COALESCE(pr.avance, 0)          AS avance,
                        COALESCE(pr.raps_totales, 0)    AS raps_totales,
                        COALESCE(pr.raps_completados, 0) AS raps_completados,
                        pr.rap_actual,
                        pr.ultima_actividad
                   FROM usuarios u
                   LEFT JOIN aprendiz_ficha af ON u.id = af.aprendiz_id
                   LEFT JOIN fichas f ON f.id = af.ficha_id
                   LEFT JOIN programas p ON p.id = f.programa_id
                   LEFT JOIN LATERAL (
                     SELECT ROUND(AVG(pra.porcentaje), 2)                                  AS avance,
                            COUNT(*)::int                                                  AS raps_totales,
                            COUNT(*) FILTER (WHERE pra.porcentaje >= 100)::int              AS raps_completados,
                            MIN(r.orden) FILTER (WHERE pra.porcentaje < 100)                AS rap_actual,
                            (SELECT MAX(i.fecha_fin) FROM intentos_actividad i WHERE i.aprendiz_id = u.id) AS ultima_actividad
                       FROM progreso_rap_aprendiz pra
                       JOIN raps r ON r.id = pra.rap_id
                      WHERE pra.aprendiz_id = u.id AND r.programa_id = f.programa_id
                   ) pr ON true
                  WHERE u.rol = 'aprendiz'`;
    const params = [];
    // Sin el `OR NOT EXISTS`: un instructor sin fichas asignadas veía a TODOS
    // los aprendices de la plataforma.
    if (!esAdministrador(req.user?.rol)) {
      params.push(req.user.id);
      query += ` AND f.id IN (SELECT ifi.ficha_id FROM instructor_ficha ifi WHERE ifi.instructor_id = $${params.length})`;
    }
    if (search) { params.push(`%${search}%`); query += ` AND (u.nombre ILIKE $${params.length} OR u.correo ILIKE $${params.length} OR f.numero_ficha ILIKE $${params.length})`; }
    if (ficha) { params.push(ficha); query += ` AND (f.id::text = $${params.length} OR f.numero_ficha = $${params.length})`; }
    query += ' ORDER BY u.nombre ASC';
    const result = await pool.query(query, params);
    res.json(result.rows.map(s => ({
      id: s.id,
      nombre: s.nombre,
      email: s.email || 'Sin Correo',
      estado: s.estado || 'Activo',
      numeroFicha: s.numero_ficha || 'Sin Ficha',
      programaTitulo: s.programa_titulo || 'Sin Programa',
      avance: Math.round(parseFloat(s.avance || 0)),
      rapsTotales: parseInt(s.raps_totales || 0),
      rapsCompletados: parseInt(s.raps_completados || 0),
      rapActual: s.rap_actual ? parseInt(s.rap_actual) : null,
      ultimaActividad: s.ultima_actividad
    })));
  } catch (error) {
    console.error('Error fetching instructor students:', error);
    res.status(500).json({ error: 'Error al obtener la lista de aprendices' });
  }
});

// GET /api/instructor/programs
router.get('/api/instructor/programs', async (req, res) => {
  try {
    // El instructor ve exclusivamente las fichas que tiene asignadas. Antes, el
    // filtro era opcional (dependía de un parámetro de la URL) y además incluía
    // `OR ifi.instructor_id IS NULL`, con lo que se mostraban las fichas sin
    // asignar de cualquier programa.
    let query = `SELECT p.id AS programa_id, p.nombre AS programa_titulo, p.descripcion AS programa_descripcion, f.id AS ficha_id, f.numero_ficha, f.fecha_inicio, f.fecha_fin, f.activo, (SELECT COUNT(*) FROM aprendiz_ficha af WHERE af.ficha_id = f.id) AS total_aprendices FROM fichas f JOIN programas p ON p.id = f.programa_id`;
    const params = [];
    if (!esAdministrador(req.user?.rol)) {
      params.push(req.user.id);
      query += ` JOIN instructor_ficha ifi ON ifi.ficha_id = f.id AND ifi.instructor_id = $${params.length}`;
    }
    query += ' ORDER BY p.nombre ASC, f.numero_ficha ASC';
    const result = await pool.query(query, params);
    const programsMap = new Map();
    result.rows.forEach(row => {
      if (!programsMap.has(row.programa_id)) programsMap.set(row.programa_id, { id: row.programa_id, title: row.programa_titulo, description: row.programa_descripcion, fichas: [] });
      programsMap.get(row.programa_id).fichas.push({ id: row.ficha_id, numeroFicha: row.numero_ficha, fechaInicio: row.fecha_inicio ? new Date(row.fecha_inicio).toISOString().split('T')[0] : 'N/A', fechaFin: row.fecha_fin ? new Date(row.fecha_fin).toISOString().split('T')[0] : 'N/A', activo: row.activo !== false, totalAprendices: parseInt(row.total_aprendices || 0) });
    });
    res.json(Array.from(programsMap.values()));
  } catch (error) {
    console.error('Error fetching instructor programs:', error);
    res.status(500).json({ error: 'Error al obtener programas y fichas asignadas' });
  }
});

// GET /api/instructor/modules
router.get('/api/instructor/modules', async (req, res) => {
  try {
    const { programId, search } = req.query;
    let query = `SELECT m.id, m.programa_id, m.fase_id, m.titulo, m.descripcion, m.orden, p.nombre AS programa_titulo, (SELECT JSON_AGG(JSON_BUILD_OBJECT('id', r.id, 'titulo', r.titulo)) FROM modulo_rap mr JOIN raps r ON r.id = mr.rap_id WHERE mr.modulo_id = m.id) AS raps FROM modulos m JOIN programas p ON p.id = m.programa_id`;
    const params = [];
    // El instructor solo ve los módulos de los programas donde tiene ficha.
    if (!esAdministrador(req.user?.rol)) {
      params.push(req.user.id);
      query += ` WHERE EXISTS (SELECT 1 FROM instructor_ficha ifi JOIN fichas f ON f.id = ifi.ficha_id
                                WHERE ifi.instructor_id = $${params.length} AND f.programa_id = m.programa_id)`;
    }
    if (programId) { params.push(programId); query += (params.length === 1 ? ' WHERE' : ' AND') + ` m.programa_id = $${params.length}`; }
    if (search) { params.push(`%${search}%`); query += (params.length === 1 ? ' WHERE' : ' AND') + ` (m.titulo ILIKE $${params.length} OR m.descripcion ILIKE $${params.length})`; }
    query += ' ORDER BY m.programa_id ASC, m.orden ASC';
    const result = await pool.query(query, params);
    res.json(result.rows.map(row => ({ id: row.id, programaId: row.programa_id, faseId: row.fase_id || 1, titulo: row.titulo, descripcion: row.descripcion || 'Sin descripcion', orden: row.orden || 1, programaTitulo: row.programa_titulo, raps: row.raps || [] })));
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ error: 'Error al obtener modulos' });
  }
});

// POST /api/instructor/modules
router.post('/api/instructor/modules', async (req, res) => {
  try {
    const { programaId, titulo, descripcion, orden, faseId } = req.body;
    if (!programaId || !titulo) return res.status(400).json({ error: 'Programa y titulo son obligatorios' });
    if (!(await gestionaPrograma(pool, req.user, programaId))) {
      return res.status(403).json({ error: 'No gestionas ninguna ficha de este programa' });
    }
    const result = await pool.query('INSERT INTO modulos (programa_id, titulo, descripcion, orden, fase_id) VALUES ($1, $2, $3, $4, $5) RETURNING *', [programaId, titulo, descripcion || '', orden || 1, faseId || 1]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating module:', error);
    res.status(500).json({ error: 'Error al crear el modulo' });
  }
});

// PUT /api/instructor/modules/:id
router.put('/api/instructor/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, orden, faseId } = req.body;
    const alcance = await gestionaModulo(pool, req.user, id);
    if (!alcance.existe) return res.status(404).json({ error: 'Modulo no encontrado' });
    if (!alcance.permitido) return res.status(403).json({ error: 'Este módulo pertenece a un programa que no gestionas' });

    const result = await pool.query('UPDATE modulos SET titulo = COALESCE($1, titulo), descripcion = COALESCE($2, descripcion), orden = COALESCE($3, orden), fase_id = COALESCE($4, fase_id) WHERE id = $5 RETURNING *', [titulo, descripcion, orden, faseId, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Modulo no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating module:', error);
    res.status(500).json({ error: 'Error al actualizar el modulo' });
  }
});

// DELETE /api/instructor/modules/:id
router.delete('/api/instructor/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const alcance = await gestionaModulo(pool, req.user, id);
    if (!alcance.existe) return res.status(404).json({ error: 'Modulo no encontrado' });
    if (!alcance.permitido) return res.status(403).json({ error: 'Este módulo pertenece a un programa que no gestionas' });

    // Borrar un módulo arrastra sus vinculaciones a RAP y el progreso registrado.
    // Si algún aprendiz ya avanzó en él, no se borra: el historial académico no
    // desaparece por una operación de contenido (RN-28).
    const conAvance = await pool.query(
      'SELECT COUNT(*)::int n FROM progreso_modulo_aprendiz WHERE modulo_id = $1 AND porcentaje_maximo > 0',
      [id]
    );
    if (conAvance.rows[0].n > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: ${conAvance.rows[0].n} aprendiz(ces) ya registran avance en este módulo.`
      });
    }

    const result = await pool.query('DELETE FROM modulos WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Modulo no encontrado' });
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting module:', error);
    res.status(500).json({ error: 'Error al eliminar el modulo' });
  }
});

// Gestión de contenido de fichas (actividades y contenidos por RAP/Momento)
router.use(contentRoutes);

export default router;

