import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calificarIntento, enunciadoSeguro, esAutoCalificable } from '../services/grading.service.js';

const quiz = (correctas) => ({
  tipo: 'quiz',
  datos_json: {
    questions: correctas.map((c, i) => ({
      question: `Pregunta ${i + 1}`,
      options: ['a', 'b', 'c', 'd'],
      correctAnswer: c
    }))
  }
});

describe('Calificación de opción múltiple', () => {
  test('todas correctas da 100', () => {
    const r = calificarIntento(quiz([1, 2]), { respuestas: [1, 2] });
    assert.equal(r.modo, 'automatica');
    assert.equal(r.calificacion, 100);
  });

  test('ninguna correcta da 0', () => {
    assert.equal(calificarIntento(quiz([1, 2]), { respuestas: [0, 0] }).calificacion, 0);
  });

  test('la mitad correcta da 50', () => {
    assert.equal(calificarIntento(quiz([1, 2]), { respuestas: [1, 0] }).calificacion, 50);
  });

  test('un tercio correcto da 33.33 y no se redondea a entero', () => {
    assert.equal(calificarIntento(quiz([1, 1, 1]), { respuestas: [1, 0, 0] }).calificacion, 33.33);
  });

  test('sin respuestas da 0, no lanza excepción', () => {
    assert.equal(calificarIntento(quiz([1, 2]), null).calificacion, 0);
  });

  test('sobran respuestas: solo cuentan las preguntas reales', () => {
    assert.equal(calificarIntento(quiz([1]), { respuestas: [1, 1, 1, 1] }).calificacion, 100);
  });

  test('acepta array suelto además del envoltorio', () => {
    assert.equal(calificarIntento(quiz([1, 2]), [1, 2]).calificacion, 100);
  });

  test('acepta objeto indexado por posición', () => {
    assert.equal(calificarIntento(quiz([1, 2]), { 0: 1, 1: 2 }).calificacion, 100);
  });

  test('el índice como texto también cuenta', () => {
    assert.equal(calificarIntento(quiz([1]), { respuestas: ['1'] }).calificacion, 100);
  });

  test('el detalle señala qué preguntas fallaron', () => {
    const r = calificarIntento(quiz([1, 2]), { respuestas: [1, 0] });
    assert.equal(r.detalle.aciertos, 1);
    assert.equal(r.detalle.total, 2);
    assert.equal(r.detalle.items[0].correcta, true);
    assert.equal(r.detalle.items[1].correcta, false);
  });
});

describe('Calificación de campos de texto', () => {
  const formulario = {
    tipo: 'formulario',
    datos_json: {
      idCardFields: [
        { label: 'Nombre', expected: 'John Doe' },
        { label: 'Rol', expected: 'I am a nurse' }
      ]
    }
  };

  test('coincidencia exacta da 100', () => {
    assert.equal(calificarIntento(formulario, { respuestas: ['John Doe', 'I am a nurse'] }).calificacion, 100);
  });

  test('ignora mayúsculas, espacios sobrantes y puntuación', () => {
    assert.equal(calificarIntento(formulario, { respuestas: ['  jOHN   doe  ', 'I am a nurse.'] }).calificacion, 100);
  });

  test('ignora tildes', () => {
    const act = { tipo: 'formulario', datos_json: { idCardFields: [{ label: 'x', expected: 'Atención' }] } };
    assert.equal(calificarIntento(act, { respuestas: ['atencion'] }).calificacion, 100);
  });

  test('responde por etiqueta además de por posición', () => {
    assert.equal(calificarIntento(formulario, { Nombre: 'John Doe', Rol: 'I am a nurse' }).calificacion, 100);
  });

  test('una respuesta vacía no cuenta como acierto', () => {
    assert.equal(calificarIntento(formulario, { respuestas: ['', ''] }).calificacion, 0);
  });

  test('un campo sin respuesta esperada no regala el acierto', () => {
    const act = { tipo: 'formulario', datos_json: { idCardFields: [{ label: 'x', expected: '' }] } };
    assert.equal(calificarIntento(act, { respuestas: [''] }).calificacion, 0);
  });
});

