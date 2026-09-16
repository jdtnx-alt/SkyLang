import express from 'express';
import pool from '../../db.js';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';
import { gestionaFicha } from '../../services/access.service.js';
import { validarActividad, catalogoDeTipos, catalogoParaMomento, permitidoEnMomento } from '../../services/activity-schema.service.js';
import { normalizarDatosDeContenido } from '../../services/media.service.js';

const router = express.Router();

// Auth guard: solo instructor o admin
router.use('/api/instructor', verifyToken, requireRole('instructor', 'admin', 'administrador'));

// GET /api/instructor/tipos-actividad
// Los tipos que el sistema sabe presentar y calificar de principio a fin.
router.get('/api/instructor/tipos-actividad', (req, res) => {
  const orden = Number(req.query.momento);
  if (Number.isInteger(orden)) return res.json(catalogoParaMomento(orden));
  res.json(catalogoDeTipos());
});

// ══════════════════════════════════════════════════════════════════════
// GET /api/instructor/ficha/:fichaId/estructura
// Devuelve la estructura completa de una ficha:
// Módulos → RAPs → Momentos → Actividades (de esa ficha)
// ══════════════════════════════════════════════════════════════════════
router.get('/api/instructor/ficha/:fichaId/estructura', async (req, res) => {
  const { fichaId } = req.params;

  try {
    // 1. Verificar que la ficha existe y obtener su programa
    const fichaRes = await pool.query(
      `SELECT f.id, f.numero_ficha, f.programa_id, p.nombre as programa_nombre
       FROM fichas f
       JOIN programas p ON p.id = f.programa_id
       WHERE f.id = $1`,
      [fichaId]
    );
    if (fichaRes.rows.length === 0) {
      return res.status(404).json({ error: 'Ficha no encontrada' });
    }
    if (!(await gestionaFicha(pool, req.user, fichaId))) {
      return res.status(403).json({ error: 'Esta ficha no está asignada a tu cuenta' });
    }
    const ficha = fichaRes.rows[0];

    // 2. Módulos del programa de esta ficha
    const modulosRes = await pool.query(
      `SELECT m.id, m.titulo, m.orden, fa.nombre as fase
       FROM modulos m
       LEFT JOIN fases fa ON fa.id = m.fase_id
       WHERE m.programa_id = $1
       ORDER BY m.orden ASC`,
      [ficha.programa_id]
    );

    // 3. RAPs del programa con sus momentos y actividades (filtradas por ficha)
    const rapsRes = await pool.query(
      `SELECT
         r.id              AS rap_id,
         r.titulo          AS rap_titulo,
         r.orden           AS rap_orden,
         mr.modulo_id,
         rm.id             AS rap_momento_id,
         rm.orden          AS momento_orden,
         mo.id             AS momento_id,
         mo.nombre         AS momento_nombre,
         mo.codigo         AS momento_codigo
       FROM raps r
       JOIN modulo_rap mr ON mr.rap_id = r.id
       JOIN rap_momentos rm ON rm.rap_id = r.id
       JOIN momentos mo ON mo.id = rm.momento_id
       WHERE r.programa_id = $1
       ORDER BY r.orden ASC, rm.orden ASC`,
      [ficha.programa_id]
    );

    // 4. Actividades de esta ficha vinculadas a los momentos
    const actividadesRes = await pool.query(
      `SELECT
         a.id, a.titulo, a.tipo, a.instrucciones, a.datos_json,
         a.obligatoria, a.fecha_creacion,
         rma.rap_momento_id, rma.orden
       FROM actividades a
       JOIN rap_momento_actividades rma ON rma.actividad_id = a.id
       WHERE a.ficha_id = $1
       ORDER BY rma.rap_momento_id ASC, rma.orden ASC`,
      [fichaId]
    );

    // 4b. Material de estudio de esta ficha, para que el instructor vea y
    //     gestione lo que sube (antes la estructura solo devolvía actividades).
    const contenidosRes = await pool.query(
      `SELECT c.id, c.titulo, c.cuerpo_texto, c.datos_json, c.fecha_creacion,
              re.ruta_archivo AS recurso_url, re.tipo_mime AS recurso_mime, re.titulo AS recurso_nombre,
              rmc.rap_momento_id, rmc.orden
         FROM contenidos c
         JOIN rap_momento_contenidos rmc ON rmc.contenido_id = c.id
         LEFT JOIN recursos re ON re.id = c.recurso_id
        WHERE c.ficha_id = $1
        ORDER BY rmc.rap_momento_id ASC, rmc.orden ASC`,
      [fichaId]
    );

    const contenidosByMomento = {};
    contenidosRes.rows.forEach((c) => {
      if (!contenidosByMomento[c.rap_momento_id]) contenidosByMomento[c.rap_momento_id] = [];
      contenidosByMomento[c.rap_momento_id].push({
        id: c.id, titulo: c.titulo, cuerpo_texto: c.cuerpo_texto,
        datos_json: c.datos_json, orden: c.orden, fecha_creacion: c.fecha_creacion,
        recurso_url: c.recurso_url, recurso_mime: c.recurso_mime, recurso_nombre: c.recurso_nombre
      });
    });

    // 5. Ensamblar la respuesta: Módulos → RAPs → Momentos → Actividades
    const actividadesByMomento = {};
    actividadesRes.rows.forEach(a => {
      const key = a.rap_momento_id;
      if (!actividadesByMomento[key]) actividadesByMomento[key] = [];
      actividadesByMomento[key].push({
        id: a.id, titulo: a.titulo, tipo: a.tipo,
        instrucciones: a.instrucciones, datos_json: a.datos_json,
        obligatoria: a.obligatoria, orden: a.orden,
        fecha_creacion: a.fecha_creacion
      });
    });

    // Agrupar por RAP y Módulo
    const modulosMap = new Map();
    modulosRes.rows.forEach(m => {
      modulosMap.set(m.id, { id: m.id, titulo: m.titulo, orden: m.orden, fase: m.fase, raps: [] });
    });

    const rapsMap = new Map();
    rapsRes.rows.forEach(row => {
      if (!rapsMap.has(row.rap_id)) {
        rapsMap.set(row.rap_id, {
          id: row.rap_id, titulo: row.rap_titulo, orden: row.rap_orden,
          modulo_id: row.modulo_id, momentos: []
        });
      }
      const rap = rapsMap.get(row.rap_id);
      const momentoExiste = rap.momentos.find(mo => mo.rap_momento_id === row.rap_momento_id);
      if (!momentoExiste) {
        rap.momentos.push({
          rap_momento_id:  row.rap_momento_id,
          momento_id:      row.momento_id,
          nombre:          row.momento_nombre,
          codigo:          row.momento_codigo,
          orden:           row.momento_orden,
          actividades:     actividadesByMomento[row.rap_momento_id] || [],
          total_actividades: (actividadesByMomento[row.rap_momento_id] || []).length,
          contenidos:        contenidosByMomento[row.rap_momento_id] || [],
          total_contenidos:  (contenidosByMomento[row.rap_momento_id] || []).length
        });
      }
    });

    // Asignar RAPs a sus Módulos
    rapsMap.forEach(rap => {
      const modulo = modulosMap.get(rap.modulo_id);
      if (modulo) modulo.raps.push(rap);
    });

    // Ordenar RAPs y Momentos dentro de cada módulo
    modulosMap.forEach(m => {
      m.raps.sort((a, b) => a.orden - b.orden);
      m.raps.forEach(r => r.momentos.sort((a, b) => a.orden - b.orden));
    });

    res.json({
      ficha: {
        id: ficha.id,
        numero_ficha: ficha.numero_ficha,
        programa_id: ficha.programa_id,
        programa_nombre: ficha.programa_nombre
      },
      modulos: Array.from(modulosMap.values()).sort((a, b) => a.orden - b.orden)
    });
  } catch (err) {
    console.error('Error obteniendo estructura de ficha:', err);
    res.status(500).json({ error: 'Error al obtener la estructura de la ficha' });
  }
});

