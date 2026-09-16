export const MODO_AUTOMATICO = 'automatica';
export const MODO_MANUAL = 'manual';
export const MODO_COMPLETITUD = 'completitud';

export const TIPOS_SOPORTADOS = {
  quiz: {
    etiqueta: 'Cuestionario de opción múltiple',
    modo: MODO_AUTOMATICO,
    disponible: true,
    descripcion: 'El sistema lo califica solo comparando con la opción correcta.'
  },
  formulario: {
    etiqueta: 'Respuestas cortas (Fill in blanks)',
    modo: MODO_AUTOMATICO,
    disponible: true,
    descripcion: 'El sistema lo califica solo comparando con la respuesta esperada.'
  },
  evaluacion: {
    etiqueta: 'Evaluación (preguntas mixtas)',
    modo: MODO_AUTOMATICO,
    disponible: true,
    descripcion: 'Mezcla preguntas de opción múltiple y de respuesta corta. El sistema la califica sola.'
  },
  otro: {
    etiqueta: '🧠 Memory Game (Juego de Memoria)',
    modo: MODO_AUTOMATICO,
    disponible: true,
    descripcion: 'Tarjetas volteables para asociar términos en inglés con su traducción o definición.'
  },
  matching: {
    etiqueta: '🧩 Matching / Drag & Drop',
    modo: MODO_AUTOMATICO,
    disponible: true,
    descripcion: 'Asociación y emparejamiento de conceptos médicos y vocabulario.'
  },
  listening: {
    etiqueta: '🎧 Comprensión Auditiva (Listening)',
    modo: MODO_AUTOMATICO,
    disponible: true,
    descripcion: 'Audio o diálogo clínico con preguntas de opción múltiple.'
  },
  spelling: {
    etiqueta: '🔤 Deletreo Clínico (Spelling)',
    modo: MODO_AUTOMATICO,
    disponible: true,
    descripcion: 'Escritura y ortografía exacta de terminología hospitalaria.'
  },
  caso_clinico: {
    etiqueta: '🚨 Caso Clínico / Simulación',
    modo: MODO_AUTOMATICO,
    disponible: true,
    descripcion: 'Escenario hospitalario de toma de decisiones con preguntas guiadas.'
  },
  grabacion_audio: {
    etiqueta: 'Grabación de audio',
    modo: MODO_MANUAL,
    disponible: false,
    descripcion: 'Queda pendiente de tu revisión: no suma progreso hasta que la califiques.'
  },
  grabacion_video: {
    etiqueta: 'Grabación de vídeo',
    modo: MODO_MANUAL,
    disponible: false,
    descripcion: 'Queda pendiente de tu revisión: no suma progreso hasta que la califiques.'
  }
};

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

function validarQuiz(datos) {
  const errores = [];
  const preguntas = Array.isArray(datos?.questions) ? datos.questions : [];

  if (preguntas.length === 0) {
    errores.push('El cuestionario necesita al menos una pregunta.');
    return { errores, normalizado: null };
  }

  const normalizadas = preguntas.map((p, i) => {
    const enunciado = texto(p?.question);
    const opciones = Array.isArray(p?.options) ? p.options.map(texto) : [];
    const correcta = Number(p?.correctAnswer);

    if (!enunciado) errores.push(`La pregunta ${i + 1} no tiene enunciado.`);
    if (opciones.length < 2) errores.push(`La pregunta ${i + 1} necesita al menos dos opciones.`);
    if (opciones.some((o) => !o)) errores.push(`La pregunta ${i + 1} tiene opciones vacías.`);
    if (!Number.isInteger(correcta) || correcta < 0 || correcta >= opciones.length) {
      errores.push(`La pregunta ${i + 1} no tiene marcada una opción correcta válida.`);
    }

    return { question: enunciado, options: opciones, correctAnswer: correcta };
  });

  return { errores, normalizado: { questions: normalizadas } };
}