describe('Actividades sin clave de corrección', () => {
  test('la teoría se completa por revisión, no se corrige', () => {
    const teoria = {
      tipo: 'grammar_pill',
      // Lleva warmupPairs, que ANTES se tomaba por clave de corrección y hacía
      // imposible aprobar la actividad.
      datos_json: { objectives: 'x', warmupPairs: [{ label: 'Sol', text: 'Good morning' }] }
    };
    const r = calificarIntento(teoria, { revisado: true });
    assert.equal(r.modo, 'completitud');
    assert.equal(r.calificacion, 100);
  });

  test('sin entregar nada, la actividad de completitud da 0', () => {
    const r = calificarIntento({ tipo: 'storybook', datos_json: {} }, {});
    assert.equal(r.modo, 'completitud');
    assert.equal(r.calificacion, 0);
  });

  test('audio y vídeo quedan pendientes del instructor', () => {
    for (const tipo of ['grabacion_audio', 'grabacion_video']) {
      const r = calificarIntento({ tipo, datos_json: {} }, { url: 'x' });
      assert.equal(r.modo, 'manual');
      assert.equal(r.calificacion, null);
    }
  });

  test('actividad sin datos_json no rompe', () => {
    const r = calificarIntento({ tipo: 'otro' }, { algo: 1 });
    assert.equal(r.modo, 'completitud');
  });

  test('esAutoCalificable distingue lo manual de lo demás', () => {
    assert.equal(esAutoCalificable({ tipo: 'quiz', datos_json: {} }), true);
    assert.equal(esAutoCalificable({ tipo: 'grabacion_audio', datos_json: {} }), false);
  });
});

describe('El enunciado que sale hacia el navegador', () => {
  test('elimina la respuesta correcta de cada pregunta', () => {
    const limpio = enunciadoSeguro(quiz([1, 2]).datos_json);
    assert.equal(JSON.stringify(limpio).includes('correctAnswer'), false);
    assert.equal(limpio.questions.length, 2);
    assert.deepEqual(limpio.questions[0].options, ['a', 'b', 'c', 'd']);
  });

  test('elimina claves anidadas en profundidad', () => {
    const datos = { seccion: { bloque: [{ expected: 'secreto', label: 'visible' }] } };
    const limpio = enunciadoSeguro(datos);
    assert.equal(limpio.seccion.bloque[0].expected, undefined);
    assert.equal(limpio.seccion.bloque[0].label, 'visible');
  });

  test('respeta null y valores primitivos', () => {
    assert.equal(enunciadoSeguro(null), null);
    assert.equal(enunciadoSeguro('texto'), 'texto');
  });

  test('el enunciado limpio ya no permite calificar en el cliente', () => {
    // Si alguien intentara corregir con el enunciado publicado, no hallaría clave.
    const limpio = enunciadoSeguro(quiz([1, 2]).datos_json);
    const r = calificarIntento({ tipo: 'quiz', datos_json: limpio }, { respuestas: [1, 2] });
    assert.equal(r.modo, 'completitud');
  });
});

describe('Calificación de emparejamiento y Drag & Drop', () => {
  const actividadDragDrop = {
    tipo: 'game',
    datos_json: {
      gameType: 'drag_drop',
      pairs: [
        { draggable: 'Patient identity', dropzone: 'Name, age, and room' },
        { draggable: 'Current status', dropzone: 'Vital signs and symptoms now' },
        { draggable: 'Past event', dropzone: 'What happened before this shift' },
        { draggable: 'Pending task', dropzone: 'What the next nurse must do' }
      ]
    }
  };

  test('califica 100 con payload bidireccional de Drag & Drop', () => {
    const payload = {
      'Patient identity': 'Name, age, and room',
      'Current status': 'Vital signs and symptoms now',
      'Past event': 'What happened before this shift',
      'Pending task': 'What the next nurse must do',
      respuestas: [
        'Name, age, and room',
        'Vital signs and symptoms now',
        'What happened before this shift',
        'What the next nurse must do'
      ]
    };
    const r = calificarIntento(actividadDragDrop, payload);
    assert.equal(r.modo, 'automatica');
    assert.equal(r.calificacion, 100);
    assert.equal(r.detalle.aciertos, 4);
    assert.equal(r.detalle.total, 4);
  });

  test('califica 100 cuando el cliente envía conceptos colocados correctamente', () => {
    const payload = {
      'Patient identity': 'Patient identity',
      'Current status': 'Current status',
      'Past event': 'Past event',
      'Pending task': 'Pending task',
      respuestas: ['Patient identity', 'Current status', 'Past event', 'Pending task']
    };
    const r = calificarIntento(actividadDragDrop, payload);
    assert.equal(r.calificacion, 100);
    assert.equal(r.detalle.aciertos, 4);
  });

  test('califica 0 si las respuestas son erróneas', () => {
    const payload = {
      'Patient identity': 'Incorrecto',
      'Current status': 'Incorrecto',
      'Past event': 'Incorrecto',
      'Pending task': 'Incorrecto',
      respuestas: ['Incorrecto', 'Incorrecto', 'Incorrecto', 'Incorrecto']
    };
    const r = calificarIntento(actividadDragDrop, payload);
    assert.equal(r.calificacion, 0);
    assert.equal(r.detalle.aciertos, 0);
  });
});

