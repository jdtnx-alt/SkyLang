import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  puedeAccederRap, puedeAccederActividad, materializarProgreso,
  desbloquearSiguientes, debeAplicarBloqueo
} from '../services/access.service.js';
import { recalcularProgresoAprendiz } from '../services/progress.service.js';
import {
  abrirTransaccion, revertir, cerrarPool, crearEscenario, registrarNota, progresoRap
} from './fixtures.js';

after(cerrarPool);

const enTransaccion = (fn) => async () => {
  const client = await abrirTransaccion();
  try { await fn(client); } finally { await revertir(client); }
};

describe('Materialización del progreso al matricular', () => {
  test('el primer RAP nace disponible y el resto bloqueado', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 3, obligatoriasPorRap: 1 });
    await materializarProgreso(c, e.aprendizId, e.fichaId);

    const p1 = await progresoRap(c, e.rapIds[0], e.aprendizId);
    const p2 = await progresoRap(c, e.rapIds[1], e.aprendizId);
    const p3 = await progresoRap(c, e.rapIds[2], e.aprendizId);

    assert.equal(p1.estado, 'disponible');
    assert.notEqual(p1.desbloqueado_en, null);
    assert.equal(p2.estado, 'bloqueado');
    assert.equal(p2.desbloqueado_en, null);
    assert.equal(p3.estado, 'bloqueado');
  }));

  test('materializar dos veces no duplica ni reabre lo bloqueado', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 2, obligatoriasPorRap: 1 });
    await materializarProgreso(c, e.aprendizId, e.fichaId);
    await materializarProgreso(c, e.aprendizId, e.fichaId);
    const filas = await c.query(
      'SELECT COUNT(*)::int n FROM progreso_rap_aprendiz WHERE aprendiz_id = $1', [e.aprendizId]
    );
    assert.equal(filas.rows[0].n, 2);
    assert.equal((await progresoRap(c, e.rapIds[1], e.aprendizId)).estado, 'bloqueado');
  }));
});

describe('Autorización de acceso al RAP', () => {
  test('el primer RAP siempre está permitido', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 2, obligatoriasPorRap: 1 });
    await materializarProgreso(c, e.aprendizId, e.fichaId);
    const v = await puedeAccederRap(c, e.aprendizId, e.rapIds[0]);
    assert.equal(v.permitido, true);
  }));

  test('el segundo RAP está denegado con un motivo entendible', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 2, obligatoriasPorRap: 1 });
    await materializarProgreso(c, e.aprendizId, e.fichaId);
    const v = await puedeAccederRap(c, e.aprendizId, e.rapIds[1]);
    assert.equal(v.permitido, false);
    assert.match(v.motivo, /completar/i);
  }));

  test('un aprendiz no matriculado en el programa no accede', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 1, obligatoriasPorRap: 1 });
    const extrano = (await c.query(
      `INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo)
       VALUES ('Ajeno', $1, 'x', 'aprendiz', true) RETURNING id`,
      [`ajeno-${Date.now()}@prueba.local`]
    )).rows[0];
    const v = await puedeAccederRap(c, extrano.id, e.rapIds[0]);
    assert.equal(v.permitido, false);
    assert.match(v.motivo, /matriculado/i);
  }));

  test('un RAP inexistente se rechaza sin romper', enTransaccion(async (c) => {
    const v = await puedeAccederRap(c, 1, 99999999);
    assert.equal(v.permitido, false);
  }));

  test('el acceso a una actividad hereda el del RAP que la contiene', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 2, obligatoriasPorRap: 1 });
    await materializarProgreso(c, e.aprendizId, e.fichaId);
    const delPrimero = e.actividadesPorRap[e.rapIds[0]][0];
    const delSegundo = e.actividadesPorRap[e.rapIds[1]][0];

    assert.equal((await puedeAccederActividad(c, e.aprendizId, delPrimero.id)).permitido, true);
    assert.equal((await puedeAccederActividad(c, e.aprendizId, delSegundo.id)).permitido, false);
  }));

  test('el bloqueo solo se aplica a los aprendices', () => {
    assert.equal(debeAplicarBloqueo('aprendiz'), true);
    assert.equal(debeAplicarBloqueo('instructor'), false);
    assert.equal(debeAplicarBloqueo('admin'), false);
  });
});