// ══════════════════════════════════════════════════════════════════════
// POST /api/instructor/ficha/:fichaId/rap-momento/:rapMomentoId/actividades
// Crea una actividad en un momento específico de un RAP, para una ficha
// ══════════════════════════════════════════════════════════════════════
router.post('/api/instructor/ficha/:fichaId/rap-momento/:rapMomentoId/actividades', async (req, res) => {
  const { fichaId, rapMomentoId } = req.params;
  const { tipo, titulo, instrucciones, datos_json, obligatoria } = req.body;
  const instructorId = req.user.id;

  if (!tipo || !titulo) {
    return res.status(400).json({ error: 'tipo y titulo son obligatorios' });
  }

  // El contenido de la actividad debe cumplir el contrato de su tipo. Sin esto,
  // una actividad sin clave de corrección se calificaba con un 100 automático.
  const validacion = validarActividad(tipo, datos_json);
  if (!validacion.valido) {
    return res.status(400).json({
      error: 'La actividad no está completa',
      detalles: validacion.errores
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que la ficha existe
    const fichaCheck = await client.query('SELECT id, programa_id FROM fichas WHERE id = $1', [fichaId]);
    if (fichaCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ficha no encontrada' });
    }
    if (!(await gestionaFicha(client, req.user, fichaId))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Esta ficha no está asignada a tu cuenta' });
    }

    // Verificar que el rap_momento existe y pertenece al programa de la ficha
    const momentoCheck = await client.query(
      `SELECT rm.id, mo.orden AS momento_orden
         FROM rap_momentos rm
         JOIN raps r ON r.id = rm.rap_id
         JOIN momentos mo ON mo.id = rm.momento_id
        WHERE rm.id = $1 AND r.programa_id = $2`,
      [rapMomentoId, fichaCheck.rows[0].programa_id]
    );
    if (momentoCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'El momento del RAP no pertenece al programa de esta ficha' });
    }

    // Cada momento cumple una función distinta: preparación solo material,
    // absorción ejercicios de práctica, práctica cuestionarios y cierre la
    // actividad evaluativa.
    const veredicto = permitidoEnMomento(momentoCheck.rows[0].momento_orden, tipo);
    if (!veredicto.permitido) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: veredicto.motivo, detalles: [veredicto.motivo] });
    }

    // Obtener el siguiente orden disponible en este momento
    const ordenRes = await client.query(
      `SELECT COALESCE(MAX(rma.orden), 0) + 1 AS siguiente_orden
       FROM rap_momento_actividades rma
       JOIN actividades a ON a.id = rma.actividad_id
       WHERE rma.rap_momento_id = $1 AND a.ficha_id = $2`,
      [rapMomentoId, fichaId]
    );
    const siguienteOrden = ordenRes.rows[0].siguiente_orden;

    // Crear la actividad con ficha_id correcto
    const actividadRes = await client.query(
      `INSERT INTO actividades (ficha_id, tipo, titulo, instrucciones, datos_json, obligatoria, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, ficha_id, tipo, titulo, instrucciones, datos_json, obligatoria, fecha_creacion`,
      [fichaId, tipo, titulo, instrucciones || null,
       JSON.stringify(validacion.datos),
       obligatoria !== false, instructorId]
    );
    const actividad = actividadRes.rows[0];

    // Vincular la actividad al rap_momento
    await client.query(
      `INSERT INTO rap_momento_actividades (rap_momento_id, actividad_id, ficha_id, orden)
       VALUES ($1, $2, $3, $4)`,
      [rapMomentoId, actividad.id, fichaId, siguienteOrden]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      actividad: {
        ...actividad,
        rap_momento_id: parseInt(rapMomentoId),
        orden: siguienteOrden
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creando actividad:', err);
    res.status(500).json({ error: 'Error al crear la actividad' });
  } finally {
    client.release();
  }
});

