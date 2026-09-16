import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { recalcularProgresoAprendiz } from '../services/progress.service.js';
import {
  abrirTransaccion, revertir, cerrarPool, crearEscenario, registrarNota,
  anadirObligatoria, vincularActividadA, progresoRap, progresoModulo
} from './fixtures.js';

after(cerrarPool);

/** Ejecuta el cuerpo dentro de una transacción que siempre se revierte. */
const enTransaccion = (fn) => async () => {
  const client = await abrirTransaccion();
  try { await fn(client); } finally { await revertir(client); }
};

describe('Avance del RAP', () => {
  test('sin nada aprobado, el avance es 0', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 1, obligatoriasPorRap: 2 });
    const act = e.actividadesPorRap[e.rapIds[0]][0];
    await recalcularProgresoAprendiz(c, e.aprendizId, act.id);
    const p = await progresoRap(c, e.rapIds[0], e.aprendizId);
    assert.equal(Number(p.porcentaje), 0);
    assert.equal(Number(p.actividades_totales), 2);
  }));

  test('una de dos obligatorias aprobadas da 50', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 1, obligatoriasPorRap: 2 });
    const acts = e.actividadesPorRap[e.rapIds[0]];
    await registrarNota(c, acts[0].id, e.aprendizId, 80);
    await recalcularProgresoAprendiz(c, e.aprendizId, acts[0].id);
    const p = await progresoRap(c, e.rapIds[0], e.aprendizId);
    assert.equal(Number(p.porcentaje), 50);
    assert.equal(p.estado, 'en_progreso');
  }));

  test('todas aprobadas dan 100 y completado', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 1, obligatoriasPorRap: 2, excelencia: 95 });
    const acts = e.actividadesPorRap[e.rapIds[0]];
    for (const a of acts) await registrarNota(c, a.id, e.aprendizId, 80);
    await recalcularProgresoAprendiz(c, e.aprendizId, acts[0].id);
    const p = await progresoRap(c, e.rapIds[0], e.aprendizId);
    assert.equal(Number(p.porcentaje), 100);
    assert.equal(p.estado, 'completado');
    assert.notEqual(p.fecha_completado, null);
  }));

  test('con la nota media por encima del umbral, el estado es excelencia', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 1, obligatoriasPorRap: 2, excelencia: 90 });
    const acts = e.actividadesPorRap[e.rapIds[0]];
    for (const a of acts) await registrarNota(c, a.id, e.aprendizId, 95);
    await recalcularProgresoAprendiz(c, e.aprendizId, acts[0].id);
    const p = await progresoRap(c, e.rapIds[0], e.aprendizId);
    assert.equal(p.estado, 'excelencia');
    assert.equal(Number(p.nota_promedio), 95);
  }));

  test('el umbral de excelencia sale de la configuración del programa', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 1, obligatoriasPorRap: 1, excelencia: 99 });
    const acts = e.actividadesPorRap[e.rapIds[0]];
    await registrarNota(c, acts[0].id, e.aprendizId, 95);
    await recalcularProgresoAprendiz(c, e.aprendizId, acts[0].id);
    const p = await progresoRap(c, e.rapIds[0], e.aprendizId);
    assert.equal(p.estado, 'completado', 'con umbral 99, un 95 no es excelencia');
  }));

  test('las actividades opcionales no afectan al porcentaje (RN-11)', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 1, obligatoriasPorRap: 1, opcionalesPorRap: 3 });
    const acts = e.actividadesPorRap[e.rapIds[0]];
    await registrarNota(c, acts[0].id, e.aprendizId, 100);
    await recalcularProgresoAprendiz(c, e.aprendizId, acts[0].id);
    const p = await progresoRap(c, e.rapIds[0], e.aprendizId);
    assert.equal(Number(p.actividades_totales), 1);
    assert.equal(Number(p.porcentaje), 100);
  }));

  test('una nota por debajo del umbral no cuenta como aprobada', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 1, obligatoriasPorRap: 2 });
    const acts = e.actividadesPorRap[e.rapIds[0]];
    await registrarNota(c, acts[0].id, e.aprendizId, 69);
    await recalcularProgresoAprendiz(c, e.aprendizId, acts[0].id);
    const p = await progresoRap(c, e.rapIds[0], e.aprendizId);
    assert.equal(Number(p.porcentaje), 0);
  }));

  test('un RAP sin obligatorias no da 100 ni divide por cero', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 1, obligatoriasPorRap: 0, opcionalesPorRap: 2 });
    const acts = e.actividadesPorRap[e.rapIds[0]];
    await recalcularProgresoAprendiz(c, e.aprendizId, acts[0].id);
    const p = await progresoRap(c, e.rapIds[0], e.aprendizId);
    assert.equal(Number(p.actividades_totales), 0);
    assert.equal(Number(p.porcentaje), 0);
    assert.equal(p.estado, 'disponible');
  }));
});

