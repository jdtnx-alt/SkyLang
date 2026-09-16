import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { materializarProgreso } from '../services/access.service.js';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET de entorno no definido.');
}
const JWT_SECRET = process.env.JWT_SECRET;

const router = express.Router();

// Estado de la BD
router.get('/api/db-status', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      success: true,
      message: 'Conectado a la base de datos Skyland en PostgreSQL',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    console.error('Error al conectar con la BD:', error);
    res.status(500).json({
      success: false,
      message: 'Error de conexión a la base de datos',
      error: error.message
    });
  }
});

// Obtener programas (público/filtro instructor)
router.get('/api/programas', async (req, res) => {
  try {
    const { instructor } = req.query;
    let query = 'SELECT * FROM programas ORDER BY id ASC';
    const params = [];
    if (instructor) {
      query = `
        SELECT DISTINCT p.*
        FROM programas p
        JOIN fichas f ON p.id = f.programa_id
        JOIN instructor_ficha ifi ON ifi.ficha_id = f.id
        JOIN usuarios u ON u.id = ifi.instructor_id
        WHERE u.nombre = $1 OR u.id::text = $1
        ORDER BY p.id ASC
      `;
      params.push(instructor);
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener programas:', error);
    res.status(500).json({ error: 'Error al obtener programas' });
  }
});

// Obtener fichas
router.get('/api/fichas', async (req, res) => {
  try {
    const { program_id } = req.query;
    let query = 'SELECT id, numero_ficha, programa_id FROM fichas';
    const params = [];

    if (program_id) {
      query += ' WHERE programa_id = $1';
      params.push(program_id);
    }

    query += ' ORDER BY id ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener fichas:', error);
    res.status(500).json({ error: 'Error al obtener fichas' });
  }
});

// Obtener instructores
router.get('/api/instructores', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre as name, correo as email FROM usuarios WHERE rol::text IN ('instructor', 'admin', 'administrador') AND activo = true ORDER BY nombre ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener instructores:', error);
    res.status(500).json({ error: 'Error al obtener instructores' });
  }
});


// Registro de Usuario
router.post('/api/auth/register', async (req, res) => {
  const { fullName, email, password, ficha, idNumber } = req.body;

  try {
    const userExists = await pool.query('SELECT id FROM usuarios WHERE correo = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'El correo ya está registrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      'INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, identificacion) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, correo, rol, identificacion as "idNumber"',
      [fullName, email, hashedPassword, 'aprendiz', idNumber || null]
    );

    const createdUser = newUser.rows[0];

    if (ficha) {
      await pool.query(
        'INSERT INTO aprendiz_ficha (aprendiz_id, ficha_id) VALUES ($1, $2)',
        [createdUser.id, ficha]
      );
      // Progreso materializado al matricular: RAP 1 disponible, el resto bloqueado.
      await materializarProgreso(pool, createdUser.id, ficha);
    }

    const token = jwt.sign(
      { id: createdUser.id, nombre: createdUser.nombre, correo: createdUser.correo, rol: createdUser.rol },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ success: true, token, user: createdUser });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor al registrar usuario.' });
  }
});

// Login de Usuario
router.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userQuery = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [email]);
    if (userQuery.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
    }

    const user = userQuery.rows[0];

    const validPassword = await bcrypt.compare(password, user.contrasena_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
    }

    // La cuenta desactivada por el administrador no puede iniciar sesión.
    // Se comprueba después de validar la contraseña para no revelar qué cuentas existen.
    if (user.activo === false) {
      return res.status(403).json({ success: false, message: 'Esta cuenta está desactivada. Contacta al administrador.' });
    }

    await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.rol
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor durante el login.' });
  }
});

// Un usuario solo accede a su propio perfil; el administrador accede a cualquiera.
function puedeAccederAlPerfil(req, userId) {
  const rol = (req.user?.rol || '').toLowerCase();
  if (rol === 'admin' || rol === 'administrador') return true;
  return String(req.user?.id) === String(userId);
}

// Perfil del Usuario
router.get('/api/users/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.params.id;
    if (!puedeAccederAlPerfil(req, userId)) {
      return res.status(403).json({ error: 'No tienes permiso para consultar este perfil' });
    }

    const userRes = await pool.query(
      `SELECT u.id, u.nombre, u.correo, u.rol, u.identificacion, u.telefono, u.fecha_creacion,
              f.numero_ficha, p.nombre as programa_nombre
       FROM usuarios u
       LEFT JOIN aprendiz_ficha af ON af.aprendiz_id = u.id
       LEFT JOIN fichas f ON f.id = af.ficha_id AND f.activo = true
       LEFT JOIN programas p ON p.id = f.programa_id
       WHERE u.id = $1
       ORDER BY af.fecha_registro DESC
       LIMIT 1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(userRes.rows[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/api/users/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.params.id;
    if (!puedeAccederAlPerfil(req, userId)) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este perfil' });
    }

    const { fullName, email, idNumber, phone } = req.body;

    // El correo identifica la cuenta: no puede quedar vacío ni pisar el de otro usuario.
    if (!email || !fullName) {
      return res.status(400).json({ error: 'El nombre y el correo son obligatorios' });
    }
    const enUso = await pool.query('SELECT id FROM usuarios WHERE correo = $1 AND id <> $2', [email, userId]);
    if (enUso.rows.length > 0) {
      return res.status(400).json({ error: 'Ese correo ya pertenece a otro usuario' });
    }

    const updateRes = await pool.query(
      'UPDATE usuarios SET nombre = $1, correo = $2, identificacion = $3, telefono = $4 WHERE id = $5 RETURNING id',
      [fullName, email, idNumber, phone, userId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
});

export default router;