// ══════════════════════════════════════════════════════════════════════
// PUT /api/instructor/actividades/:id
// Editar una actividad (solo si pertenece a una ficha del instructor)
// ══════════════════════════════════════════════════════════════════════
router.put('/api/instructor/actividades/:id', async (req, res) => {
  const { id } = req.params;
  const { titulo, instrucciones, datos_json, obligatoria } = req.body;
  const instructorId = req.user.id;
  const userRol = req.user.rol;

  try {
    // Verificar ownership: la actividad debe ser de una ficha asignada a este instructor (o ser admin)
    let ownerCheck;
    if (userRol === 'admin' || userRol === 'administrador') {
      ownerCheck = await pool.query('SELECT id FROM actividades WHERE id = $1', [id]);
    } else {
      ownerCheck = await pool.query(
        `SELECT a.id FROM actividades a
         JOIN instructor_ficha ifi ON ifi.ficha_id = a.ficha_id
         WHERE a.id = $1 AND ifi.instructor_id = $2`,
        [id, instructorId]
      );
    }
    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes permisos para editar esta actividad' });
    }

    // Si se cambia el contenido, vuelve a validarse contra el tipo real.
    let datosValidados = null;
    if (datos_json !== undefined && datos_json !== null) {
      const tipoActual = await pool.query('SELECT tipo::text FROM actividades WHERE id = $1', [id]);
      const validacion = validarActividad(tipoActual.rows[0].tipo, datos_json);
      if (!validacion.valido) {
        return res.status(400).json({ error: 'La actividad no está completa', detalles: validacion.errores });
      }
      datosValidados = validacion.datos;
    }

    const result = await pool.query(
      `UPDATE actividades
       SET titulo       = COALESCE($1, titulo),
           instrucciones = COALESCE($2, instrucciones),
           datos_json   = COALESCE($3::jsonb, datos_json),
           obligatoria  = COALESCE($4, obligatoria),
           fecha_actualizacion = NOW(),
           actualizado_por = $6
       WHERE id = $5
       RETURNING id, titulo, tipo, instrucciones, datos_json, obligatoria, ficha_id`,
      [titulo, instrucciones,
       datosValidados ? JSON.stringify(datosValidados) : null,
       obligatoria, id, instructorId]
    );

    res.json({ success: true, actividad: result.rows[0] });
  } catch (err) {
    console.error('Error editando actividad:', err);
    res.status(500).json({ error: 'Error al editar la actividad' });
  }
});