describe('Monotonía del avance (RN-08, RN-22, cap. 7.4)', () => {
  test('ampliar el temario baja el porcentaje vigente pero no el alcanzado', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 1, obligatoriasPorRap: 2, excelencia: 95 });
    const acts = e.actividadesPorRap[e.rapIds[0]];
    for (const a of acts) await registrarNota(c, a.id, e.aprendizId, 80);
    await recalcularProgresoAprendiz(c, e.aprendizId, acts[0].id);

    const nueva = await anadirObligatoria(c, {
      rapId: e.rapIds[0], fichaId: e.fichaId, instructorId: e.instructorId
    });
    await recalcularProgresoAprendiz(c, e.aprendizId, nueva);

    const p = await progresoRap(c, e.rapIds[0], e.aprendizId);
    assert.equal(Number(p.porcentaje), 66.67, 'el avance sobre el temario vigente baja');
    assert.equal(Number(p.porcentaje_maximo), 100, 'el avance alcanzado NO baja');
    assert.equal(p.estado, 'completado', 'el estado no retrocede');
    assert.notEqual(p.fecha_completado, null, 'la fecha de finalización se conserva');
  }));

  test('el estado nunca desciende aunque el porcentaje caiga a 0', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 1, obligatoriasPorRap: 1, excelencia: 95 });
    const acts = e.actividadesPorRap[e.rapIds[0]];
    await registrarNota(c, acts[0].id, e.aprendizId, 100);
    await recalcularProgresoAprendiz(c, e.aprendizId, acts[0].id);
    const antes = await progresoRap(c, e.rapIds[0], e.aprendizId);

    // El instructor retira la aprobación (caso extremo).
    await c.query('UPDATE calificacion_oficial_actividad SET aprobada = false WHERE actividad_id = $1', [acts[0].id]);
    await recalcularProgresoAprendiz(c, e.aprendizId, acts[0].id);

    const p = await progresoRap(c, e.rapIds[0], e.aprendizId);
    assert.equal(Number(p.porcentaje), 0, 'el avance vigente cae a 0');
    assert.equal(Number(p.porcentaje_maximo), 100, 'el avance alcanzado se conserva');
    assert.equal(p.estado, antes.estado, 'el estado se mantiene en su máximo histórico');
  }));

  test('repetir con peor nota no altera el avance', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 1, obligatoriasPorRap: 1 });
    const acts = e.actividadesPorRap[e.rapIds[0]];
    await registrarNota(c, acts[0].id, e.aprendizId, 90);
    await recalcularProgresoAprendiz(c, e.aprendizId, acts[0].id);
    const antes = await progresoRap(c, e.rapIds[0], e.aprendizId);

    await registrarNota(c, acts[0].id, e.aprendizId, 20);   // GREATEST conserva 90
    await recalcularProgresoAprendiz(c, e.aprendizId, acts[0].id);
    const despues = await progresoRap(c, e.rapIds[0], e.aprendizId);

    assert.equal(Number(despues.porcentaje), Number(antes.porcentaje));
    assert.equal(Number(despues.nota_promedio), 90);
  }));
});

describe('Actividades reutilizadas en varios RAP (RN-39)', () => {
  test('recalcula TODOS los RAP donde está la actividad, no solo el primero', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 2, obligatoriasPorRap: 1 });
    const compartida = e.actividadesPorRap[e.rapIds[0]][0];
    await vincularActividadA(c, { actividadId: compartida.id, rapId: e.rapIds[1], fichaId: e.fichaId });
    await registrarNota(c, compartida.id, e.aprendizId, 100);

    const alcance = await recalcularProgresoAprendiz(c, e.aprendizId, compartida.id);
    assert.equal(alcance.raps.length, 2, 'el alcance del recálculo cubre los dos RAP');

    const p1 = await progresoRap(c, e.rapIds[0], e.aprendizId);
    const p2 = await progresoRap(c, e.rapIds[1], e.aprendizId);
    assert.equal(Number(p1.porcentaje), 100);
    assert.equal(Number(p2.porcentaje), 50, 'el segundo RAP tiene 1 de sus 2 obligatorias aprobada');
  }));

  test('un RAP en dos módulos actualiza ambos', enTransaccion(async (c) => {
    // Dos módulos que comparten el RAP 0
    const e = await crearEscenario(c, { raps: 1, obligatoriasPorRap: 1, modulos: [[0], [0]] });
    const act = e.actividadesPorRap[e.rapIds[0]][0];
    await registrarNota(c, act.id, e.aprendizId, 100);
    const alcance = await recalcularProgresoAprendiz(c, e.aprendizId, act.id);

    assert.equal(alcance.modulos.length, 2);
    for (const moduloId of e.moduloIds) {
      const pm = await progresoModulo(c, moduloId, e.aprendizId);
      assert.equal(Number(pm.porcentaje), 100);
    }
  }));
});

