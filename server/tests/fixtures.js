import pool from '../db.js';

/**
 * Escenario académico aislado para pruebas.
 *
 * Todo se crea dentro de una transacción que la prueba revierte al terminar, así
 * que las pruebas no dependen del contenido sembrado ni se pisan entre sí. Los
 * nombres llevan sufijo aleatorio porque varias tablas tienen restricciones de
 * unicidad global (correo, numero_ficha, nombre de programa).
 */

let contador = 0;
const sufijo = () => `t${Date.now().toString(36)}${(contador += 1)}`;

export async function abrirTransaccion() {
  const client = await pool.connect();
  await client.query('BEGIN');
  return client;
}

export async function revertir(client) {
  await client.query('ROLLBACK');
  client.release();
}

export async function cerrarPool() {
  await pool.end();
}

/**
 * @param {import('pg').PoolClient} client
 * @param {{ raps?: number, obligatoriasPorRap?: number, opcionalesPorRap?: number,
 *           excelencia?: number, aprobacion?: number, modulos?: number[][] }} opciones
 *   modulos: agrupación de RAP por módulo, por índice. Por defecto un módulo por RAP.
 */
export async function crearEscenario(client, opciones = {}) {
  const {
    raps: numRaps = 2,
    obligatoriasPorRap = 2,
    opcionalesPorRap = 0,
    excelencia = 90,
    aprobacion = 70,
    modulos: agrupacion = null
  } = opciones;

  const s = sufijo();

  const momentos = (await client.query('SELECT id, orden FROM momentos ORDER BY orden ASC')).rows;
  if (momentos.length === 0) throw new Error('La base no tiene momentos: ejecuta el seed antes de las pruebas.');
  const fase = (await client.query('SELECT id FROM fases ORDER BY orden ASC LIMIT 1')).rows[0];

  const programa = (await client.query(
    `INSERT INTO programas (nombre, activo) VALUES ($1, true) RETURNING id`,
    [`Programa prueba ${s}`]
  )).rows[0];

  await client.query(
    `INSERT INTO configuracion_programa (programa_id, porcentaje_aprobacion, porcentaje_excelencia)
     VALUES ($1, $2, $3)`,
    [programa.id, aprobacion, excelencia]
  );

  const ficha = (await client.query(
    `INSERT INTO fichas (programa_id, numero_ficha, fecha_inicio, fecha_fin, activo)
     VALUES ($1, $2, '2026-01-01', '2026-12-31', true) RETURNING id`,
    [programa.id, `F-${s}`]
  )).rows[0];

  const instructor = (await client.query(
    `INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo)
     VALUES ('Instructor prueba', $1, 'x', 'instructor', true) RETURNING id`,
    [`inst-${s}@prueba.local`]
  )).rows[0];

  const aprendiz = (await client.query(
    `INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo)
     VALUES ('Aprendiz prueba', $1, 'x', 'aprendiz', true) RETURNING id`,
    [`apr-${s}@prueba.local`]
  )).rows[0];

  await client.query(
    `INSERT INTO aprendiz_ficha (aprendiz_id, ficha_id) VALUES ($1, $2)`,
    [aprendiz.id, ficha.id]
  );

  // RAP con sus cuatro momentos
  const rapIds = [];
  for (let i = 1; i <= numRaps; i += 1) {
    const rap = (await client.query(
      `INSERT INTO raps (programa_id, titulo, orden) VALUES ($1, $2, $3) RETURNING id`,
      [programa.id, `RAP ${i} prueba`, i]
    )).rows[0];
    rapIds.push(rap.id);
    for (const m of momentos) {
      await client.query(
        `INSERT INTO rap_momentos (rap_id, momento_id, orden) VALUES ($1, $2, $3)`,
        [rap.id, m.id, m.orden]
      );
    }
  }

  // Módulos: por defecto uno por RAP
  const grupos = agrupacion || rapIds.map((_, i) => [i]);
  const moduloIds = [];
  for (let m = 0; m < grupos.length; m += 1) {
    const modulo = (await client.query(
      `INSERT INTO modulos (programa_id, fase_id, titulo, orden) VALUES ($1, $2, $3, $4) RETURNING id`,
      [programa.id, fase.id, `Modulo ${m + 1} prueba`, m + 1]
    )).rows[0];
    moduloIds.push(modulo.id);
    let orden = 1;
    for (const indiceRap of grupos[m]) {
      await client.query(
        `INSERT INTO modulo_rap (modulo_id, rap_id, orden) VALUES ($1, $2, $3)`,
        [modulo.id, rapIds[indiceRap], orden++]
      );
    }
  }

  // Actividades por RAP, colgadas del primer momento
  const actividadesPorRap = {};
  for (let i = 0; i < rapIds.length; i += 1) {
    const rapMomento = (await client.query(
      `SELECT id FROM rap_momentos WHERE rap_id = $1 ORDER BY orden ASC LIMIT 1`,
      [rapIds[i]]
    )).rows[0];

    actividadesPorRap[rapIds[i]] = [];
    const total = obligatoriasPorRap + opcionalesPorRap;
    for (let a = 1; a <= total; a += 1) {
      const obligatoria = a <= obligatoriasPorRap;
      const act = (await client.query(
        `INSERT INTO actividades (ficha_id, tipo, titulo, obligatoria, creado_por, datos_json)
         VALUES ($1, 'quiz', $2, $3, $4, $5) RETURNING id`,
        [ficha.id, `Actividad ${a} del RAP ${i + 1}`, obligatoria, instructor.id,
         JSON.stringify({ questions: [{ question: 'p', options: ['a', 'b'], correctAnswer: 1 }] })]
      )).rows[0];
      await client.query(
        `INSERT INTO rap_momento_actividades (rap_momento_id, actividad_id, ficha_id, orden)
         VALUES ($1, $2, $3, $4)`,
        [rapMomento.id, act.id, ficha.id, a]
      );
      actividadesPorRap[rapIds[i]].push({ id: act.id, obligatoria });
    }
  }

  return { programaId: programa.id, fichaId: ficha.id, aprendizId: aprendiz.id,
           instructorId: instructor.id, rapIds, moduloIds, actividadesPorRap };
}