// ══════════════════════════════════════════════════════════════════════
// DELETE /api/instructor/actividades/:id
// Eliminar una actividad (con todas sus vinculaciones e intentos)
// ══════════════════════════════════════════════════════════════════════
router.delete('/api/instructor/actividades/:id', async (req, res) => {
  const { id } = req.params;
  const instructorId = req.user.id;
  const userRol = req.user.rol;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar ownership
    let ownerCheck;
    if (userRol === 'admin' || userRol === 'administrador') {
      ownerCheck = await client.query('SELECT id FROM actividades WHERE id = $1', [id]);
    } else {
      ownerCheck = await client.query(
        `SELECT a.id FROM actividades a
         JOIN instructor_ficha ifi ON ifi.ficha_id = a.ficha_id
         WHERE a.id = $1 AND ifi.instructor_id = $2`,
        [id, instructorId]
      );
    }
    if (ownerCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'No tienes permisos para eliminar esta actividad' });
    }

    // Eliminar en orden correcto (foreign keys)
    // NOTA: retroalimentacion_instructor.resultado_actividad_id apunta a la tabla
    // resultados_actividades, que la migracion 001 elimina. No hay forma valida de
    // relacionarla con calificacion_oficial_actividad (clave primaria compuesta, sin
    // columna id). Se rehace al reapuntar la FK en la migracion de la fase 1.
    await client.query('DELETE FROM calificacion_oficial_actividad WHERE actividad_id = $1', [id]);
    await client.query('DELETE FROM intentos_actividad WHERE actividad_id = $1', [id]);
    await client.query('DELETE FROM registro_puntos WHERE actividad_id = $1', [id]);
    await client.query('DELETE FROM rap_momento_actividades WHERE actividad_id = $1', [id]);
    await client.query('DELETE FROM actividades WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error eliminando actividad:', err);
    res.status(500).json({ error: 'Error al eliminar la actividad' });
  } finally {
    client.release();
  }
});

