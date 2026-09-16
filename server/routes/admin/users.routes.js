import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../../db.js';
import { materializarProgreso } from '../../services/access.service.js';

const router = express.Router();

async function getReplacementUserId(client, deletedUserId) {
  const result = await client.query(
    `SELECT id FROM usuarios WHERE id <> $1
     ORDER BY CASE rol::text WHEN 'admin' THEN 1 WHEN 'administrador' THEN 1 WHEN 'instructor' THEN 2 ELSE 3 END, id ASC
     LIMIT 1`,
    [deletedUserId]
  );
  return result.rows.length ? result.rows[0].id : null;
}

// GET /api/admin/users
router.get('/api/admin/users', async (req, res) => {
  try {
    const { role, status, search } = req.query;
    let query = `
      SELECT u.id, u.nombre as name, u.correo as email, u.rol as role, u.activo,
             u.fecha_creacion as "joinDate", u.identificacion as "idNumber",
             af.ficha_id, f.programa_id
      FROM usuarios u
      LEFT JOIN aprendiz_ficha af ON u.id = af.aprendiz_id
      LEFT JOIN fichas f ON af.ficha_id = f.id
    `;
    const params = [], conditions = [];

    if (role && role !== 'All Roles') {
      const dbRole = role === 'Instructor' ? 'instructor' : role === 'Admin' ? 'admin' : 'aprendiz';
      params.push(dbRole); conditions.push(`u.rol::text = $${params.length}`);
    }
    if (status && status !== 'All Status') {
      params.push(status === 'Active'); conditions.push(`u.activo = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`); conditions.push(`(u.nombre ILIKE $${params.length} OR u.correo ILIKE $${params.length})`);
    }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY id DESC';

    const result = await pool.query(query, params);
    res.json(result.rows.map(user => ({
      id: user.id, name: user.name, email: user.email,
      role: user.role === 'instructor' ? 'Instructor' : (user.role === 'admin' || user.role === 'administrador') ? 'Admin' : 'Student',
      status: user.activo ? 'Active' : 'Inactive',
      joinDate: new Date(user.joinDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
      idNumber: user.idNumber || '',
      programa_id: user.programa_id ? String(user.programa_id) : '',
      ficha_id: user.ficha_id ? String(user.ficha_id) : ''
    })));
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/admin/users
router.post('/api/admin/users', async (req, res) => {
  const { name, email, role, status, password, ficha_id, idNumber } = req.body;
  try {
    const emailExists = await pool.query('SELECT id FROM usuarios WHERE correo = $1', [email]);
    if (emailExists.rows.length > 0) return res.status(400).json({ success: false, message: 'El correo ya esta registrado.' });

    if (!password || String(password).length < 8) {
      return res.status(400).json({ success: false, message: 'La contraseña es obligatoria y debe tener al menos 8 caracteres.' });
    }

    const dbRole = role === 'Instructor' ? 'instructor' : role === 'Admin' ? 'admin' : 'aprendiz';
    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));

    const newUser = await pool.query(
      'INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo, identificacion) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nombre as name, correo as email, rol as role, activo, identificacion as "idNumber"',
      [name, email, hashedPassword, dbRole, status === 'Active', idNumber || null]
    );
    if (dbRole === 'aprendiz' && ficha_id) {
      await pool.query('INSERT INTO aprendiz_ficha (aprendiz_id, ficha_id) VALUES ($1, $2)', [newUser.rows[0].id, ficha_id]);
      await materializarProgreso(pool, newUser.rows[0].id, ficha_id);
    }
    res.status(201).json({ success: true, user: newUser.rows[0] });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ success: false, message: 'Error al crear el usuario.' });
  }
});

// PUT /api/admin/users/:id
router.put('/api/admin/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, role, status, password, ficha_id, idNumber } = req.body;

  if (!name || !email) {
    return res.status(400).json({ success: false, message: 'El nombre y el correo son obligatorios.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dbRole = role === 'Instructor' ? 'instructor' : role === 'Admin' ? 'admin' : 'aprendiz';

    const enUso = await client.query('SELECT id FROM usuarios WHERE correo = $1 AND id <> $2', [email, id]);
    if (enUso.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Ese correo ya pertenece a otro usuario.' });
    }

    let result;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
      result = await client.query('UPDATE usuarios SET nombre=$1, correo=$2, rol=$3, activo=$4, identificacion=$5, contrasena_hash=$6 WHERE id=$7 RETURNING id', [name, email, dbRole, status === 'Active', idNumber || null, hashedPassword, id]);
    } else {
      result = await client.query('UPDATE usuarios SET nombre=$1, correo=$2, rol=$3, activo=$4, identificacion=$5 WHERE id=$6 RETURNING id', [name, email, dbRole, status === 'Active', idNumber || null, id]);
    }
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    if (dbRole === 'aprendiz' && ficha_id) {
      // La ficha debe existir. Sin esta comprobación, un desplegable que se
      // pintaba antes de cargar sus opciones movía al aprendiz de ficha en
      // silencio al guardar cualquier otro cambio.
      const fichaExiste = await client.query('SELECT id FROM fichas WHERE id = $1', [ficha_id]);
      if (fichaExiste.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'La ficha indicada no existe.' });
      }

      const actuales = await client.query('SELECT ficha_id FROM aprendiz_ficha WHERE aprendiz_id = $1', [id]);
      const yaEstaba = actuales.rows.some((f) => String(f.ficha_id) === String(ficha_id));

      if (!yaEstaba) {
        // Se sustituye la matrícula anterior, no se acumula: una ficha por aprendiz.
        await client.query('DELETE FROM aprendiz_ficha WHERE aprendiz_id = $1', [id]);
        await client.query('INSERT INTO aprendiz_ficha (aprendiz_id, ficha_id) VALUES ($1, $2)', [id, ficha_id]);
      }
      await materializarProgreso(client, id, ficha_id);
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar el usuario.' });
  } finally {
    client.release();
  }
});

// DELETE /api/admin/users/:id
router.delete('/api/admin/users/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query('SELECT id, rol FROM usuarios WHERE id = $1', [id]);
    if (userResult.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'Usuario no encontrado.' }); }

    const user = userResult.rows[0];
    if (user.rol === 'admin' || user.rol === 'administrador') {
      const adminCount = await client.query("SELECT COUNT(*) FROM usuarios WHERE rol::text = 'admin' OR rol::text = 'administrador'");
      if (parseInt(adminCount.rows[0].count) <= 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'No se puede eliminar el ultimo administrador del sistema.' });
      }
    }

    const replacementUserId = await getReplacementUserId(client, id);
    await client.query('DELETE FROM retroalimentacion_instructor WHERE instructor_id = $1', [id]);
    // Ver nota en instructor/content.routes.js: la retroalimentacion recibida por el
    // aprendiz no es alcanzable desde calificacion_oficial_actividad (PK compuesta).
    await client.query('DELETE FROM calificacion_oficial_actividad WHERE aprendiz_id = $1', [id]);
    await client.query('DELETE FROM intentos_actividad WHERE aprendiz_id = $1', [id]);
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
    if (result.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'Usuario no encontrado.' }); }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ success: false, message: error.code === '23503' ? 'El usuario tiene datos relacionados que impiden eliminarlo.' : 'Error al eliminar el usuario.' });
  } finally {
    client.release();
  }
});

export default router;
