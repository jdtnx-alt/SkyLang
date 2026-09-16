import React, { useState } from 'react';
import { MemoryGameActivity } from '../activities/MemoryGameActivity';
import { GameRenderer } from '../games/GameRenderer';
import { 
  CheckCircle2, XCircle, ArrowRight, RefreshCw, 
  HelpCircle, Play, FileText, Send, Sparkles, Move,
  BookOpen, Video, ExternalLink, Layers, Award, Check, RotateCcw,
  Zap, Trophy, ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import { soundEffects } from '../../utils/soundEffects';
import { BeeMascot } from '../BeeMascot';

export interface ActivityItem {
  id?: number | string;
  tipo: string;
  titulo: string;
  instrucciones?: string;
  datos_json?: any;
}

interface Momento3ActivityRunnerProps {
  activities: ActivityItem[];
  rapId?: number | string;
  onCompleteAll?: () => void;
  /** Se invoca tras cada envío calificado, para que la pantalla recargue el progreso. */
  onResultado?: () => void;
}

export const Momento3ActivityRunner: React.FC<Momento3ActivityRunnerProps> = ({
  activities = [],
  rapId,
  onCompleteAll,
  onResultado
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [feedback, setFeedback] = useState<Record<string, { isCorrect: boolean; message: string; score?: number }>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  // El estado inicial viene de la nota oficial que devuelve el servidor.
  React.useEffect(() => {
    const inicial: Record<string, { isCorrect: boolean; message: string; score?: number }> = {};
    activities.forEach((act: any, idx: number) => {
      const key = act.id || `act_${idx}`;
      const intentos = Number(act.num_intentos ?? 0);
      if (intentos > 0) {
        const nota = Number(act.mejor_calificacion ?? 0);
        inicial[key] = {
          isCorrect: Boolean(act.aprobada),
          message: act.aprobada
            ? '¡Actividad aprobada! Excelente trabajo.'
            : 'Aún no alcanzas el puntaje aprobatorio. Puedes intentarlo de nuevo.',
          score: nota
        };
      }
    });
    setFeedback(inicial);
  }, [activities]);

  if (!activities || activities.length === 0) {
    return (
      <div className="p-8 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-4">
        <BeeMascot size="md" mood="thinking" message="El instructor aún no ha publicado actividades para este momento." />
      </div>
    );
  }

  const currentActivity = activities[currentIndex] || activities[0];
  const totalActivities = activities.length;
  const currentData = currentActivity.datos_json || {};
  const actKey = currentActivity.id || `act_${currentIndex}`;
  const currentFeedback = feedback[actKey];

  const approvedCount = activities.filter((a: any, i: number) => feedback[a.id || `act_${i}`]?.isCorrect).length;
  const progressPercent = Math.round((approvedCount / totalActivities) * 100);

  const enviarAlServidor = async (respuestas: any) => {
    setUserAnswers({ ...userAnswers, [actKey]: respuestas });

    if (!currentActivity.id) {
      setErrorEnvio('Esta actividad no está registrada en el servidor.');
      return;
    }

    setIsSubmitting(true);
    setErrorEnvio(null);

    const token = localStorage.getItem('token');
    const cabeceras: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    try {
      const apertura = await fetch(`/api/student/actividades/${currentActivity.id}/intentos`, {
        method: 'POST',
        headers: cabeceras
      });
      if (!apertura.ok) {
        const detalle = await apertura.json().catch(() => ({}));
        throw new Error(detalle.error || 'No se pudo iniciar el intento.');
      }
      const { intento } = await apertura.json();

      const envio = await fetch(`/api/student/intentos/${intento.id}/enviar`, {
        method: 'POST',
        headers: cabeceras,
        body: JSON.stringify({ respuestas_json: respuestas })
      });
      if (!envio.ok) {
        const detalle = await envio.json().catch(() => ({}));
        throw new Error(detalle.error || 'No se pudo enviar tu intento.');
      }
      const resultado = await envio.json();

      if (resultado.pendienteRevision) {
        setFeedback((prev) => ({
          ...prev,
          [actKey]: {
            isCorrect: false,
            message: 'Entregado. Queda pendiente de revisión del instructor.'
          }
        }));
      } else {
        const notaIntento = Number(resultado.intento?.calificacion ?? 0);
        const notaOficial = Number(resultado.oficial?.mejorCalificacion ?? notaIntento);
        const aprobo = Boolean(resultado.oficial?.aprobada ?? resultado.aprobada);

        if (aprobo) {
          soundEffects.playCorrect();
          try {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.7 }
            });
          } catch (e) {}
        } else {
          soundEffects.playIncorrect();
        }

        setFeedback((prev) => ({
          ...prev,
          [actKey]: {
            isCorrect: aprobo,
            message: aprobo
              ? `¡Excelente! Obtuviste ${notaIntento}/100.`
              : `Obtuviste ${notaIntento}/100. Necesitas ${resultado.umbralAplicado || 70} para aprobar; ¡vuelve a intentarlo!`,
            score: notaOficial
          }
        }));
      }

      onResultado?.();

      const aprobo = resultado.oficial?.aprobada ?? resultado.aprobada;
      if (aprobo) {
        const yaAprobadas = new Set(
          Object.entries(feedback)
            .filter(([, f]) => f.isCorrect)
            .map(([clave]) => clave)
        );
        yaAprobadas.add(String(actKey));

        const siguiente = activities.findIndex((a: any, i: number) =>
          !yaAprobadas.has(String(a.id || `act_${i}`))
        );

        setTimeout(() => {
          if (siguiente >= 0) setCurrentIndex(siguiente);
          else {
            soundEffects.playCelebration();
            onCompleteAll?.();
          }
        }, 1600);
      }
    } catch (e: any) {
      soundEffects.playIncorrect();
      setErrorEnvio(e?.message || 'No se pudo guardar tu intento. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 🚀 DUOLINGO STYLE PROGRESS BAR HEADER */}
      <div className="bg-white p-5 rounded-3xl border-2 border-slate-200 border-b-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-black">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full uppercase tracking-wider text-[10px]">
              Pregunta {currentIndex + 1} de {totalActivities}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-emerald-600 flex items-center gap-1 font-bold">
              <CheckCircle2 size={16} /> {approvedCount}/{totalActivities} aprobadas
            </span>
          </div>
        </div>

        {/* Glossy Green Progress Bar */}
        <div className="w-full bg-slate-100 h-4 rounded-full p-0.5 overflow-hidden border border-slate-200">
          <motion.div
            className="h-full bg-emerald-500 rounded-full shadow-inner"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(5, progressPercent)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Activity Content Box (Card) */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 border-b-6 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h3 className="font-black text-slate-900 text-lg sm:text-xl leading-tight">
            {currentActivity.titulo}
          </h3>

          {currentActivity.instrucciones && (
            <div className="mt-3 p-4 bg-sky-50 border-2 border-sky-100 rounded-2xl flex items-start gap-3 text-sky-900 text-xs font-bold">
              <BookOpen size={18} className="text-sky-600 shrink-0 mt-0.5" />
              <span>{currentActivity.instrucciones}</span>
            </div>
          )}
        </div>

        {(
          Boolean(currentData.gameMode || currentData.game_mode || currentData.gameType || currentData.game_type) ||
          ['listening', 'spelling', 'emergency_simulator', 'emergency', 'game'].includes(currentActivity.tipo)
        ) ? (
          <GameRenderer
            activity={currentActivity}
            savedState={userAnswers[actKey]}
            isCompleted={Boolean(currentFeedback?.isCorrect)}
            onEvaluate={(_isCorrect: boolean, respuestas: any) => {
              setUserAnswers({ ...userAnswers, [actKey]: respuestas });
              enviarAlServidor(respuestas);
            }}
          />
        ) : (
          <>
        {/* ── 1. FILL IN THE BLANKS ── */}
        {(currentActivity.tipo === 'fill_in_blanks' || currentActivity.tipo === 'formulario') && (
          <FillInBlanksRenderer
            data={currentData}
            savedState={userAnswers[actKey]}
            onEvaluate={(isCorrect, userAns, score) => {
              setUserAnswers({ ...userAnswers, [actKey]: userAns });
              enviarAlServidor(userAns);
            }}
          />
        )}

        {/* ── 2. MULTIPLE CHOICE ── */}
        {(currentActivity.tipo === 'multiple_choice' || currentActivity.tipo === 'quiz') && (
          <MultipleChoiceRenderer
            data={currentData}
            savedState={userAnswers[actKey]}
            onEvaluate={(_isCorrect: boolean, respuestas: any) => {
              setUserAnswers({ ...userAnswers, [actKey]: respuestas });
              enviarAlServidor(respuestas);
            }}
          />
        )}

        {/* ── 3. MATCHING ── */}
        {currentActivity.tipo === 'matching' && (
          <MatchingRenderer
            data={currentData}
            savedState={userAnswers[actKey]}
            onEvaluate={(isCorrect, matches, score) => {
              setUserAnswers({ ...userAnswers, [actKey]: matches });
              enviarAlServidor(matches);
            }}
          />
        )}

        {/* ── 4 & 5. DRAG & DROP / DRAG WORDS ── */}
        {(currentActivity.tipo === 'drag_and_drop' || currentActivity.tipo === 'drag_drop' || currentActivity.tipo === 'drag_words') && (
          <DragWordsRenderer
            data={currentData}
            savedState={userAnswers[actKey]}
            onEvaluate={(isCorrect, placements, score) => {
              setUserAnswers({ ...userAnswers, [actKey]: placements });
              enviarAlServidor(placements);
            }}
          />
        )}

        {/* ── 6. SENTENCE ORDERING ── */}
        {currentActivity.tipo === 'sentence_ordering' && (
          <SentenceOrderingRenderer
            data={currentData}
            savedState={userAnswers[actKey]}
            onEvaluate={(isCorrect, currentOrder, score) => {
              setUserAnswers({ ...userAnswers, [actKey]: currentOrder });
              enviarAlServidor(currentOrder);
            }}
          />
        )}

        {/* ── 7. SENTENCE CONSTRUCTION ── */}
        {currentActivity.tipo === 'sentence_construction' && (
          <SentenceConstructionRenderer
            data={currentData}
            savedState={userAnswers[actKey]}
            onEvaluate={(isCorrect, builtSentence, score) => {
              setUserAnswers({ ...userAnswers, [actKey]: builtSentence });
              enviarAlServidor(builtSentence);
            }}
          />
        )}

        {/* ── 8. GRAMMAR EXERCISES ── */}
        {currentActivity.tipo === 'grammar_exercises' && (
          <GrammarExercisesRenderer
            data={currentData}
            savedState={userAnswers[actKey]}
            onEvaluate={(isCorrect, answers, score) => {
              setUserAnswers({ ...userAnswers, [actKey]: answers });
              enviarAlServidor(answers);
            }}
          />
        )}

        {/* ── 9. VOCABULARY EXERCISES ── */}
        {currentActivity.tipo === 'vocabulary_exercises' && (
          <VocabularyRenderer
            data={currentData}
            savedState={userAnswers[actKey]}
            onEvaluate={(isCorrect, answers, score) => {
              setUserAnswers({ ...userAnswers, [actKey]: answers });
              enviarAlServidor(answers);
            }}
          />
        )}

        {/* ── 10. READING COMPREHENSION ── */}
        {currentActivity.tipo === 'reading_comprehension' && (
          <ReadingComprehensionRenderer
            data={currentData}
            savedState={userAnswers[actKey]}
            onEvaluate={(isCorrect, answers, score) => {
              setUserAnswers({ ...userAnswers, [actKey]: answers });
              enviarAlServidor(answers);
            }}
          />
        )}

        {/* ── 11. WRITING ── */}
        {(currentActivity.tipo === 'writing' || currentActivity.tipo === 'caso_clinico' || currentActivity.tipo === 'grabacion_audio') && (
          <WritingRenderer
            data={currentData}
            savedState={userAnswers[actKey]}
            onEvaluate={(text: string) => {
              setUserAnswers({ ...userAnswers, [actKey]: text });
              enviarAlServidor({ text });
            }}
          />
        )}

        {/* ── 12. INTERACTIVE VIDEO ── */}
        {currentActivity.tipo === 'interactive_video' && (
          <InteractiveVideoRenderer
            data={currentData}
            savedState={userAnswers[actKey]}
            onEvaluate={(isCorrect: boolean, progress: any, score: number) => {
              setUserAnswers({ ...userAnswers, [actKey]: progress });
              enviarAlServidor(progress);
            }}
          />
        )}

        {/* ── 15. EVALUACIÓN MIXTA ── */}
        {currentActivity.tipo === 'evaluacion' && (
          <EvaluacionMixtaRenderer
            data={currentData}
            savedState={userAnswers[actKey]}
            onEvaluate={(_c: boolean, respuestas: any) => {
              setUserAnswers({ ...userAnswers, [actKey]: respuestas });
              enviarAlServidor(respuestas);
            }}
          />
        )}

        {/* ── 14. CONTENIDO DE ESTUDIO ── */}
        {['grammar_pill', 'teoria', 'storybook', 'vocabulario'].includes(currentActivity.tipo) && (
          <ContenidoDeEstudioRenderer
            data={currentData}
            onRevisado={() => enviarAlServidor({ revisado: true })}
            yaAprobado={Boolean(currentFeedback?.isCorrect)}
          />
        )}

        {/* ── 13. H5P ACTIVITIES ── */}
        {currentActivity.tipo === 'h5p' && (
          <H5PRenderer
            data={currentData}
            onComplete={() => {
              enviarAlServidor({ completed: true });
            }}
          />
        )}
          </>
        )}

        {isSubmitting && (
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            La Abejita está calificando tu respuesta...
          </div>
        )}

        {errorEnvio && (
          <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-900 flex items-start gap-3">
            <XCircle className="text-rose-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-black text-sm">No se pudo enviar tu respuesta</p>
              <p className="text-xs font-semibold">{errorEnvio}</p>
            </div>
          </div>
        )}

        {/* 🌟 DUOLINGO-STYLE BOTTOM FEEDBACK DRAWER */}
        {currentFeedback && !isSubmitting && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-3xl border-2 border-b-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${
              currentFeedback.isCorrect
                ? 'bg-emerald-50 border-emerald-300 border-b-emerald-500 text-emerald-950'
                : 'bg-rose-50 border-rose-300 border-b-rose-500 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-4">
              <BeeMascot
                size="sm"
                mood={currentFeedback.isCorrect ? 'celebrating' : 'encouraging'}
                animate
              />
              <div>
                <h4 className="font-black text-base">
                  {currentFeedback.isCorrect ? '¡Excelente trabajo!' : '¡Casi lo logras!'}
                </h4>
                <p className="text-xs font-bold opacity-90 mt-0.5">{currentFeedback.message}</p>
              </div>
            </div>

            <button
              onClick={() => {
                soundEffects.playPop();
                if (currentIndex < totalActivities - 1) {
                  setCurrentIndex(currentIndex + 1);
                } else {
                  onCompleteAll?.();
                }
              }}
              className={`btn-duo-3d px-6 py-3 text-xs shrink-0 ${
                currentFeedback.isCorrect ? 'btn-duo-emerald' : 'btn-duo-rose'
              }`}
            >
              <span>{currentIndex < totalActivities - 1 ? 'Continuar' : 'Finalizar'}</span>
              <ChevronRight size={16} />
            </button>
          </motion.div>
        )}

        {/* Footer Navigation Bar */}
        <div className="flex justify-between items-center pt-4 border-t-2 border-slate-100">
          <button
            onClick={() => {
              soundEffects.playPop();
              setCurrentIndex(Math.max(0, currentIndex - 1));
            }}
            disabled={currentIndex === 0}
            className="btn-duo-3d btn-duo-white px-4 py-2 text-xs"
          >
            Anterior
          </button>

          <div className="flex items-center gap-1.5">
            {activities.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  soundEffects.playPop();
                  setCurrentIndex(idx);
                }}
                className={`w-3 h-3 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'bg-amber-500 scale-125 ring-2 ring-amber-200'
                    : feedback[activities[idx].id || `act_${idx}`]?.isCorrect
                    ? 'bg-emerald-500'
                    : 'bg-slate-200 hover:bg-slate-300'
                }`}
                title={`Ir a Actividad ${idx + 1}`}
              />
            ))}
          </div>

          {currentIndex < totalActivities - 1 ? (
            <button
              onClick={() => {
                soundEffects.playPop();
                setCurrentIndex(currentIndex + 1);
              }}
              className="btn-duo-3d btn-duo-sky px-5 py-2 text-xs flex items-center gap-1"
            >
              <span>Siguiente</span>
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={() => {
                soundEffects.playCelebration();
                onCompleteAll?.();
              }}
              className="btn-duo-3d btn-duo-emerald px-5 py-2 text-xs flex items-center gap-1"
            >
              <Award size={16} />
              <span>Finalizar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── RENDERER 1: Fill in Blanks ──
const FillInBlanksRenderer = ({ data, savedState, onEvaluate }: any) => {
  const fields = data.fields || data.idCardFields || [{ label: "Form", expected: "Answer" }];
  const [inputs, setInputs] = useState<Record<number, string>>(savedState || {});

  const handleCheck = () => {
    // Sin clave de correccion en el cliente: se envian las respuestas tal cual.
    onEvaluate(false, inputs, 0);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map((f: any, idx: number) => (
          <div key={idx} className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-1">
            <label className="block text-xs font-bold text-slate-700">{f.label || `Espacio ${idx + 1}`}</label>
            <input
              type="text"
              className="w-full p-2 text-xs border rounded-lg bg-white font-medium focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder={f.placeholder || "Escribe tu respuesta..."}
              value={inputs[idx] || ''}
              onChange={(e) => setInputs({ ...inputs, [idx]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <button
        onClick={handleCheck}
        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2"
      >
        <Check size={16} /> Verificar Respuestas
      </button>
    </div>
  );
};

// ── RENDERER 2: Multiple Choice ──
// Recorre todas las preguntas del cuestionario. Antes solo pintaba la primera,
// de modo que en un test de dos preguntas el máximo alcanzable era 50 y la
// actividad resultaba imposible de aprobar.
const MultipleChoiceRenderer = ({ data, savedState, onEvaluate }: any) => {
  const preguntas = Array.isArray(data.questions) && data.questions.length
    ? data.questions
    : [{ question: data.question, options: data.options }];

  const [respuestas, setRespuestas] = useState<Record<number, number>>(savedState?.respuestas
    ? Object.fromEntries((savedState.respuestas as number[]).map((v, i) => [i, v]))
    : {});

  const contestadas = preguntas.filter((_: any, i: number) => respuestas[i] !== undefined).length;
  const completo = contestadas === preguntas.length;

  const enviar = () => {
    const orden = preguntas.map((_: any, i: number) => respuestas[i] ?? null);
    onEvaluate(false, { respuestas: orden }, 0);
  };

  return (
    <div className="space-y-6">
      {preguntas.map((p: any, qi: number) => {
        const opciones = p.options || data.options || ["Opción A", "Opción B"];
        return (
          <div key={qi} className="space-y-3">
            <h4 className="font-bold text-sm text-slate-900">
              <span className="text-purple-600 mr-1.5">{qi + 1}.</span>
              {p.question || p.q || 'Selecciona la opción correcta:'}
            </h4>
            <div className="space-y-2">
              {opciones.map((opt: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setRespuestas({ ...respuestas, [qi]: idx })}
                  className={`w-full p-3.5 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                    respuestas[qi] === idx
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-purple-300'
                  }`}
                >
                  <span>{opt}</span>
                  {respuestas[qi] === idx && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <button
        onClick={enviar}
        disabled={!completo}
        className={`w-full py-3 font-bold text-xs rounded-xl flex items-center justify-center gap-2 ${
          completo
            ? 'bg-purple-600 hover:bg-purple-700 text-white'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }`}
      >
        <Send size={15} />
        {completo
          ? 'Enviar respuestas'
          : `Responde las ${preguntas.length} preguntas (${contestadas}/${preguntas.length})`}
      </button>
    </div>
  );
};

// ── RENDERER 3: Matching ──
const MatchingRenderer = ({ data, savedState, onEvaluate }: any) => {
  const pairs = data.pairs || [
    { left: "Fiebre", right: "Temperatura > 38°C" },
    { left: "Taquicardia", right: "FC > 100 bpm" }
  ];
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<Record<number, number>>(savedState || {});

  const handleRightClick = (rightIdx: number) => {
    if (selectedLeft === null) return;
    const updated = { ...matched, [selectedLeft]: rightIdx };
    setMatched(updated);
    setSelectedLeft(null);

    if (Object.keys(updated).length === pairs.length) {
      onEvaluate(false, updated, 0);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-600 font-medium">Selecciona un elemento de la izquierda y luego su correspondencia a la derecha:</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          {pairs.map((p: any, idx: number) => (
            <button
              key={idx}
              onClick={() => setSelectedLeft(idx)}
              className={`w-full p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                selectedLeft === idx
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : matched[idx] !== undefined
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-purple-300'
              }`}
            >
              {p.left}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {pairs.map((p: any, idx: number) => (
            <button
              key={idx}
              onClick={() => handleRightClick(idx)}
              className={`w-full p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                Object.values(matched).includes(idx)
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-purple-300'
              }`}
            >
              {p.right}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── RENDERER 4 & 5: Drag Words ──
const DragWordsRenderer = ({ data, savedState, onEvaluate }: any) => {
  const words = data.targetWords || ["temperatura", "presión", "frecuencia"];
  const [placements, setPlacements] = useState<string[]>(savedState || []);
  const [available, setAvailable] = useState<string[]>(words);

  const addWord = (w: string) => {
    const next = [...placements, w];
    setPlacements(next);
    setAvailable(available.filter(item => item !== w));
  };

  const removeWord = (idx: number) => {
    const word = placements[idx];
    setPlacements(placements.filter((_, i) => i !== idx));
    setAvailable([...available, word]);
  };

  const handleVerify = () => {
    onEvaluate(false, placements, 0);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl min-h-20 flex flex-wrap gap-2 items-center">
        {placements.map((w, idx) => (
          <span
            key={idx}
            onClick={() => removeWord(idx)}
            className="px-3 py-1.5 bg-purple-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer hover:bg-purple-700 flex items-center gap-1"
          >
            {w} <XCircle size={14} />
          </span>
        ))}
        {placements.length === 0 && (
          <span className="text-xs text-slate-400 font-medium">Haz clic en los términos para ubicarlos aquí...</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {available.map((w, idx) => (
          <button
            key={idx}
            onClick={() => addWord(w)}
            className="px-3 py-1.5 bg-white border border-purple-200 text-purple-800 font-bold text-xs rounded-xl hover:bg-purple-50 transition-all shadow-xs"
          >
            + {w}
          </button>
        ))}
      </div>

      <button
        onClick={handleVerify}
        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2"
      >
        <Check size={16} /> Comprobar Ubicación
      </button>
    </div>
  );
};

// ── RENDERER 6: Sentence Ordering ──
const SentenceOrderingRenderer = ({ data, savedState, onEvaluate }: any) => {
  const originalItems = data.items || ["Paso 1: Lavado de manos", "Paso 2: Colocación de guantes", "Paso 3: Evaluación del paciente"];
  const [items, setItems] = useState<string[]>(savedState || originalItems);

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...items];
    const temp = next[idx - 1];
    next[idx - 1] = next[idx];
    next[idx] = temp;
    setItems(next);
  };

  const handleVerify = () => {
    const isCorrect = JSON.stringify(items) === JSON.stringify(originalItems);
    onEvaluate(isCorrect, items, isCorrect ? 100 : 40);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-bold text-slate-800">
            <span>{idx + 1}. {item}</span>
            <div className="flex gap-1">
              <button
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="px-2 py-1 bg-white border rounded text-[10px] disabled:opacity-30 hover:bg-slate-100"
              >
                ▲ Subir
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={handleVerify}
        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2"
      >
        <Check size={16} /> Verificar Orden
      </button>
    </div>
  );
};

// ── RENDERER 7: Sentence Construction ──
const SentenceConstructionRenderer = ({ data, savedState, onEvaluate }: any) => {
  const words = data.words || ["The", "nurse", "monitors", "vital", "signs"];
  const correct = data.correctSentence || words.join(' ');
  const [selectedWords, setSelectedWords] = useState<string[]>(savedState ? savedState.split(' ') : []);

  const toggleWord = (w: string, idx: number) => {
    setSelectedWords([...selectedWords, w]);
  };

  const handleCheck = () => {
    const built = selectedWords.join(' ');
    const isCorrect = built.trim().toLowerCase() === correct.trim().toLowerCase();
    onEvaluate(isCorrect, built, isCorrect ? 100 : 30);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl min-h-16 flex flex-wrap gap-2 items-center text-sm font-bold text-purple-900">
        {selectedWords.map((w, i) => (
          <span key={i} className="px-2.5 py-1 bg-purple-600 text-white rounded-lg text-xs">{w}</span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {words.map((w, i) => (
          <button
            key={i}
            onClick={() => toggleWord(w, i)}
            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:border-purple-500"
          >
            {w}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleCheck}
          className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2"
        >
          <Check size={16} /> Validar Oración
        </button>
        <button
          onClick={() => setSelectedWords([])}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl"
        >
          Limpiar
        </button>
      </div>
    </div>
  );
};

// ── RENDERER 8: Grammar Exercises ──
const GrammarExercisesRenderer = ({ data, savedState, onEvaluate }: any) => {
  const sentences = data.sentences || [{ text: "The nurse ___ (administer) medication.", answer: "administers" }];
  const [answers, setAnswers] = useState<Record<number, string>>(savedState || {});

  const handleCheck = () => {
    onEvaluate(false, answers, 0);
  };

  return (
    <div className="space-y-4">
      {sentences.map((s: any, idx: number) => (
        <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <p className="text-xs font-bold text-slate-800">{idx + 1}. {s.text}</p>
          <input
            type="text"
            className="w-full p-2 border rounded-lg text-xs bg-white font-medium"
            placeholder="Escribe la forma correcta..."
            value={answers[idx] || ''}
            onChange={(e) => setAnswers({ ...answers, [idx]: e.target.value })}
          />
        </div>
      ))}
      <button
        onClick={handleCheck}
        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2"
      >
        <Check size={16} /> Evaluar Gramática
      </button>
    </div>
  );
};

// ── RENDERER 9: Vocabulary ──
const VocabularyRenderer = ({ data, savedState, onEvaluate }: any) => {
  const terms = data.terms || [
    { word: "Hypertension", definition: "High blood pressure", example: "BP > 140/90 mmHg" }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {terms.map((t: any, idx: number) => (
        <div key={idx} className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2">
          <span className="text-xs font-extrabold uppercase text-purple-600 tracking-wider">Término #{idx + 1}</span>
          <h4 className="font-extrabold text-base text-purple-950">{t.word}</h4>
          <p className="text-xs text-slate-700 font-medium">{t.definition}</p>
          {t.example && (
            <p className="text-[11px] text-purple-800 italic bg-white p-2 rounded-lg border border-purple-100">
              Ejemplo: "{t.example}"
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

// ── RENDERER 10: Reading Comprehension ──
const ReadingComprehensionRenderer = ({ data, savedState, onEvaluate }: any) => {
  const passage = data.passage || "Clinical reading text...";
  const questions = data.questions || [{ question: "What is the primary topic?", options: ["Option A", "Option B"], correctIndex: 0 }];
  const [selected, setSelected] = useState<Record<number, number>>(savedState || {});

  const handleCheck = () => {
    onEvaluate(false, selected, 0);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-h-80 overflow-y-auto space-y-2">
        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Texto de Lectura</h4>
        <p className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-line">{passage}</p>
      </div>

      <div className="space-y-4">
        {questions.map((q: any, qIdx: number) => (
          <div key={qIdx} className="space-y-2">
            <h5 className="font-bold text-xs text-slate-900">{qIdx + 1}. {q.question}</h5>
            <div className="space-y-1">
              {(q.options || []).map((opt: string, oIdx: number) => (
                <button
                  key={oIdx}
                  onClick={() => setSelected({ ...selected, [qIdx]: oIdx })}
                  className={`w-full p-2.5 rounded-xl border text-left text-xs font-semibold ${
                    selected[qIdx] === oIdx ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button
          onClick={handleCheck}
          className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2"
        >
          <Check size={16} /> Enviar Comprensión
        </button>
      </div>
    </div>
  );
};

// ── RENDERER 11: Writing ──
const WritingRenderer = ({ data, savedState, onEvaluate }: any) => {
  const [text, setText] = useState<string>(savedState?.text || '');
  const minWords = data.minWords || 10;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-xs">
        <span className="font-bold text-slate-700">Producción Escrita</span>
        <span className={`font-bold ${wordCount >= minWords ? 'text-emerald-600' : 'text-amber-600'}`}>
          Palabras: {wordCount} (Mínimo: {minWords})
        </span>
      </div>
      <textarea
        rows={5}
        className="w-full p-3 border border-slate-200 rounded-2xl text-xs bg-white font-medium focus:ring-2 focus:ring-purple-500 outline-none"
        placeholder="Escribe tu respuesta estructurada aquí..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        onClick={() => onEvaluate(text)}
        disabled={wordCount < minWords}
        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2"
      >
        <Send size={16} /> Entregar Respuesta Escrita
      </button>
    </div>
  );
};

// ── RENDERER 12: Interactive Video ──
const InteractiveVideoRenderer = ({ data, savedState, onEvaluate }: any) => {
  const videoUrl = data.videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4";

  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
        <video controls className="w-full h-full">
          <source src={videoUrl} type="video/mp4" />
          Tu navegador no soporta el reproductor de video.
        </video>
      </div>
      <button
        onClick={() => onEvaluate(true, { watched: true }, 100)}
        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2"
      >
        <Check size={16} /> Confirmar Visualización y Preguntas
      </button>
    </div>
  );
};

// ── RENDERER 13: H5P ──
const H5PRenderer = ({ data, onComplete }: any) => {
  const embedUrl = data.embedUrl || "https://h5p.org/h5p/embed/617";

  return (
    <div className="space-y-4">
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <iframe
          src={embedUrl}
          className="w-full h-96 border-none"
          title="Recurso H5P Interactivo"
          allow="geolocation; microphone; camera; midi; encrypted-media"
        />
      </div>
      <button
        onClick={onComplete}
        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2"
      >
        <CheckCircle2 size={16} /> Marcar H5P Completado
      </button>
    </div>
  );
};

// ── RENDERER 14: Contenido de estudio ──
// Las actividades de teoría no tienen respuesta correcta: se completan al
// revisarlas. Antes no existía ningún renderizador para ellas, así que eran
// obligatorias pero imposibles de realizar, y dejaban el RAP atascado.
const ContenidoDeEstudioRenderer = ({ data, onRevisado, yaAprobado }: any) => {
  const objetivos = data.objectives || data.objetivos;
  const pildora = data.grammarPill;
  const vocabulario = data.vocabulary || data.vocabulario || [];
  const dialogos = data.dialogues || data.dialogos || [];
  const calentamiento = data.warmupPairs || [];

  return (
    <div className="space-y-5">
      {data.videoUrl && (
        <div className="aspect-video rounded-2xl overflow-hidden border border-slate-200">
          <iframe src={data.videoUrl} className="w-full h-full" title="Vídeo de la lección" allowFullScreen />
        </div>
      )}

      {objetivos && (
        <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block mb-1">Objetivos</span>
          <p className="text-xs text-slate-800 font-medium">{objetivos}</p>
        </div>
      )}

      {calentamiento.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {calentamiento.map((p: any, i: number) => (
            <div key={i} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{p.label}</span>
              <span className="block text-sm font-bold text-slate-800">{p.text}</span>
            </div>
          ))}
        </div>
      )}

      {pildora && (
        <div className="p-4 rounded-2xl border border-purple-100 bg-purple-50/50 space-y-2">
          <h4 className="font-bold text-sm text-purple-950">{pildora.title}</h4>
          <p className="text-xs text-slate-700 font-medium">{pildora.explanation}</p>
          <div className="space-y-1">
            {(pildora.examples || []).map((e: any, i: number) => (
              <p key={i} className="text-xs font-mono text-slate-800">
                <span className="text-blue-700 font-bold">{e.subject}</span>{' '}
                <span className="text-emerald-700 font-bold">{e.verb}</span>{' '}
                <span className="text-slate-700">{e.complement}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {vocabulario.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vocabulario</span>
          {vocabulario.map((v: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
              <div>
                <span className="font-bold text-sm text-slate-900">{v.word}</span>
                <span className="text-xs text-slate-500 font-mono ml-2">{v.phonetic}</span>
              </div>
              <span className="text-xs font-semibold text-slate-600">{v.translation}</span>
            </div>
          ))}
        </div>
      )}

      {dialogos.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Diálogo</span>
          {dialogos.map((d: any, i: number) => (
            <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-purple-700 block">{d.speaker} · {d.role}</span>
              <span className="text-xs text-slate-800 font-medium">{d.text}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onRevisado}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2"
      >
        <CheckCircle2 size={16} /> {yaAprobado ? 'Marcar de nuevo como revisado' : 'He revisado el contenido'}
      </button>
    </div>
  );
};

// ── RENDERER 15: Evaluación mixta ──
// Una sola prueba con preguntas de opción múltiple y de respuesta corta.
// Las respuestas correctas no llegan al navegador: el veredicto lo da el servidor.
const EvaluacionMixtaRenderer = ({ data, savedState, onEvaluate }: any) => {
  const items = Array.isArray(data.items) ? data.items : [];
  const [respuestas, setRespuestas] = useState<Record<number, any>>(savedState?.respuestas
    ? Object.fromEntries((savedState.respuestas as any[]).map((v, i) => [i, v]))
    : {});

  const contestadas = items.filter((_: any, i: number) =>
    respuestas[i] !== undefined && String(respuestas[i]).trim() !== ''
  ).length;
  const completo = items.length > 0 && contestadas === items.length;

  const enviar = () => onEvaluate(false, { respuestas: items.map((_: any, i: number) => respuestas[i] ?? null) });

  if (items.length === 0) {
    return <p className="text-xs text-slate-500 font-medium">Esta evaluación todavía no tiene preguntas.</p>;
  }

  return (
    <div className="space-y-6">
      {items.map((item: any, i: number) => (
        <div key={i} className="space-y-3">
          <h4 className="font-bold text-sm text-slate-900">
            <span className="text-purple-600 mr-1.5">{i + 1}.</span>
            {item.enunciado}
          </h4>

          {item.tipo === 'respuesta_corta' ? (
            <input
              type="text"
              placeholder="Escribe tu respuesta"
              value={respuestas[i] ?? ''}
              onChange={(e) => setRespuestas({ ...respuestas, [i]: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-400"
            />
          ) : (
            <div className="space-y-2">
              {(item.opciones || []).map((opt: string, j: number) => (
                <button
                  key={j}
                  onClick={() => setRespuestas({ ...respuestas, [i]: j })}
                  className={`w-full p-3.5 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                    respuestas[i] === j
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-purple-300'
                  }`}
                >
                  <span>{opt}</span>
                  {respuestas[i] === j && <Check size={16} />}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <button
        onClick={enviar}
        disabled={!completo}
        className={`w-full py-3 font-bold text-xs rounded-xl flex items-center justify-center gap-2 ${
          completo ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }`}
      >
        <Send size={15} />
        {completo ? 'Enviar evaluación' : `Responde las ${items.length} preguntas (${contestadas}/${items.length})`}
      </button>
    </div>
  );
};