function validarFormulario(datos) {
  const errores = [];
  const campos = Array.isArray(datos?.idCardFields) ? datos.idCardFields : [];

  if (campos.length === 0) {
    errores.push('El formulario necesita al menos un campo.');
    return { errores, normalizado: null };
  }

  const normalizados = campos.map((c, i) => {
    const etiqueta = texto(c?.label);
    const esperada = texto(c?.expected);
    if (!etiqueta) errores.push(`El campo ${i + 1} no tiene etiqueta.`);
    if (!esperada) errores.push(`El campo ${i + 1} no tiene respuesta esperada.`);
    return { label: etiqueta, expected: esperada, placeholder: texto(c?.placeholder) };
  });

  return { errores, normalizado: { idCardFields: normalizados } };
}

function validarEvaluacion(datos) {
  const errores = [];
  const items = Array.isArray(datos?.items) ? datos.items : [];

  if (items.length === 0) {
    errores.push('La evaluación necesita al menos una pregunta.');
    return { errores, normalizado: null };
  }

  const normalizados = items.map((item, i) => {
    const enunciado = texto(item?.enunciado ?? item?.question);
    if (!enunciado) errores.push(`La pregunta ${i + 1} no tiene enunciado.`);

    if (item?.tipo === 'respuesta_corta') {
      const esperada = texto(item?.esperada ?? item?.expected);
      if (!esperada) errores.push(`La pregunta ${i + 1} (respuesta corta) no tiene respuesta esperada.`);
      return { tipo: 'respuesta_corta', enunciado, esperada };
    }

    if (item?.tipo === 'opcion_multiple') {
      const opciones = Array.isArray(item?.opciones) ? item.opciones.map(texto) : [];
      const correcta = Number(item?.correcta);
      if (opciones.length < 2) errores.push(`La pregunta ${i + 1} (opción múltiple) necesita al menos dos opciones.`);
      if (opciones.some((o) => !o)) errores.push(`La pregunta ${i + 1} tiene opciones vacías.`);
      if (!Number.isInteger(correcta) || correcta < 0 || correcta >= opciones.length) {
        errores.push(`La pregunta ${i + 1} no tiene marcada una opción correcta válida.`);
      }
      return { tipo: 'opcion_multiple', enunciado, opciones, correcta };
    }

    errores.push(`La pregunta ${i + 1} no indica si es de opción múltiple o de respuesta corta.`);
    return null;
  });

  return { errores, normalizado: { items: normalizados } };
}

function validarMemory(datos) {
  const errores = [];
  const rawPairs = Array.isArray(datos?.pairs) ? datos.pairs : Array.isArray(datos?.warmupPairs) ? datos.warmupPairs : [];
  const description = texto(datos?.description || datos?.instrucciones || datos?.instructions);

  if (rawPairs.length < 2) {
    errores.push('El juego de memoria necesita al menos 2 parejas de conceptos.');
    return { errores, normalizado: null };
  }

  const normalizados = rawPairs.map((p, i) => {
    const label = texto(p?.label || p?.left || p?.term);
    const text = texto(p?.text || p?.right || p?.definition);
    if (!label) errores.push(`La pareja ${i + 1} no tiene el término en inglés.`);
    if (!text) errores.push(`La pareja ${i + 1} no tiene la traducción/definición en español.`);
    return { label, text };
  });

  return {
    errores,
    normalizado: {
      gameType: 'memory',
      gameMode: 'memory',
      description: description || null,
      instrucciones: description || null,
      pairs: normalizados,
      warmupPairs: normalizados
    }
  };
}

function validarMatching(datos) {
  const errores = [];
  const rawPairs = Array.isArray(datos?.pairs) ? datos.pairs : [];

  if (rawPairs.length < 2) {
    errores.push('El juego de emparejamiento necesita al menos 2 pares.');
    return { errores, normalizado: null };
  }

  const normalizados = rawPairs.map((p, i) => {
    const left = texto(p?.left || p?.label || p?.term);
    const right = texto(p?.right || p?.text || p?.definition);
    if (!left) errores.push(`El par ${i + 1} no tiene elemento izquierdo.`);
    if (!right) errores.push(`El par ${i + 1} no tiene elemento derecho.`);
    return { left, right };
  });

  return {
    errores,
    normalizado: {
      pairs: normalizados,
      gameType: 'matching'
    }
  };
}