/** Simula que el aprendiz aprobó (o suspendió) una actividad, sin pasar por la API. */
export async function registrarNota(client, actividadId, aprendizId, nota, umbral = 70) {
  await client.query(
    `INSERT INTO calificacion_oficial_actividad
       (actividad_id, aprendiz_id, mejor_calificacion, aprobada, numero_intentos, primer_intento_en)
     VALUES ($1, $2, $3, $4, 1, NOW())
     ON CONFLICT (actividad_id, aprendiz_id) DO UPDATE SET
       mejor_calificacion = GREATEST(calificacion_oficial_actividad.mejor_calificacion, EXCLUDED.mejor_calificacion),
       aprobada = calificacion_oficial_actividad.aprobada OR EXCLUDED.aprobada,
       numero_intentos = calificacion_oficial_actividad.numero_intentos + 1`,
    [actividadId, aprendizId, nota, nota >= umbral]
  );
}

/** Añade una actividad obligatoria a un RAP ya existente (simula al instructor). */
export async function anadirObligatoria(client, { rapId, fichaId, instructorId }) {
  const rapMomento = (await client.query(
    `SELECT id FROM rap_momentos WHERE rap_id = $1 ORDER BY orden ASC LIMIT 1`, [rapId]
  )).rows[0];
  const siguienteOrden = (await client.query(
    `SELECT COALESCE(MAX(orden), 0) + 1 AS n FROM rap_momento_actividades
      WHERE rap_momento_id = $1 AND ficha_id = $2`, [rapMomento.id, fichaId]
  )).rows[0].n;

  const act = (await client.query(
    `INSERT INTO actividades (ficha_id, tipo, titulo, obligatoria, creado_por)
     VALUES ($1, 'quiz', 'Obligatoria añadida después', true, $2) RETURNING id`,
    [fichaId, instructorId]
  )).rows[0];
  await client.query(
    `INSERT INTO rap_momento_actividades (rap_momento_id, actividad_id, ficha_id, orden)
     VALUES ($1, $2, $3, $4)`,
    [rapMomento.id, act.id, fichaId, siguienteOrden]
  );
  return act.id;
}

/** Vincula una actividad existente a otro RAP (reutilización entre RAP). */
export async function vincularActividadA(client, { actividadId, rapId, fichaId }) {
  const rapMomento = (await client.query(
    `SELECT id FROM rap_momentos WHERE rap_id = $1 ORDER BY orden ASC LIMIT 1`, [rapId]
  )).rows[0];
  const siguienteOrden = (await client.query(
    `SELECT COALESCE(MAX(orden), 0) + 1 AS n FROM rap_momento_actividades
      WHERE rap_momento_id = $1 AND ficha_id = $2`, [rapMomento.id, fichaId]
  )).rows[0].n;
  await client.query(
    `INSERT INTO rap_momento_actividades (rap_momento_id, actividad_id, ficha_id, orden)
     VALUES ($1, $2, $3, $4)`,
    [rapMomento.id, actividadId, fichaId, siguienteOrden]
  );
}

export async function progresoRap(client, rapId, aprendizId) {
  const r = await client.query(
    `SELECT * FROM progreso_rap_aprendiz WHERE rap_id = $1 AND aprendiz_id = $2`,
    [rapId, aprendizId]
  );
  return r.rows[0] || null;
}

export async function progresoModulo(client, moduloId, aprendizId) {
  const r = await client.query(
    `SELECT * FROM progreso_modulo_aprendiz WHERE modulo_id = $1 AND aprendiz_id = $2`,
    [moduloId, aprendizId]
  );
  return r.rows[0] || null;
}
