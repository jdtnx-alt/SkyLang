/**
 * Calificación en el servidor.
 *
 * Antes la nota la calculaba el navegador y el backend la almacenaba tal cual, de
 * modo que cualquier usuario autenticado podía enviarse un 100. Aquí la nota se
 * deriva del enunciado guardado en la base y de las respuestas del aprendiz.
 *
 * Tres modos de calificación:
 *   automatica  — el enunciado trae clave de corrección; la nota se calcula.
 *   completitud — no hay nada que corregir (teoría, vídeo, H5P); se da por
 *                 cumplida al enviarse.
 *   manual      — requiere criterio humano (audio, vídeo del aprendiz); el
 *                 intento queda 'enviada' y no suma progreso hasta que el
 *                 instructor lo califique.
 */

// Claves que jamás deben viajar al navegador.
const CLAVES_DE_CORRECCION = [
  'correctAnswer', 'correctIndex', 'correctAnswers', 'expected', 'expectedSpelling',
  'answer', 'answers', 'solucion', 'respuestaCorrecta', 'respuestasCorrectas', 'esCorrecta',
  'correcta', 'esperada'
];

const TIPOS_MANUALES = ['grabacion_audio', 'grabacion_video'];

// Actividades de estudio: se dan por cumplidas al revisarlas, aunque su
// datos_json contenga material con apariencia de ejercicio.
const TIPOS_DE_CONTENIDO = ['grammar_pill', 'teoria', 'storybook', 'vocabulario', 'h5p'];