describe('Desbloqueo automático del RAP siguiente (CU-08)', () => {
  test('completar un RAP abre el siguiente y solo el siguiente', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 3, obligatoriasPorRap: 1 });
    await materializarProgreso(c, e.aprendizId, e.fichaId);

    const act = e.actividadesPorRap[e.rapIds[0]][0];
    await registrarNota(c, act.id, e.aprendizId, 100);
    const alcance = await recalcularProgresoAprendiz(c, e.aprendizId, act.id);

    assert.deepEqual(alcance.desbloqueados, [e.rapIds[1]]);
    assert.equal((await progresoRap(c, e.rapIds[1], e.aprendizId)).estado, 'disponible');
    assert.equal((await progresoRap(c, e.rapIds[2], e.aprendizId)).estado, 'bloqueado');
  }));

  test('un RAP a medias no desbloquea nada', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 2, obligatoriasPorRap: 2 });
    await materializarProgreso(c, e.aprendizId, e.fichaId);

    const acts = e.actividadesPorRap[e.rapIds[0]];
    await registrarNota(c, acts[0].id, e.aprendizId, 100);
    const alcance = await recalcularProgresoAprendiz(c, e.aprendizId, acts[0].id);

    assert.deepEqual(alcance.desbloqueados, []);
    assert.equal((await progresoRap(c, e.rapIds[1], e.aprendizId)).estado, 'bloqueado');
  }));

  test('recalcular no levanta por su cuenta un RAP bloqueado', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 2, obligatoriasPorRap: 1 });
    await materializarProgreso(c, e.aprendizId, e.fichaId);

    // Se fuerza un recálculo del RAP 2 sin haber completado el 1.
    const act = e.actividadesPorRap[e.rapIds[1]][0];
    await recalcularProgresoAprendiz(c, e.aprendizId, act.id);

    assert.equal((await progresoRap(c, e.rapIds[1], e.aprendizId)).estado, 'bloqueado',
      'el estado bloqueado solo lo levanta el desbloqueo explícito');
  }));

  test('el desbloqueo registra la fecha, para poder auditarlo y notificarlo', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 2, obligatoriasPorRap: 1 });
    await materializarProgreso(c, e.aprendizId, e.fichaId);
    const act = e.actividadesPorRap[e.rapIds[0]][0];
    await registrarNota(c, act.id, e.aprendizId, 100);
    await recalcularProgresoAprendiz(c, e.aprendizId, act.id);

    const p2 = await progresoRap(c, e.rapIds[1], e.aprendizId);
    assert.notEqual(p2.desbloqueado_en, null);
  }));

  test('desbloquea aunque el progreso no estuviera materializado', enTransaccion(async (c) => {
    // Caso de una base recién creada: el aprendiz no tiene filas de progreso.
    // Con un UPDATE a secas, completaba el RAP y el siguiente no se abría nunca.
    const e = await crearEscenario(c, { raps: 2, obligatoriasPorRap: 1 });
    const sinFilas = await c.query(
      'SELECT COUNT(*)::int n FROM progreso_rap_aprendiz WHERE aprendiz_id = $1', [e.aprendizId]
    );
    assert.equal(sinFilas.rows[0].n, 0, 'de partida no hay ninguna fila');

    const act = e.actividadesPorRap[e.rapIds[0]][0];
    await registrarNota(c, act.id, e.aprendizId, 100);
    const alcance = await recalcularProgresoAprendiz(c, e.aprendizId, act.id);

    assert.deepEqual(alcance.desbloqueados, [e.rapIds[1]]);
    const p2 = await progresoRap(c, e.rapIds[1], e.aprendizId);
    assert.equal(p2.estado, 'disponible');
    assert.notEqual(p2.desbloqueado_en, null);
    assert.equal((await puedeAccederRap(c, e.aprendizId, e.rapIds[1])).permitido, true);
  }));

  test('desbloquear dos veces es idempotente', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 2, obligatoriasPorRap: 1 });
    await materializarProgreso(c, e.aprendizId, e.fichaId);
    const act = e.actividadesPorRap[e.rapIds[0]][0];
    await registrarNota(c, act.id, e.aprendizId, 100);
    await recalcularProgresoAprendiz(c, e.aprendizId, act.id);

    const segunda = await desbloquearSiguientes(c, e.aprendizId, [e.rapIds[0]]);
    assert.deepEqual(segunda, [], 'ya estaba abierto: no vuelve a tocarlo');
  }));

  test('cuando el RAP se completa, el aprendiz puede entrar al siguiente', enTransaccion(async (c) => {
    const e = await crearEscenario(c, { raps: 2, obligatoriasPorRap: 1 });
    await materializarProgreso(c, e.aprendizId, e.fichaId);
    assert.equal((await puedeAccederRap(c, e.aprendizId, e.rapIds[1])).permitido, false);

    const act = e.actividadesPorRap[e.rapIds[0]][0];
    await registrarNota(c, act.id, e.aprendizId, 100);
    await recalcularProgresoAprendiz(c, e.aprendizId, act.id);

    assert.equal((await puedeAccederRap(c, e.aprendizId, e.rapIds[1])).permitido, true);
  }));
});