// ══════════════════════════════════════════════════════════════════════
// POST /api/instructor/ficha/:fichaId/rap-momento/:rapMomentoId/contenidos
// Crear un contenido (texto/recurso) en un momento de un RAP
// ══════════════════════════════════════════════════════════════════════
router.post('/api/instructor/ficha/:fichaId/rap-momento/:rapMomentoId/contenidos', async (req, res) => {
  const { fichaId, rapMomentoId } = req.params;
  const { titulo, cuerpo_texto, recurso_id, datos_json } = req.body;
  const instructorId = req.user.id;

  if (!titulo) return res.status(400).json({ error: 'titulo es obligatorio' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar ficha y momento
    const fichaCheck = await client.query('SELECT id, programa_id FROM fichas WHERE id = $1', [fichaId]);
    if (fichaCheck.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Ficha no encontrada' }); }
    if (!(await gestionaFicha(client, req.user, fichaId))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Esta ficha no está asignada a tu cuenta' });
    }

    const momentoCheck = await client.query(
      `SELECT rm.id FROM rap_momentos rm JOIN raps r ON r.id = rm.rap_id WHERE rm.id = $1 AND r.programa_id = $2`,
      [rapMomentoId, fichaCheck.rows[0].programa_id]
    );
    if (momentoCheck.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Momento no valido para esta ficha' }); }

    // Siguiente orden en este momento
    const ordenRes = await client.query(
      `SELECT COALESCE(MAX(rmc.orden), 0) + 1 AS siguiente_orden
       FROM rap_momento_contenidos rmc
       JOIN contenidos c ON c.id = rmc.contenido_id
       WHERE rmc.rap_momento_id = $1 AND c.ficha_id = $2`,
      [rapMomentoId, fichaId]
    );

    // Crear contenido
    const contenidoRes = await client.query(
      `INSERT INTO contenidos (ficha_id, titulo, cuerpo_texto, recurso_id, datos_json, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, titulo, cuerpo_texto, recurso_id, datos_json, fecha_creacion`,
      [fichaId, titulo, cuerpo_texto || null, recurso_id || null,
       datos_json ? JSON.stringify(normalizarDatosDeContenido(datos_json)) : null, instructorId]
    );
    const contenido = contenidoRes.rows[0];

    // Vincular al momento
    await client.query(
      `INSERT INTO rap_momento_contenidos (rap_momento_id, contenido_id, ficha_id, orden) VALUES ($1, $2, $3, $4)`,
      [rapMomentoId, contenido.id, fichaId, ordenRes.rows[0].siguiente_orden]
    );

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      contenido: { ...contenido, rap_momento_id: parseInt(rapMomentoId) }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creando contenido:', err);
    res.status(500).json({ error: 'Error al crear el contenido' });
  } finally {
    client.release();
  }
});

// ══════════════════════════════════════════════════════════════════════
// PUT /api/instructor/contenidos/:id — Editar contenido
// DELETE /api/instructor/contenidos/:id — Eliminar contenido
// ══════════════════════════════════════════════════════════════════════
router.put('/api/instructor/contenidos/:id', async (req, res) => {
  const { id } = req.params;
  const { titulo, cuerpo_texto, recurso_id, datos_json } = req.body;
  const instructorId = req.user.id;
  const userRol = req.user.rol;

  try {
    let ownerCheck;
    if (userRol === 'admin' || userRol === 'administrador') {
      ownerCheck = await pool.query('SELECT id FROM contenidos WHERE id = $1', [id]);
    } else {
      ownerCheck = await pool.query(
        `SELECT c.id FROM contenidos c JOIN instructor_ficha ifi ON ifi.ficha_id = c.ficha_id WHERE c.id = $1 AND ifi.instructor_id = $2`,
        [id, instructorId]
      );
    }
    if (ownerCheck.rows.length === 0) return res.status(403).json({ error: 'No tienes permisos para editar este contenido' });

    const result = await pool.query(
      `UPDATE contenidos
          SET titulo = COALESCE($1, titulo),
              cuerpo_texto = COALESCE($2, cuerpo_texto),
              recurso_id = COALESCE($3, recurso_id),
              datos_json = COALESCE($4::jsonb, datos_json),
              fecha_actualizacion = NOW(),
              actualizado_por = $6
        WHERE id = $5 RETURNING *`,
      [titulo, cuerpo_texto, recurso_id || null,
       datos_json ? JSON.stringify(normalizarDatosDeContenido(datos_json)) : null, id, instructorId]
    );
    res.json({ success: true, contenido: result.rows[0] });
  } catch (err) {
    console.error('Error editando contenido:', err);
    res.status(500).json({ error: 'Error al editar el contenido' });
  }
});

router.delete('/api/instructor/contenidos/:id', async (req, res) => {
  const { id } = req.params;
  const instructorId = req.user.id;
  const userRol = req.user.rol;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let ownerCheck;
    if (userRol === 'admin' || userRol === 'administrador') {
      ownerCheck = await client.query('SELECT id FROM contenidos WHERE id = $1', [id]);
    } else {
      ownerCheck = await client.query(
        `SELECT c.id FROM contenidos c JOIN instructor_ficha ifi ON ifi.ficha_id = c.ficha_id WHERE c.id = $1 AND ifi.instructor_id = $2`,
        [id, instructorId]
      );
    }
    if (ownerCheck.rows.length === 0) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'No tienes permisos para eliminar este contenido' }); }
    await client.query('DELETE FROM rap_momento_contenidos WHERE contenido_id = $1', [id]);
    await client.query('DELETE FROM contenidos WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error eliminando contenido:', err);
    res.status(500).json({ error: 'Error al eliminar el contenido' });
  } finally {
    client.release();
  }
});

export default router;