describe('Avance del módulo como agregación de sus RAP', () => {
  test('el módulo promedia el avance de sus RAP', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 2, obligatoriasPorRap: 2, modulos: [[0, 1]] });
    // RAP 0 completo, RAP 1 a la mitad → módulo al 75
    for (const a of e.actividadesPorRap[e.rapIds[0]]) await registrarNota(c, a.id, e.aprendizId, 100);
    await registrarNota(c, e.actividadesPorRap[e.rapIds[1]][0].id, e.aprendizId, 100);

    await recalcularProgresoAprendiz(c, e.aprendizId, e.actividadesPorRap[e.rapIds[0]][0].id);
    await recalcularProgresoAprendiz(c, e.aprendizId, e.actividadesPorRap[e.rapIds[1]][0].id);

    const pm = await progresoModulo(c, e.moduloIds[0], e.aprendizId);
    assert.equal(Number(pm.porcentaje), 75);
    assert.equal(Number(pm.raps_completados), 1);
    assert.equal(Number(pm.raps_totales), 2);
    assert.equal(pm.estado, 'en_progreso');
  }));

  test('el módulo se completa cuando todos sus RAP llegan al 100', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 2, obligatoriasPorRap: 1, modulos: [[0, 1]] });
    for (const rapId of e.rapIds) {
      for (const a of e.actividadesPorRap[rapId]) await registrarNota(c, a.id, e.aprendizId, 100);
      await recalcularProgresoAprendiz(c, e.aprendizId, e.actividadesPorRap[rapId][0].id);
    }
    const pm = await progresoModulo(c, e.moduloIds[0], e.aprendizId);
    assert.equal(Number(pm.porcentaje), 100);
    assert.equal(pm.estado, 'completado');
  }));
});

describe('Aislamiento entre aprendices y fichas', () => {
  test('el avance de un aprendiz no contamina al de otro', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 1, obligatoriasPorRap: 2 });
    const otro = (await c.query(
      `INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo)
       VALUES ('Otro', $1, 'x', 'aprendiz', true) RETURNING id`,
      [`otro-${Date.now()}@prueba.local`]
    )).rows[0];
    await c.query('INSERT INTO aprendiz_ficha (aprendiz_id, ficha_id) VALUES ($1, $2)', [otro.id, e.fichaId]);

    const acts = e.actividadesPorRap[e.rapIds[0]];
    await registrarNota(c, acts[0].id, e.aprendizId, 100);
    await recalcularProgresoAprendiz(c, e.aprendizId, acts[0].id);
    await recalcularProgresoAprendiz(c, otro.id, acts[0].id);

    assert.equal(Number((await progresoRap(c, e.rapIds[0], e.aprendizId)).porcentaje), 50);
    assert.equal(Number((await progresoRap(c, e.rapIds[0], otro.id)).porcentaje), 0);
  }));

  test('solo cuentan las actividades de las fichas del aprendiz', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 1, obligatoriasPorRap: 1 });
    // Otra ficha del mismo programa, con su propia actividad en el mismo momento
    const otraFicha = (await c.query(
      `INSERT INTO fichas (programa_id, numero_ficha, fecha_inicio, fecha_fin, activo)
       VALUES ($1, $2, '2026-01-01', '2026-12-31', true) RETURNING id`,
      [e.programaId, `F2-${Date.now()}`]
    )).rows[0];
    const rapMomento = (await c.query(
      'SELECT id FROM rap_momentos WHERE rap_id = $1 ORDER BY orden LIMIT 1', [e.rapIds[0]]
    )).rows[0];
    const ajena = (await c.query(
      `INSERT INTO actividades (ficha_id, tipo, titulo, obligatoria, creado_por)
       VALUES ($1, 'quiz', 'De otra ficha', true, $2) RETURNING id`,
      [otraFicha.id, e.instructorId]
    )).rows[0];
    await c.query(
      `INSERT INTO rap_momento_actividades (rap_momento_id, actividad_id, ficha_id, orden)
       VALUES ($1, $2, $3, 1)`,
      [rapMomento.id, ajena.id, otraFicha.id]
    );

    await registrarNota(c, e.actividadesPorRap[e.rapIds[0]][0].id, e.aprendizId, 100);
    await recalcularProgresoAprendiz(c, e.aprendizId, e.actividadesPorRap[e.rapIds[0]][0].id);

    const p = await progresoRap(c, e.rapIds[0], e.aprendizId);
    assert.equal(Number(p.actividades_totales), 1, 'la actividad de la otra ficha no entra en el denominador');
    assert.equal(Number(p.porcentaje), 100);
  }));
});
