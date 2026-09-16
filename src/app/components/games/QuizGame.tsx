import React, { useMemo, useState } from 'react';
import { Check, CheckCircle2, HelpCircle, RotateCcw, Send, Sparkles, Target, Timer } from 'lucide-react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';

export interface QuizQuestion {
  id?: string | number;
  question: string;
  options: string[];
}

export interface QuizGameProps {
  data: {
    questions?: QuizQuestion[];
    question?: string;
    options?: string[];
    title?: string;
    [key: string]: any;
  };
  savedState?: any;
  isCompleted?: boolean;
  onEvaluate?: (isCorrect: boolean, answers: any, score?: number) => void;
  onComplete?: () => void;
}

const fallbackQuestion: QuizQuestion = {
  question: 'What is the primary role of a triage nurse?',
  options: [
    'Diagnose complex medical illnesses',
    'Assess and prioritize patient care needs upon arrival',
    'Perform surgical operations',
    'Administer pharmacy prescriptions'
  ]
};

export const QuizGame: React.FC<QuizGameProps> = ({
  data,
  savedState,
  isCompleted = false,
  onEvaluate,
  onComplete
}) => {
  const questions: QuizQuestion[] = useMemo(() => {
    if (Array.isArray(data?.questions) && data.questions.length > 0) return data.questions;
    if (data?.question && Array.isArray(data?.options)) return [{ question: data.question, options: data.options }];
    return [fallbackQuestion];
  }, [data]);

  const initialAnswers = useMemo(() => {
    if (savedState?.respuestas && Array.isArray(savedState.respuestas)) {
      return Object.fromEntries(savedState.respuestas.map((v: number, i: number) => [i, v]));
    }
    return {};
  }, [savedState]);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>(initialAnswers);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitted, setSubmitted] = useState<boolean>(isCompleted);
  const [streak, setStreak] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const answeredCount = Object.keys(selectedAnswers).length;
  const progress = Math.round((answeredCount / questions.length) * 100);
  const isAllAnswered = answeredCount === questions.length;
  const question = questions[currentQuestion] || questions[0];

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    if (submitted) return;
    if (!startedAt) setStartedAt(Date.now());
    setSelectedAnswers((prev) => {
      const isChanging = prev[questionIndex] !== undefined && prev[questionIndex] !== optionIndex;
      setStreak((value) => (isChanging ? 1 : value + 1));
      return { ...prev, [questionIndex]: optionIndex };
    });
  };

  const handleSubmit = () => {
    if (!isAllAnswered || submitted) return;
    setSubmitted(true);

    const answersArray = questions.map((_, i) => selectedAnswers[i] ?? null);
    const elapsedSeconds = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 0;

    confetti({ particleCount: 90, spread: 70, origin: { y: 0.68 } });
    onEvaluate?.(true, { respuestas: answersArray, tiempo_segundos: elapsedSeconds }, 100);
    onComplete?.();
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setCurrentQuestion(0);
    setSubmitted(false);
    setStreak(0);
    setStartedAt(null);
  };

  return (
    <div className="skylang-game bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl text-white shadow-sm">
            <HelpCircle size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex flex-wrap items-center gap-2">
              {data?.title || 'Quiz Game'}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-extrabold">
                {answeredCount}/{questions.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Responde una pregunta a la vez y avanza hasta completar el reto.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-purple-700 bg-slate-100 hover:bg-purple-50 px-3 py-1.5 rounded-xl transition-all font-bold border border-slate-200"
        >
          <RotateCcw size={14} /> Reiniciar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
          <span className="text-[11px] font-extrabold uppercase text-slate-500 flex items-center gap-1.5">
            <Target size={14} /> Progreso
          </span>
          <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-purple-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-3">
          <span className="text-[11px] font-extrabold uppercase text-indigo-700 flex items-center gap-1.5">
            <Sparkles size={14} /> Racha
          </span>
          <strong className="text-sm text-indigo-950">{streak} selecciones activas</strong>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
          <span className="text-[11px] font-extrabold uppercase text-emerald-700 flex items-center gap-1.5">
            <Timer size={14} /> Ritmo
          </span>
          <strong className="text-sm text-emerald-950">{isAllAnswered ? 'Listo para enviar' : 'En progreso'}</strong>
        </div>
      </div>

      <motion.div
        key={currentQuestion}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-4"
      >
        <h4 className="font-extrabold text-sm text-slate-900 flex items-start gap-2">
          <span className="w-7 h-7 rounded-lg bg-purple-600 text-white text-xs font-black flex items-center justify-center shrink-0">
            {currentQuestion + 1}
          </span>
          <span>{question.question}</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {(question.options || []).map((opt, oi) => {
            const isSelected = selectedAnswers[currentQuestion] === oi;
            return (
              <button
                key={oi}
                type="button"
                onClick={() => handleSelectOption(currentQuestion, oi)}
                className={`min-h-14 p-3.5 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md font-extrabold'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300 hover:bg-purple-50/50'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] shrink-0 ${
                    isSelected ? 'border-white text-white font-black' : 'border-slate-300 text-slate-500'
                  }`}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span>{opt}</span>
                </span>
                {isSelected && <Check size={16} />}
              </button>
            );
          })}
        </div>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => setCurrentQuestion((value) => Math.max(0, value - 1))}
          disabled={currentQuestion === 0}
          className="sm:w-32 py-3 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => setCurrentQuestion((value) => Math.min(questions.length - 1, value + 1))}
          disabled={currentQuestion === questions.length - 1}
          className="sm:w-32 py-3 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-40"
        >
          Siguiente
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isAllAnswered || submitted}
          className={`flex-1 py-3.5 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm ${
            isAllAnswered && !submitted
              ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer hover:shadow-md'
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
          }`}
        >
          {submitted ? (
            <>
              <CheckCircle2 size={16} className="text-emerald-500" /> Respuestas enviadas
            </>
          ) : (
            <>
              <Send size={15} /> Enviar respuestas
            </>
          )}
        </button>
      </div>
    </div>
  );
};