function validarListening(datos) {
  const errores = [];
  const audioUrl = texto(datos?.audioUrl);
  const dialogueText = texto(datos?.dialogueText);
  const description = texto(datos?.description || datos?.instrucciones || datos?.instructions);
  const preguntas = Array.isArray(datos?.questions) ? datos.questions : [];

  if (!audioUrl && !dialogueText) {
    errores.push('Debes proporcionar el texto del diálogo o la URL del audio.');
  }

  if (preguntas.length === 0) {
    errores.push('La actividad de comprensión auditiva necesita al menos una pregunta.');
  }

  const qResult = validarQuiz({ questions: preguntas });
  errores.push(...qResult.errores);

  return {
    errores,
    normalizado: {
      audioUrl: audioUrl || null,
      dialogueText: dialogueText || null,
      description: description || null,
      instrucciones: description || null,
      questions: qResult.normalizado?.questions || [],
      gameType: 'listening'
    }
  };
}

function validarSpelling(datos) {
  const errores = [];
  const description = texto(datos?.description || datos?.instrucciones || datos?.instructions);
  const audioUrl = texto(datos?.audioUrl);

  // Soporte para múltiples palabras (words) o palabra única tradicional (expectedSpelling)
  const rawWords = Array.isArray(datos?.words) && datos.words.length > 0
    ? datos.words
    : (datos?.expectedSpelling || datos?.word
        ? [{ term: texto(datos.expectedSpelling || datos.word), hint: texto(datos.hint || datos.pista) }]
        : []);

  if (rawWords.length === 0) {
    errores.push('Debes indicar al menos una palabra que el estudiante debe deletrear.');
    return { errores, normalizado: null };
  }

  const normalizadas = rawWords.map((w, i) => {
    const term = texto(typeof w === 'string' ? w : w?.term || w?.word || w?.expectedSpelling);
    const hint = texto(typeof w === 'object' ? w?.hint || w?.pista || w?.definition : '');
    if (!term) errores.push(`La palabra ${i + 1} a deletrear no puede estar vacía.`);
    return { term, word: term, hint: hint || null };
  });

  const primera = normalizadas[0] || { term: '', hint: null };

  return {
    errores,
    normalizado: {
      description: description || null,
      instrucciones: description || null,
      expectedSpelling: primera.term,
      word: primera.term,
      hint: primera.hint,
      words: normalizadas,
      audioUrl: audioUrl || null,
      gameType: 'spelling'
    }
  };
}

function validarCasoClinico(datos) {
  const errores = [];
  const scenario = texto(datos?.scenario || datos?.caso || datos?.clinical_case);
  const description = texto(datos?.description || datos?.instrucciones);

  if (!scenario) errores.push('Debes describir el escenario del caso clínico.');

  // Soporte para múltiples preguntas o pregunta única tradicional
  const rawQuestions = Array.isArray(datos?.questions) && datos.questions.length > 0
    ? datos.questions
    : (datos?.question
        ? [{ question: datos.question, options: datos.options || [], correctAnswer: datos.correctAnswer ?? datos.correctIndex }]
        : []);

  if (rawQuestions.length === 0) {
    errores.push('Debes formular al menos una pregunta de toma de decisiones.');
    return { errores, normalizado: null };
  }

  const qResult = validarQuiz({ questions: rawQuestions });
  errores.push(...qResult.errores);

  const normalizadas = qResult.normalizado?.questions || [];
  const primera = normalizadas[0] || { question: '', options: [], correctAnswer: 0 };

  return {
    errores,
    normalizado: {
      scenario,
      description: description || null,
      instrucciones: description || null,
      questions: normalizadas,
      // Retrocompatibilidad con consumidores de pregunta única
      question: primera.question,
      options: primera.options,
      correctAnswer: primera.correctAnswer,
      gameType: 'caso_clinico'
    }
  };
}

function validarGrabacion(datos) {
  const duracion = datos?.maxDurationSeconds;
  const normalizado = { consigna: texto(datos?.consigna) };
  if (duracion !== undefined && duracion !== null && duracion !== '') {
    const n = Number(duracion);
    if (!Number.isFinite(n) || n <= 0) {
      return { errores: ['La duración máxima debe ser un número de segundos mayor que cero.'], normalizado: null };
    }
    normalizado.maxDurationSeconds = Math.round(n);
  }
  return { errores: [], normalizado };
}

