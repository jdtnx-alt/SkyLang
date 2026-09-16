import React from 'react';
import { Plus, Trash2, Check } from 'lucide-react';

/**
 * Editor del contenido de una actividad, según su tipo.
 *
 * Antes el formulario solo pedía tipo, título e instrucciones: la actividad
 * nacía sin preguntas ni respuestas esperadas y el calificador la daba por
 * cumplida con un 100 a quien la enviara. Aquí el instructor define de verdad
 * qué se pregunta y qué se considera correcto.
 */

interface Props {
  tipo: string;
  datos: any;
  onChange: (datos: any) => void;
}

const preguntaVacia = () => ({ question: '', options: ['', ''], correctAnswer: 0 });
const itemOpcionMultiple = () => ({ tipo: 'opcion_multiple', enunciado: '', opciones: ['', ''], correcta: 0 });
const itemRespuestaCorta = () => ({ tipo: 'respuesta_corta', enunciado: '', esperada: '' });
const campoVacio = () => ({ label: '', expected: '', placeholder: '' });

export const EditorActividad: React.FC<Props> = ({ tipo, datos, onChange }) => {
  // ── 1. Evaluación: mezcla los dos tipos de pregunta en la misma prueba ──
  if (tipo === 'evaluacion') {
    const items = datos?.items?.length ? datos.items : [];
    const actualizar = (nuevos: any[]) => onChange({ items: nuevos });
    const cambiar = (i: number, cambios: any) =>
      actualizar(items.map((it: any, k: number) => (k === i ? { ...it, ...cambios } : it)));

    return (
      <div className="space-y-4">
        <p className="text-[10px] text-gray-500 font-medium">
          Añade las preguntas que necesites, de uno u otro tipo. Todas valen lo mismo.
        </p>

        {items.map((item: any, i: number) => (
          <fieldset key={i} className="border border-gray-200 rounded-xl p-3 space-y-2">
            <legend className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1">
              {i + 1} · {item.tipo === 'respuesta_corta' ? 'Respuesta corta' : 'Opción múltiple'}
            </legend>

            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Enunciado de la pregunta"
                value={item.enunciado || ''}
                onChange={(e) => cambiar(i, { enunciado: e.target.value })}
                className="flex-1 border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
              />
              <button
                type="button"
                title="Eliminar pregunta"
                onClick={() => actualizar(items.filter((_: any, k: number) => k !== i))}
                className="px-2 text-rose-600 hover:bg-rose-50 rounded-lg"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {item.tipo === 'respuesta_corta' ? (
              <input
                type="text"
                required
                placeholder="Respuesta correcta esperada"
                value={item.esperada || ''}
                onChange={(e) => cambiar(i, { esperada: e.target.value })}
                className="w-full border border-emerald-200 bg-emerald-50/40 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-400"
              />
            ) : (
              <>
                <p className="text-[10px] text-gray-500 font-medium">
                  Marca la opción correcta con el círculo de la izquierda.
                </p>
                {(item.opciones || []).map((opt: string, j: number) => (
                  <div key={j} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`eval-correcta-${i}`}
                      checked={Number(item.correcta) === j}
                      onChange={() => cambiar(i, { correcta: j })}
                      className="accent-emerald-600"
                    />
                    <input
                      type="text"
                      required
                      placeholder={`Opción ${j + 1}`}
                      value={opt}
                      onChange={(e) =>
                        cambiar(i, { opciones: item.opciones.map((o: string, k: number) => (k === j ? e.target.value : o)) })
                      }
                      className="flex-1 border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
                    />
                    {item.opciones.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const restantes = item.opciones.filter((_: string, k: number) => k !== j);
                          const correcta = Number(item.correcta);
                          cambiar(i, {
                            opciones: restantes,
                            correcta: correcta >= restantes.length ? 0 : correcta > j ? correcta - 1 : correcta
                          });
                        }}
                        className="px-1.5 text-gray-400 hover:text-rose-600"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => cambiar(i, { opciones: [...(item.opciones || []), ''] })}
                  className="text-[11px] font-bold text-[#4DA6FF] hover:underline flex items-center gap-1"
                >
                  <Plus size={12} /> Añadir opción
                </button>
              </>
            )}
          </fieldset>
        ))}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => actualizar([...items, itemOpcionMultiple()])}
            className="py-2 border border-dashed border-[#4DA6FF] text-[#4DA6FF] rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-50"
          >
            <Plus size={14} /> Agregar opción múltiple
          </button>
          <button
            type="button"
            onClick={() => actualizar([...items, itemRespuestaCorta()])}
            className="py-2 border border-dashed border-emerald-500 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-emerald-50"
          >
            <Plus size={14} /> Agregar respuesta corta
          </button>
        </div>
      </div>
    );
  }

  // ── 2. Cuestionario de opción múltiple ──────────────────────────────
  if (tipo === 'quiz') {
    const preguntas = datos?.questions?.length ? datos.questions : [preguntaVacia()];

    const actualizar = (nuevas: any[]) => onChange({ questions: nuevas });
    const cambiarPregunta = (i: number, cambios: any) =>
      actualizar(preguntas.map((p: any, k: number) => (k === i ? { ...p, ...cambios } : p)));

    return (
      <div className="space-y-4">
        {preguntas.map((p: any, i: number) => (
          <fieldset key={i} className="border border-gray-200 rounded-xl p-3 space-y-2">
            <legend className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1">
              Pregunta {i + 1}
            </legend>

            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Enunciado de la pregunta"
                value={p.question || ''}
                onChange={(e) => cambiarPregunta(i, { question: e.target.value })}
                className="flex-1 border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
              />
              {preguntas.length > 1 && (
                <button
                  type="button"
                  title="Eliminar pregunta"
                  onClick={() => actualizar(preguntas.filter((_: any, k: number) => k !== i))}
                  className="px-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <p className="text-[10px] text-gray-500 font-medium">
              Marca la opción correcta con el círculo de la izquierda.
            </p>

            {(p.options || []).map((opt: string, j: number) => (
              <div key={j} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correcta-${i}`}
                  checked={Number(p.correctAnswer) === j}
                  onChange={() => cambiarPregunta(i, { correctAnswer: j })}
                  className="accent-emerald-600"
                  title="Marcar como correcta"
                />
                <input
                  type="text"
                  required
                  placeholder={`Opción ${j + 1}`}
                  value={opt}
                  onChange={(e) =>
                    cambiarPregunta(i, {
                      options: p.options.map((o: string, k: number) => (k === j ? e.target.value : o))
                    })
                  }
                  className="flex-1 border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
                />
                {p.options.length > 2 && (
                  <button
                    type="button"
                    title="Eliminar opción"
                    onClick={() => {
                      const restantes = p.options.filter((_: string, k: number) => k !== j);
                      const correcta = Number(p.correctAnswer);
                      cambiarPregunta(i, {
                        options: restantes,
                        correctAnswer: correcta >= restantes.length ? 0 : correcta > j ? correcta - 1 : correcta
                      });
                    }}
                    className="px-1.5 text-gray-400 hover:text-rose-600"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => cambiarPregunta(i, { options: [...(p.options || []), ''] })}
              className="text-[11px] font-bold text-[#4DA6FF] hover:underline flex items-center gap-1"
            >
              <Plus size={12} /> Añadir opción
            </button>
          </fieldset>
        ))}

        <button
          type="button"
          onClick={() => actualizar([...preguntas, preguntaVacia()])}
          className="w-full py-2 border border-dashed border-[#4DA6FF] text-[#4DA6FF] rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-50"
        >
          <Plus size={14} /> Añadir pregunta
        </button>
      </div>
    );
  }

  // ── 3. Respuestas cortas ───────────────────────────────────────────
  if (tipo === 'formulario') {
    const campos = datos?.idCardFields?.length ? datos.idCardFields : [campoVacio()];
    const actualizar = (nuevos: any[]) => onChange({ idCardFields: nuevos });
    const cambiarCampo = (i: number, cambios: any) =>
      actualizar(campos.map((c: any, k: number) => (k === i ? { ...c, ...cambios } : c)));

    return (
      <div className="space-y-3">
        <p className="text-[10px] text-gray-500 font-medium">
          La comparación ignora mayúsculas, tildes, espacios sobrantes y signos de puntuación.
        </p>

        {campos.map((c: any, i: number) => (
          <fieldset key={i} className="border border-gray-200 rounded-xl p-3 space-y-2">
            <legend className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1">
              Campo {i + 1}
            </legend>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Etiqueta (p. ej. Nombre completo)"
                value={c.label || ''}
                onChange={(e) => cambiarCampo(i, { label: e.target.value })}
                className="flex-1 border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
              />
              {campos.length > 1 && (
                <button
                  type="button"
                  onClick={() => actualizar(campos.filter((_: any, k: number) => k !== i))}
                  className="px-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <input
              type="text"
              required
              placeholder="Respuesta correcta esperada"
              value={c.expected || ''}
              onChange={(e) => cambiarCampo(i, { expected: e.target.value })}
              className="w-full border border-emerald-200 bg-emerald-50/40 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </fieldset>
        ))}

        <button
          type="button"
          onClick={() => actualizar([...campos, campoVacio()])}
          className="w-full py-2 border border-dashed border-[#4DA6FF] text-[#4DA6FF] rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-50"
        >
          <Plus size={14} /> Añadir campo
        </button>
      </div>
    );
  }

  // ── 4. Juego de Memoria (Memory Game) ──────────────────────────────
  if (tipo === 'otro' || tipo === 'memory') {
    const rawPairs = Array.isArray(datos?.pairs) ? datos.pairs : Array.isArray(datos?.warmupPairs) ? datos.warmupPairs : [];
    const pairs = rawPairs.length ? rawPairs : [
      { label: '', text: '' },
      { label: '', text: '' },
      { label: '', text: '' }
    ];

    const actualizar = (nuevos: any[], extra: Record<string, any> = {}) => onChange({
      ...datos,
      gameType: 'memory',
      gameMode: 'memory',
      pairs: nuevos,
      warmupPairs: nuevos,
      ...extra
    });

    const cambiarPar = (i: number, cambios: any) =>
      actualizar(pairs.map((p: any, k: number) => (k === i ? { ...p, ...cambios } : p)));

    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-700">
            Contenido / Instrucciones de la Actividad
          </label>
          <textarea
            rows={2}
            placeholder="Instrucciones para el estudiante (p. ej.: Voltea las cartas para encontrar cada término médico en inglés con su traducción en español)..."
            value={datos?.description || datos?.instrucciones || datos?.instructions || ''}
            onChange={(e) => actualizar(pairs, { description: e.target.value, instrucciones: e.target.value })}
            className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        <p className="text-[10px] text-gray-500 font-medium">
          Define las parejas de conceptos que el estudiante volteará para emparejar (mínimo 2 parejas).
        </p>

        {pairs.map((p: any, i: number) => (
          <fieldset key={i} className="border border-purple-200 bg-purple-50/20 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <legend className="text-[10px] font-bold uppercase tracking-wider text-purple-700 px-1">
                Pareja {i + 1}
              </legend>
              {pairs.length > 2 && (
                <button
                  type="button"
                  title="Eliminar pareja"
                  onClick={() => actualizar(pairs.filter((_: any, k: number) => k !== i))}
                  className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Término en Inglés (p. ej. Stethoscope)"
                value={p.label || p.left || ''}
                onChange={(e) => cambiarPar(i, { label: e.target.value, left: e.target.value })}
                className="border border-gray-300 bg-white rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-purple-400"
              />
              <input
                type="text"
                required
                placeholder="Traducción / Definición en Español (p. ej. Estetoscopio)"
                value={p.text || p.right || ''}
                onChange={(e) => cambiarPar(i, { text: e.target.value, right: e.target.value })}
                className="border border-gray-300 bg-white rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </fieldset>
        ))}

        <button
          type="button"
          onClick={() => actualizar([...pairs, { label: '', text: '' }])}
          className="w-full py-2 border border-dashed border-purple-400 text-purple-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-purple-50"
        >
          <Plus size={14} /> Añadir Pareja de Memoria
        </button>
      </div>
    );
  }

  // ── 5. Emparejamiento / Drag & Drop ─────────────────────────────────
  if (tipo === 'matching') {
    const pairs = Array.isArray(datos?.pairs) && datos.pairs.length ? datos.pairs : [
      { left: '', right: '' },
      { left: '', right: '' }
    ];

    const actualizar = (nuevos: any[]) => onChange({ gameType: 'matching', pairs: nuevos });
    const cambiarPar = (i: number, cambios: any) =>
      actualizar(pairs.map((p: any, k: number) => (k === i ? { ...p, ...cambios } : p)));

    return (
      <div className="space-y-4">
        <p className="text-[10px] text-gray-500 font-medium">
          Define los elementos de la izquierda y su correspondencia exacta a la derecha.
        </p>

        {pairs.map((p: any, i: number) => (
          <fieldset key={i} className="border border-blue-200 bg-blue-50/20 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <legend className="text-[10px] font-bold uppercase tracking-wider text-blue-700 px-1">
                Asociación {i + 1}
              </legend>
              {pairs.length > 2 && (
                <button
                  type="button"
                  title="Eliminar asociación"
                  onClick={() => actualizar(pairs.filter((_: any, k: number) => k !== i))}
                  className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Elemento Izquierdo (p. ej. Fever)"
                value={p.left || ''}
                onChange={(e) => cambiarPar(i, { left: e.target.value })}
                className="border border-gray-300 bg-white rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="text"
                required
                placeholder="Correspondencia Derecha (p. ej. High Body Temperature)"
                value={p.right || ''}
                onChange={(e) => cambiarPar(i, { right: e.target.value })}
                className="border border-gray-300 bg-white rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </fieldset>
        ))}

        <button
          type="button"
          onClick={() => actualizar([...pairs, { left: '', right: '' }])}
          className="w-full py-2 border border-dashed border-blue-400 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-50"
        >
          <Plus size={14} /> Añadir Asociación
        </button>
      </div>
    );
  }

  // ── 6. Comprensión Auditiva (Listening) ──────────────────────────────
  // ── 6. Comprensión Auditiva (Listening) ──────────────────────────────
  if (tipo === 'listening') {
    const preguntas = Array.isArray(datos?.questions) && datos.questions.length ? datos.questions : [preguntaVacia()];
    const actualizar = (nuevosCambios: any) => onChange({ gameType: 'listening', ...datos, ...nuevosCambios });

    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Contenido / Instrucciones de la Actividad (Opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Instrucciones para el estudiante (p. ej.: Escucha con atención la conversación entre la enfermera y el paciente y responde las preguntas)..."
            value={datos?.description || datos?.instrucciones || datos?.instructions || ''}
            onChange={(e) => actualizar({ description: e.target.value, instrucciones: e.target.value })}
            className="w-full border border-gray-300 rounded-xl p-2 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Texto del Diálogo Clínico o Transcripción de Audio
          </label>
          <textarea
            rows={3}
            required
            placeholder="Nurse: Good morning Mr. Smith, I need to check your blood pressure... Patient: Sure thing, nurse."
            value={datos?.dialogueText || ''}
            onChange={(e) => actualizar({ dialogueText: e.target.value })}
            className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
            URL del Audio (Opcional si hay transcripción)
          </label>
          <input
            type="url"
            placeholder="https://ejemplo.com/audio-dialogo.mp3"
            value={datos?.audioUrl || ''}
            onChange={(e) => actualizar({ audioUrl: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Preguntas de Comprensión Auditiva
            </p>
            <span className="text-[10px] text-gray-400 font-bold">{preguntas.length} pregunta(s)</span>
          </div>

          {preguntas.map((p: any, i: number) => (
            <fieldset key={i} className="border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <legend className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1">
                  Pregunta {i + 1}
                </legend>
                {preguntas.length > 1 && (
                  <button
                    type="button"
                    title="Eliminar pregunta"
                    onClick={() => {
                      const q = preguntas.filter((_: any, k: number) => k !== i);
                      actualizar({ questions: q });
                    }}
                    className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <input
                type="text"
                required
                placeholder="¿Qué síntoma mencionó el paciente?"
                value={p.question || ''}
                onChange={(e) => {
                  const q = [...preguntas];
                  q[i] = { ...q[i], question: e.target.value };
                  actualizar({ questions: q });
                }}
                className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
              />

              <p className="text-[10px] text-gray-500 font-medium">Marca la opción correcta:</p>
              {(p.options || ['', '']).map((opt: string, j: number) => (
                <div key={j} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`listening-correcta-${i}`}
                    checked={Number(p.correctAnswer) === j}
                    onChange={() => {
                      const q = [...preguntas];
                      q[i] = { ...q[i], correctAnswer: j };
                      actualizar({ questions: q });
                    }}
                    className="accent-emerald-600"
                  />
                  <input
                    type="text"
                    required
                    placeholder={`Opción ${j + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const q = [...preguntas];
                      const opts = [...(q[i].options || [])];
                      opts[j] = e.target.value;
                      q[i] = { ...q[i], options: opts };
                      actualizar({ questions: q });
                    }}
                    className="flex-1 border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
                  />
                  {p.options && p.options.length > 2 && (
                    <button
                      type="button"
                      title="Eliminar opción"
                      onClick={() => {
                        const q = [...preguntas];
                        const opts = (q[i].options || []).filter((_: string, k: number) => k !== j);
                        const currCorrect = Number(q[i].correctAnswer);
                        q[i] = {
                          ...q[i],
                          options: opts,
                          correctAnswer: currCorrect >= opts.length ? 0 : currCorrect > j ? currCorrect - 1 : currCorrect
                        };
                        actualizar({ questions: q });
                      }}
                      className="p-1 text-gray-400 hover:text-rose-600"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  const q = [...preguntas];
                  q[i] = { ...q[i], options: [...(q[i].options || []), ''] };
                  actualizar({ questions: q });
                }}
                className="text-[11px] font-bold text-[#4DA6FF] hover:underline flex items-center gap-1 pt-1"
              >
                <Plus size={12} /> Añadir opción
              </button>
            </fieldset>
          ))}

          <button
            type="button"
            onClick={() => actualizar({ questions: [...preguntas, preguntaVacia()] })}
            className="w-full py-2 border border-dashed border-[#4DA6FF] text-[#4DA6FF] rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-50"
          >
            <Plus size={14} /> Añadir pregunta de comprensión
          </button>
        </div>
      </div>
    );
  }

  // ── 7. Deletreo Clínico (Spelling) ──────────────────────────────────
  if (tipo === 'spelling') {
    const rawWords = Array.isArray(datos?.words) && datos.words.length > 0
      ? datos.words
      : (datos?.expectedSpelling || datos?.word
          ? [{ term: (datos.expectedSpelling || datos.word).toUpperCase().trim(), hint: datos.hint || datos.pista || '' }]
          : [{ term: '', hint: '' }]);

    const actualizar = (nuevasPalabras: any[], extra: Record<string, any> = {}) => {
      const primera = nuevasPalabras[0] || { term: '', hint: '' };
      onChange({
        ...datos,
        gameType: 'spelling',
        words: nuevasPalabras,
        expectedSpelling: primera.term,
        word: primera.term,
        hint: primera.hint,
        ...extra
      });
    };

    const cambiarPalabra = (i: number, cambios: any) =>
      actualizar(rawWords.map((w: any, k: number) => (k === i ? { ...w, ...cambios } : w)));

    return (
      <div className="space-y-4">
        <p className="text-[10px] text-gray-500 font-medium">
          El estudiante deberá escribir o armar letra por letra cada palabra médica en inglés.
        </p>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
            Contenido / Instrucciones de la Actividad
          </label>
          <textarea
            rows={2}
            placeholder="Instrucciones para el estudiante (p. ej.: Escucha la pronunciación o lee la pista y deletrea cada término médico)..."
            value={datos?.description || datos?.instrucciones || datos?.instructions || ''}
            onChange={(e) => actualizar(rawWords, { description: e.target.value, instrucciones: e.target.value })}
            className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Palabras a Deletrear
            </span>
            <span className="text-[10px] text-gray-400 font-bold">{rawWords.length} palabra(s)</span>
          </div>

          {rawWords.map((w: any, i: number) => (
            <fieldset key={i} className="border border-emerald-200 bg-emerald-50/20 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <legend className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 px-1">
                  Palabra #{i + 1}
                </legend>
                {rawWords.length > 1 && (
                  <button
                    type="button"
                    title="Eliminar palabra"
                    onClick={() => actualizar(rawWords.filter((_: any, k: number) => k !== i))}
                    className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Palabra correcta en inglés *
                </label>
                <input
                  type="text"
                  required
                  placeholder="p. ej. SYRINGE o TEMPERATURE"
                  value={w.term || w.word || ''}
                  onChange={(e) => cambiarPalabra(i, { term: e.target.value.toUpperCase().trim(), word: e.target.value.toUpperCase().trim() })}
                  className="w-full border border-emerald-300 bg-emerald-50/40 rounded-xl p-2.5 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Pista o Definición en Español
                </label>
                <input
                  type="text"
                  placeholder="Instrumento médico para inyectar líquidos (Jeringa)"
                  value={w.hint || ''}
                  onChange={(e) => cambiarPalabra(i, { hint: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
                />
              </div>
            </fieldset>
          ))}

          <button
            type="button"
            onClick={() => actualizar([...rawWords, { term: '', hint: '' }])}
            className="w-full py-2 border border-dashed border-emerald-500 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-emerald-50"
          >
            <Plus size={14} /> Añadir otra palabra a deletrear
          </button>
        </div>
      </div>
    );
  }

  // ── 8. Caso Clínico / Simulación ────────────────────────────────────
  if (tipo === 'caso_clinico') {
    const rawQuestions = Array.isArray(datos?.questions) && datos.questions.length > 0
      ? datos.questions
      : (datos?.question
          ? [{ question: datos.question, options: datos.options || ['', ''], correctAnswer: datos.correctAnswer ?? 0 }]
          : [{ question: '', options: ['', ''], correctAnswer: 0 }]);

    const actualizar = (nuevasPreguntas: any[], extra: Record<string, any> = {}) => {
      const primera = nuevasPreguntas[0] || { question: '', options: ['', ''], correctAnswer: 0 };
      onChange({
        ...datos,
        gameType: 'caso_clinico',
        questions: nuevasPreguntas,
        question: primera.question,
        options: primera.options,
        correctAnswer: primera.correctAnswer,
        ...extra
      });
    };

    const cambiarPregunta = (i: number, cambios: any) =>
      actualizar(rawQuestions.map((q: any, k: number) => (k === i ? { ...q, ...cambios } : q)));

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
            Escenario del Caso Clínico (Paciente, Signos Vitales, Síntomas) *
          </label>
          <textarea
            rows={4}
            required
            placeholder="A 54-year-old male patient arrives at the ER complaining of severe chest pain radiating to the left arm. BP is 150/95 mmHg..."
            value={datos?.scenario || ''}
            onChange={(e) => actualizar(rawQuestions, { scenario: e.target.value })}
            className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Preguntas de Toma de Decisiones Clínicas
            </span>
            <span className="text-[10px] text-gray-400 font-bold">{rawQuestions.length} pregunta(s)</span>
          </div>

          {rawQuestions.map((q: any, i: number) => (
            <fieldset key={i} className="border border-purple-200 bg-purple-50/20 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <legend className="text-[10px] font-bold uppercase tracking-wider text-purple-700 px-1">
                  Pregunta #{i + 1}
                </legend>
                {rawQuestions.length > 1 && (
                  <button
                    type="button"
                    title="Eliminar pregunta"
                    onClick={() => actualizar(rawQuestions.filter((_: any, k: number) => k !== i))}
                    className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Enunciado de la Pregunta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="What is the immediate nursing priority action?"
                  value={q.question || ''}
                  onChange={(e) => cambiarPregunta(i, { question: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Opciones de Decisión (Marca la correcta) *
                </label>
                {(q.options || ['', '']).map((opt: string, j: number) => (
                  <div key={j} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`caso-correcta-${i}`}
                      checked={Number(q.correctAnswer ?? 0) === j}
                      onChange={() => cambiarPregunta(i, { correctAnswer: j })}
                      className="accent-emerald-600"
                    />
                    <input
                      type="text"
                      required
                      placeholder={`Opción de acción ${j + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const opts = [...(q.options || [])];
                        opts[j] = e.target.value;
                        cambiarPregunta(i, { options: opts });
                      }}
                      className="flex-1 border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
                    />
                    {(q.options || []).length > 2 && (
                      <button
                        type="button"
                        title="Eliminar opción"
                        onClick={() => {
                          const opts = (q.options || []).filter((_: string, k: number) => k !== j);
                          const currCorrect = Number(q.correctAnswer ?? 0);
                          cambiarPregunta(i, {
                            options: opts,
                            correctAnswer: currCorrect >= opts.length ? 0 : currCorrect > j ? currCorrect - 1 : currCorrect
                          });
                        }}
                        className="p-1 text-gray-400 hover:text-rose-600"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => cambiarPregunta(i, { options: [...(q.options || []), ''] })}
                  className="text-[11px] font-bold text-[#4DA6FF] hover:underline flex items-center gap-1 mt-1"
                >
                  <Plus size={12} /> Añadir opción de decisión
                </button>
              </div>
            </fieldset>
          ))}

          <button
            type="button"
            onClick={() => actualizar([...rawQuestions, { question: '', options: ['', ''], correctAnswer: 0 }])}
            className="w-full py-2 border border-dashed border-purple-400 text-purple-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-purple-50"
          >
            <Plus size={14} /> Añadir Pregunta al Caso Clínico
          </button>
        </div>
      </div>
    );
  }

  // ── Grabaciones: las revisa el instructor ──────────────────────────
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
        Esta actividad no se califica sola: queda pendiente de tu revisión y no suma
        progreso al aprendiz hasta que le pongas nota.
      </div>
      <textarea
        rows={3}
        placeholder="Consigna para el aprendiz (qué debe grabar)"
        value={datos?.consigna || ''}
        onChange={(e) => onChange({ ...datos, consigna: e.target.value })}
        className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
      />
      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          Duración máxima en segundos (opcional)
        </span>
        <input
          type="number"
          min={1}
          placeholder="60"
          value={datos?.maxDurationSeconds ?? ''}
          onChange={(e) => onChange({ ...datos, maxDurationSeconds: e.target.value })}
          className="w-full mt-1 border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
        />
      </label>
    </div>
  );
};

/** Aviso de cómo se calificará el tipo elegido, para que no haya sorpresas. */
export const AvisoDeCalificacion: React.FC<{ modo?: string; descripcion?: string }> = ({ modo, descripcion }) => {
  if (!descripcion) return null;
  const automatica = modo === 'automatica';
  return (
    <div className={`p-2.5 rounded-xl text-[11px] font-medium flex items-start gap-2 ${
      automatica ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                 : 'bg-amber-50 border border-amber-200 text-amber-900'
    }`}>
      <Check size={14} className="shrink-0 mt-0.5" />
      <span>{descripcion}</span>
    </div>
  );
};