/** Normaliza texto para comparar respuestas abiertas cortas. */
function normalizar(valor) {
  return String(valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // sin tildes
    .replace(/\s+/g, ' ')                              // espacios colapsados
    .replace(/[.,;:!?¡¿'"()]/g, '');                   // sin puntuación
}

/** Devuelve el valor que el aprendiz dio para la posición i, sea array u objeto. */
function respuestaEn(respuestas, i, clave) {
  if (respuestas == null) return undefined;
  if (Array.isArray(respuestas)) return respuestas[i];
  if (typeof respuestas !== 'object') return undefined;
  if (clave !== undefined && respuestas[clave] !== undefined) return respuestas[clave];
  if (respuestas[i] !== undefined) return respuestas[i];
  if (respuestas[String(i)] !== undefined) return respuestas[String(i)];
  // Formatos habituales del cliente: { respuestas: [...] }, { selected: n }, { inputs: [...] }
  for (const envoltorio of ['respuestas', 'answers', 'inputs', 'selected', 'valores']) {
    const dentro = respuestas[envoltorio];
    if (dentro !== undefined) {
      if (Array.isArray(dentro)) return dentro[i];
      if (typeof dentro === 'object' && dentro !== null) return dentro[i] ?? dentro[String(i)];
      if (i === 0) return dentro;
    }
  }
  return undefined;
}

function porcentaje(aciertos, total) {
  if (!total) return 0;
  return Math.round((aciertos / total) * 10000) / 100;
}

/** Preguntas de opción múltiple: datos_json.questions[].correctAnswer es un índice. */
function calificarOpcionMultiple(preguntas, respuestas) {
  const detalle = [];
  let aciertos = 0;
  preguntas.forEach((p, i) => {
    const esperada = p.correctAnswer ?? p.correctIndex;
    const dada = respuestaEn(respuestas, i, p.id);
    const correcta = esperada !== undefined && Number(dada) === Number(esperada);
    if (correcta) aciertos += 1;
    detalle.push({ indice: i, correcta, respuesta: dada ?? null });
  });
  return { aciertos, total: preguntas.length, detalle };
}

/** Campos de texto con respuesta esperada: datos_json.idCardFields[].expected. */
function calificarCamposTexto(campos, respuestas) {
  const detalle = [];
  let aciertos = 0;
  campos.forEach((campo, i) => {
    const dada = respuestaEn(respuestas, i, campo.label);
    const correcta = normalizar(dada) === normalizar(campo.expected) && normalizar(campo.expected) !== '';
    if (correcta) aciertos += 1;
    detalle.push({ indice: i, campo: campo.label ?? null, correcta, respuesta: dada ?? null });
  });
  return { aciertos, total: campos.length, detalle };
}

/** Emparejamiento: datos_json.warmupPairs[] / pairs[] con {label,text}, {left,right} o {draggable,dropzone}. */
function calificarEmparejamiento(pares, respuestas) {
  const detalle = [];
  let aciertos = 0;
  pares.forEach((par, i) => {
    const ladoA = par.label ?? par.izquierda ?? par.left ?? par.term ?? par.draggable;
    const ladoB = par.text ?? par.derecha ?? par.match ?? par.right ?? par.definition ?? par.dropzone;

    const dadaPorA = respuestaEn(respuestas, i, ladoA);
    const dadaPorB = respuestaEn(respuestas, i, ladoB);

    let correcta = false;
    const respuestaFinal = dadaPorA ?? dadaPorB;

    const normA = normalizar(ladoA);
    const normB = normalizar(ladoB);
    const normDadaA = normalizar(dadaPorA);
    const normDadaB = normalizar(dadaPorB);

    if (normB !== '') {
      // 1. Coincide ladoA con ladoB esperado (o por índice i con valor ladoB)
      if (normDadaA === normB) {
        correcta = true;
      }
      // 2. Coincide ladoB con ladoA esperado (o por índice i con valor ladoA)
      else if (normDadaB === normA && normA !== '') {
        correcta = true;
      }
      // 3. Para drag & drop donde el cliente envió el concepto arrastrado validado
      else if (normDadaA === normA && normA !== '' && (par.draggable || par.dropzone)) {
        correcta = true;
      }
      else if (normDadaB === normB && normB !== '' && (par.draggable || par.dropzone)) {
        correcta = true;
      }
    }

    if (correcta) aciertos += 1;
    detalle.push({ indice: i, correcta, respuesta: respuestaFinal ?? null });
  });
  return { aciertos, total: pares.length, detalle };
}

/** Evaluación mixta: cada pregunta declara su clase y se corrige según ella. */
function calificarEvaluacion(items, respuestas) {
  const detalle = [];
  let aciertos = 0;

  items.forEach((item, i) => {
    const dada = respuestaEn(respuestas, i, item.enunciado);
    let correcta = false;

    if (item.tipo === 'opcion_multiple') {
      correcta = item.correcta !== undefined && Number(dada) === Number(item.correcta);
    } else if (item.tipo === 'respuesta_corta') {
      correcta = normalizar(dada) === normalizar(item.esperada) && normalizar(item.esperada) !== '';
    }

    if (correcta) aciertos += 1;
    detalle.push({ indice: i, tipo: item.tipo, correcta, respuesta: dada ?? null });
  });

  return { aciertos, total: items.length, detalle };
}

/**
 * Localiza el bloque calificable dentro de datos_json.
 * Devuelve null si el enunciado no tiene clave de corrección.
 */
function localizarClave(datos) {
  if (!datos || typeof datos !== 'object') return null;

  if (Array.isArray(datos.items) && datos.items.length &&
      datos.items.some((i) => i?.correcta !== undefined || i?.esperada !== undefined)) {
    return { forma: 'evaluacion', items: datos.items };
  }

  // Caso clínico con preguntas múltiples o quiz general
  const preguntas = datos.questions ?? datos.preguntas;
  if (Array.isArray(preguntas) && preguntas.length &&
      preguntas.some(p => p.correctAnswer !== undefined || p.correctIndex !== undefined)) {
    return { forma: 'opcion_multiple', items: preguntas };
  }

  // Caso clínico con pregunta única (formato raíz)
  if (datos.question && (datos.correctAnswer !== undefined || datos.correctIndex !== undefined) && Array.isArray(datos.options)) {
    return {
      forma: 'opcion_multiple',
      items: [{ question: datos.question, options: datos.options, correctAnswer: datos.correctAnswer ?? datos.correctIndex }]
    };
  }

  const campos = datos.idCardFields ?? datos.campos ?? datos.fields;
  if (Array.isArray(campos) && campos.length && campos.some(c => c.expected !== undefined)) {
    return { forma: 'campos_texto', items: campos };
  }

  // Soporte para múltiples palabras en Deletreo Clínico (words)
  if (Array.isArray(datos.words) && datos.words.length && datos.words.some(w => (w.term || w.word || w.expectedSpelling))) {
    const itemsPalabras = datos.words.map((w, idx) => ({
      label: w.term || w.word || `palabra_${idx + 1}`,
      expected: w.term || w.word || w.expectedSpelling
    }));
    return { forma: 'campos_texto', items: itemsPalabras };
  }

  // warmupPairs NO entra aquí: es material de calentamiento dentro del contenido
  // teórico, no la evaluación de la actividad. Tratarlo como clave de corrección
  // hacía imposible aprobar las actividades de teoría.
  const pares = datos.pairs ?? datos.pares;
  if (Array.isArray(pares) && pares.length &&
      pares.some(p => p.text !== undefined || p.derecha !== undefined || p.right !== undefined || p.dropzone !== undefined)) {
    return { forma: 'emparejamiento', items: pares };
  }

  if (typeof datos.expectedSpelling === 'string' && datos.expectedSpelling.trim() !== '') {
    return { forma: 'campos_texto', items: [{ label: 'spelling', expected: datos.expectedSpelling }] };
  }

  return null;
}

/**
 * Califica un intento.
 * @param {{ tipo: string, datos_json: any }} actividad
 * @param {any} respuestas respuestas_json enviadas por el aprendiz
 * @returns {{ modo: 'automatica'|'completitud'|'manual', calificacion: number|null, detalle: object }}
 */
export function calificarIntento(actividad, respuestas) {
  const datos = actividad?.datos_json ?? null;
  const esContenido = TIPOS_DE_CONTENIDO.includes(actividad?.tipo);
  const clave = esContenido ? null : localizarClave(datos);

  if (clave) {
    let resultado;
    if (clave.forma === 'evaluacion')           resultado = calificarEvaluacion(clave.items, respuestas);
    else if (clave.forma === 'opcion_multiple')  resultado = calificarOpcionMultiple(clave.items, respuestas);
    else if (clave.forma === 'campos_texto')     resultado = calificarCamposTexto(clave.items, respuestas);
    else                                         resultado = calificarEmparejamiento(clave.items, respuestas);

    return {
      modo: 'automatica',
      calificacion: porcentaje(resultado.aciertos, resultado.total),
      detalle: {
        forma: clave.forma,
        aciertos: resultado.aciertos,
        total: resultado.total,
        items: resultado.detalle
      }
    };
  }

  if (TIPOS_MANUALES.includes(actividad?.tipo)) {
    return {
      modo: 'manual',
      calificacion: null,
      detalle: { motivo: 'Requiere revisión del instructor.' }
    };
  }

  const entregoAlgo = respuestas !== null && respuestas !== undefined &&
    (typeof respuestas !== 'object' || Object.keys(respuestas).length > 0);

  return {
    modo: 'completitud',
    calificacion: entregoAlgo ? 100 : 0,
    detalle: { motivo: 'Actividad sin clave de corrección: se califica por realización.' }
  };
}

/**
 * Copia del enunciado sin las claves de corrección, para enviar al navegador.
 * Antes las respuestas correctas viajaban al cliente dentro de datos_json.
 */
export function enunciadoSeguro(datos) {
  if (datos === null || datos === undefined) return datos;
  if (Array.isArray(datos)) return datos.map(enunciadoSeguro);
  if (typeof datos !== 'object') return datos;

  const limpio = {};
  for (const [k, v] of Object.entries(datos)) {
    if (CLAVES_DE_CORRECCION.includes(k)) continue;
    limpio[k] = enunciadoSeguro(v);
  }
  return limpio;
}

/** Indica si una actividad podrá calificarse sola, sin esperar al instructor. */
export function esAutoCalificable(actividad) {
  return calificarIntento(actividad, {}).modo !== 'manual';
}