export function validarActividad(tipo, datos) {
  const definicion = TIPOS_SOPORTADOS[tipo];

  const disponibles = Object.entries(TIPOS_SOPORTADOS)
    .filter(([, d]) => d.disponible)
    .map(([t]) => t);

  if (!definicion) {
    return {
      valido: false,
      errores: [`Tipo de actividad no soportado: «${tipo}». Tipos disponibles: ${disponibles.join(', ')}.`],
      datos: null,
      modo: null
    };
  }

  if (!definicion.disponible) {
    return {
      valido: false,
      errores: [`«${definicion.etiqueta}» todavía no está disponible: el aprendiz aún no tiene cómo realizarla.`],
      datos: null,
      modo: definicion.modo
    };
  }

  let resultado;
  if (tipo === 'quiz') resultado = validarQuiz(datos);
  else if (tipo === 'formulario') resultado = validarFormulario(datos);
  else if (tipo === 'evaluacion') resultado = validarEvaluacion(datos);
  else if (tipo === 'otro') resultado = validarMemory(datos);
  else if (tipo === 'matching') resultado = validarMatching(datos);
  else if (tipo === 'listening') resultado = validarListening(datos);
  else if (tipo === 'spelling') resultado = validarSpelling(datos);
  else if (tipo === 'caso_clinico') resultado = validarCasoClinico(datos);
  else resultado = validarGrabacion(datos);

  return {
    valido: resultado.errores.length === 0,
    errores: resultado.errores,
    datos: resultado.normalizado,
    modo: definicion.modo
  };
}

export function catalogoDeTipos() {
  return Object.entries(TIPOS_SOPORTADOS)
    .filter(([, d]) => d.disponible)
    .map(([tipo, d]) => ({
      tipo,
      etiqueta: d.etiqueta,
      modo: d.modo,
      descripcion: d.descripcion
    }));
}

export const POLITICA_MOMENTOS = {
  1: {
    nombre: 'Preparación',
    permiteActividades: false,
    tipos: [],
    proposito: 'Solo material de estudio: documentos, imágenes y vídeo. Aquí no se evalúa.'
  },
  2: {
    nombre: 'Absorción del conocimiento',
    permiteActividades: true,
    tipos: ['formulario', 'spelling', 'matching'],
    proposito: 'Ejercicios de práctica guiada, deletreo y adquisición de vocabulario.'
  },
  3: {
    nombre: 'Práctica y aplicación',
    permiteActividades: true,
    tipos: ['quiz', 'otro', 'matching', 'listening', 'caso_clinico', 'spelling'],
    proposito: 'Cuestionarios, juegos de memoria, comprensión auditiva y retos interactivos.'
  },
  4: {
    nombre: 'Cierre',
    permiteActividades: true,
    tipos: ['evaluacion', 'caso_clinico', 'quiz'],
    proposito: 'La actividad evaluativa del RAP: examen integral o caso de evaluación clínica.'
  }
};

export function permitidoEnMomento(ordenMomento, tipo) {
  const politica = POLITICA_MOMENTOS[ordenMomento];
  if (!politica) return { permitido: true };

  if (!politica.permiteActividades) {
    return {
      permitido: false,
      motivo: `El momento «${politica.nombre}» no admite actividades. ${politica.proposito}`
    };
  }

  if (!politica.tipos.includes(tipo)) {
    const etiquetas = politica.tipos.map((t) => TIPOS_SOPORTADOS[t]?.etiqueta || t);
    return {
      permitido: false,
      motivo: `El momento «${politica.nombre}» admite: ${etiquetas.join(', ')}. ${politica.proposito}`
    };
  }

  return { permitido: true };
}

export function catalogoParaMomento(ordenMomento) {
  const politica = POLITICA_MOMENTOS[ordenMomento];
  if (!politica) return { permiteActividades: true, tipos: catalogoDeTipos() };
  return {
    momento: politica.nombre,
    proposito: politica.proposito,
    permiteActividades: politica.permiteActividades,
    tipos: catalogoDeTipos().filter((t) => politica.tipos.includes(t.tipo))
  };
}
