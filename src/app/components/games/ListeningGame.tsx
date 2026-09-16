import React, { useMemo, useState } from 'react';
import { Check, Headphones, Pause, Play, RotateCcw, Send, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export interface ListeningQuestion {
  question: string;
  options: string[];
  audioText?: string;
  audioUrl?: string;
}

export interface ListeningGameProps {
  data: {
    audioUrl?: string;
    audioText?: string;
    questions?: ListeningQuestion[];
    question?: string;
    options?: string[];
    [key: string]: any;
  };
  savedState?: any;
  isCompleted?: boolean;
  onEvaluate?: (isCorrect: boolean, answers: any, score?: number) => void;
  onComplete?: () => void;
}

export const ListeningGame: React.FC<ListeningGameProps> = ({
  data,
  savedState,
  isCompleted = false,
  onEvaluate,
  onComplete
}) => {
  const questions: ListeningQuestion[] = useMemo(() => {
    if (Array.isArray(data?.questions) && data.questions.length > 0) return data.questions;
    if (data?.question && Array.isArray(data?.options)) {
      return [{ question: data.question, options: data.options, audioText: data.audioText }];
    }
    return [
      {
        question: 'What symptom did the patient report first?',
        options: ['High fever', 'Severe chest pain', 'Shortness of breath', 'Mild headache'],
        audioText: 'Good morning nurse. I have been feeling a severe chest pain since last night.'
      }
    ];
  }, [data]);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>(() => savedState || {});
  const [submitted, setSubmitted] = useState<boolean>(isCompleted);
  const [playCount, setPlayCount] = useState(0);
  const [rate, setRate] = useState(0.9);

  const answeredCount = Object.keys(selectedAnswers).length;
  const isAllAnswered = answeredCount === questions.length;

  const handlePlayAudio = (textToSpeak?: string) => {
    const text = textToSpeak || data?.audioText || questions[0]?.audioText || 'Listen carefully to the medical instruction.';
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.onstart = () => {
      setIsPlaying(true);
      setPlayCount((value) => value + 1);
    };
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleStopAudio = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  const handleSubmit = () => {
    if (!isAllAnswered || submitted) return;
    setSubmitted(true);
    const answersArray = questions.map((_, i) => selectedAnswers[i] ?? null);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.64 } });
    onEvaluate?.(true, { respuestas: answersArray, reproducciones: playCount, velocidad: rate }, 100);
    onComplete?.();
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setSubmitted(false);
    setPlayCount(0);
    handleStopAudio();
  };

  return (
    <div className="skylang-game bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl text-white shadow-sm">
            <Volume2 size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Listening Game
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-extrabold">
                {answeredCount}/{questions.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Escucha el caso clinico, ajusta la velocidad y responde las preguntas.
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

      <div className="p-5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => (isPlaying ? handleStopAudio() : handlePlayAudio())}
              className="w-12 h-12 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-md transition-all cursor-pointer active:scale-95"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
            </button>
            <div>
              <span className="text-xs font-extrabold text-purple-900 block">Reproductor clinico</span>
              <span className="text-[11px] text-slate-500 font-medium block">Reproducciones: {playCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[0.75, 0.9, 1].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRate(value)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold ${
                  rate === value ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                {value}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {questions.map((q, qi) => (
          <div key={qi} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-extrabold text-sm text-slate-900">{qi + 1}. {q.question}</h4>
              {q.audioText && (
                <button
                  type="button"
                  onClick={() => handlePlayAudio(q.audioText)}
                  className="shrink-0 text-purple-700 bg-purple-50 rounded-xl p-2 hover:bg-purple-100"
                  aria-label="Escuchar fragmento"
                >
                  <Headphones size={16} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.options.map((opt, oi) => {
                const isSelected = selectedAnswers[qi] === oi;
                return (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => setSelectedAnswers({ ...selectedAnswers, [qi]: oi })}
                    disabled={submitted}
                    className={`min-h-14 p-3.5 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer disabled:cursor-default ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-md font-extrabold'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check size={16} />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isAllAnswered || submitted}
        className={`w-full py-3.5 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm ${
          isAllAnswered && !submitted
            ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer hover:shadow-md'
            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
        }`}
      >
        <Send size={15} />
        {submitted ? 'Respuestas enviadas' : 'Enviar respuestas'}
      </button>
    </div>
  );
};
