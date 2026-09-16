import express from 'express';
import pool from '../../db.js';
import { verifyToken } from '../../middleware/auth.middleware.js';
import { getFichaDelAprendiz } from '../../services/student.service.js';
import { enunciadoSeguro } from '../../services/grading.service.js';
import { puedeAccederRap, debeAplicarBloqueo } from '../../services/access.service.js';

const router = express.Router();

// GET /api/student/rap/:rapId/actividades — solo actividades de la ficha del aprendiz
router.get('/api/student/rap/:rapId/actividades', verifyToken, async (req, res) => {
  const { rapId }  = req.params;
  const aprendizId = req.user.id;

  try {
    const ficha = await getFichaDelAprendiz(aprendizId);
    if (!ficha) return res.status(403).json({ error: 'El aprendiz no tiene ficha activa asignada' });
    const fichaId = ficha.ficha_id;

    // El bloqueo se aplica aquí, no solo al pintar la lista de módulos: antes una
    // petición directa a un RAP bloqueado devolvía sus actividades sin más.
    if (debeAplicarBloqueo(req.user?.rol)) {
      const veredicto = await puedeAccederRap(pool, aprendizId, rapId);
      if (!veredicto.permitido) {
        return res.status(423).json({ error: veredicto.motivo, bloqueado: true, actividades: [] });
      }
    }

    const actividadesRes = await pool.query(
      `SELECT
         a.id, a.titulo, a.tipo, a.instrucciones, a.datos_json, a.obligatoria,
         rm.orden AS momento_orden, mo.nombre AS momento_nombre,
         COALESCE(coa.mejor_calificacion, 0) AS mejor_calificacion,
         COALESCE(coa.aprobada, false) AS aprobada,
         COALESCE(coa.numero_intentos, 0) AS num_intentos,
         (SELECT ia.id FROM intentos_actividad ia
           WHERE ia.actividad_id = a.id AND ia.aprendiz_id = $1
             AND ia.estado IN ('en_curso', 'guardada')
           ORDER BY ia.numero_intento DESC LIMIT 1) AS intento_abierto_id
       FROM actividades a
       JOIN rap_momento_actividades rma ON rma.actividad_id = a.id
       JOIN rap_momentos rm ON rm.id = rma.rap_momento_id
       JOIN momentos mo ON mo.id = rm.momento_id
       LEFT JOIN calificacion_oficial_actividad coa ON coa.actividad_id = a.id AND coa.aprendiz_id = $1
       WHERE rm.rap_id = $2 AND a.ficha_id = $3
       ORDER BY rm.orden ASC, rma.orden ASC`,
      [aprendizId, rapId, fichaId]
    );

    // El material de estudio del RAP: se visualiza, no genera progreso.
    const contenidosRes = await pool.query(
      `SELECT c.id, c.titulo, c.cuerpo_texto, c.datos_json,
              re.ruta_archivo AS recurso_url, re.tipo_mime AS recurso_mime, re.titulo AS recurso_nombre,
              rm.orden AS momento_orden, mo.nombre AS momento_nombre, rmc.orden
         FROM contenidos c
         JOIN rap_momento_contenidos rmc ON rmc.contenido_id = c.id
         JOIN rap_momentos rm ON rm.id = rmc.rap_momento_id
         JOIN momentos mo ON mo.id = rm.momento_id
         LEFT JOIN recursos re ON re.id = c.recurso_id
        WHERE rm.rap_id = $1 AND c.ficha_id = $2
        ORDER BY rm.orden ASC, rmc.orden ASC`,
      [rapId, fichaId]
    );

    const actividades = actividadesRes.rows.map((a) => ({
      ...a,
      // La clave de corrección no sale del servidor.
      datos_json: enunciadoSeguro(a.datos_json),
      mejor_calificacion: parseFloat(a.mejor_calificacion),
      estado: a.aprobada
        ? 'aprobada'
        : a.intento_abierto_id ? 'en_curso'
        : Number(a.num_intentos) > 0 ? 'reprobada' : 'pendiente'
    }));

    res.json({
      rapId: parseInt(rapId),
      fichaId,
      actividades,
      contenidos: contenidosRes.rows
    });
  } catch (err) {
    console.error('Error fetching RAP actividades:', err);
    res.status(500).json({ error: 'Error al obtener actividades del RAP' });
  }
});

export default router;
