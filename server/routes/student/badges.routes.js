import express from 'express';
import pool from '../../db.js';
import { verifyToken } from '../../middleware/auth.middleware.js';
import { puedeVerAlAprendiz } from '../../services/student.service.js';
import { obtenerInsigniasConProgreso, evaluarInsignias, evaluarInsigniasRetroactivo } from '../../services/gamification.service.js';

const router = express.Router();

/**
 * GET /api/student/badges?studentId=:id
 *
 * Devuelve el catálogo completo de insignias con su estado de desbloqueo
 * y el progreso parcial para las que aún no se han obtenido.
 */
router.get('/api/student/badges', verifyToken, async (req, res) => {
  const studentId = Number(req.query.studentId);
  if (!Number.isInteger(studentId)) {
    return res.status(400).json({ error: 'studentId es requerido y debe ser numérico' });
  }

  try {
    if (!(await puedeVerAlAprendiz(req.user, studentId))) {
      return res.status(403).json({ error: 'No tienes permiso para consultar los logros de este aprendiz' });
    }

    // Evaluación retroactiva: otorga insignias que el aprendiz ya mereció
    // pero que no se registraron (activities previas al deploy, etc.)
    await evaluarInsigniasRetroactivo(pool, studentId);

    const datos = await obtenerInsigniasConProgreso(pool, studentId);
    res.json(datos);
  } catch (err) {
    console.error('Error obteniendo insignias:', err);
    res.status(500).json({ error: 'No se pudieron cargar los logros' });
  }
});

/**
 * POST /api/student/badges/check-profile?studentId=:id
 *
 * Evalúa si el aprendiz completa el criterio PERFIL_COMPLETO
 * (todos los campos de perfil rellenos). Se llama al guardar el perfil.
 */
router.post('/api/student/badges/check-profile', verifyToken, async (req, res) => {
  const studentId = Number(req.query.studentId) || req.user.id;

  try {
    if (!(await puedeVerAlAprendiz(req.user, studentId))) {
      return res.status(403).json({ error: 'Sin permiso' });
    }

    // Verificar si el perfil está completo
    const perfil = await pool.query(
      `SELECT identificacion, telefono, nombre FROM usuarios WHERE id = $1`,
      [studentId]
    );
    const u = perfil.rows[0];
    if (!u) return res.status(404).json({ error: 'Aprendiz no encontrado' });

    const perfilCompleto =
      u.identificacion && u.identificacion.trim() !== '' &&
      u.telefono       && u.telefono.trim()       !== '' &&
      u.nombre         && u.nombre.trim()         !== '';

    if (!perfilCompleto) {
      return res.json({ otorgada: false, motivo: 'Perfil incompleto' });
    }

    // Obtener ficha del aprendiz para registro_puntos
    const fichaRes = await pool.query(
      `SELECT af.ficha_id FROM aprendiz_ficha af WHERE af.aprendiz_id = $1 LIMIT 1`,
      [studentId]
    );
    const fichaId = fichaRes.rows[0]?.ficha_id || null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Buscar la insignia
      const ins = await client.query(
        `SELECT id FROM insignias WHERE codigo_criterio = 'PERFIL_COMPLETO'`
      );
      let otorgada = false;

      if (ins.rows.length) {
        const result = await client.query(
          `INSERT INTO insignias_aprendiz (aprendiz_id, insignia_id, fecha_otorgada)
           VALUES ($1, $2, NOW())
           ON CONFLICT (aprendiz_id, insignia_id) DO NOTHING
           RETURNING insignia_id`,
          [studentId, ins.rows[0].id]
        );
        if (result.rows.length > 0) {
          otorgada = true;
          // XP bono por insignia de perfil
          await client.query(
            `INSERT INTO registro_puntos (aprendiz_id, ficha_id, origen, cantidad_puntos, fecha_obtencion)
             VALUES ($1, $2, 'insignia', 30, NOW())`,
            [studentId, fichaId]
          );
        }
      }

      await client.query('COMMIT');
      res.json({ otorgada });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error evaluando insignia de perfil:', err);
    res.status(500).json({ error: 'Error evaluando el criterio de perfil' });
  }
});

export default router;
