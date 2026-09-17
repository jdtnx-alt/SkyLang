import React, { useMemo, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, RotateCcw, Send, Type, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export interface SpellingItem {
  term: string;
  hint?: string;
  definition?: string;
}

export interface SpellingGameProps {
  data: {
    words?: SpellingItem[];
    terms?: SpellingItem[];
    items?: SpellingItem[];
    [key: string]: any;
  };
  savedState?: any;
  isCompleted?: boolean;
  onEvaluate?: (isCorrect: boolean, answers: any, score?: number) => void;
  onComplete?: () => void;
}

export const SpellingGame: React.FC<SpellingGameProps> = ({
  data,
  savedState,
  isCompleted = false,
  onEvaluate,
  onComplete
}) => {
  const termsList: SpellingItem[] = useMemo(() => {
    const raw = data?.words || data?.terms || data?.items || [
      { term: 'Stethoscope', hint: 'Instrument used for listening to internal sounds' },
      { term: 'Syringe', hint: 'Medical device used to inject or withdraw fluids' },
      { term: 'Thermometer', hint: 'Instrument for measuring temperature' }
    ];
    return raw
      .map((item: any) => ({
        term: (typeof item === 'string' ? item : item.term || item.word || '').trim(),
        hint: typeof item === 'object' ? item.hint || item.definition || '' : ''
      }))
      .filter((item) => item.term);
  }, [data]);

  const [inputs, setInputs] = useState<Record<number, string>>(() => savedState || {});
  const [submitted, setSubmitted] = useState<boolean>(isCompleted);
  const [activeIndex, setActiveIndex] = useState(0);
  const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});

  const filledCount = termsList.filter((_, i) => Boolean(inputs[i]?.trim())).length;
  const isAllFilled = filledCount === termsList.length;
  const activeTerm = termsList[activeIndex] || termsList[0];

  const handleSpeakWord = (word: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  };

  const handleSubmit = () => {
    if (!isAllFilled || submitted) return;
    setSubmitted(true);
    const respuestasArray = termsList.map((item, i) => inputs[i]?.trim() || '');
    const payload: Record<string, any> = {
      respuestas: respuestasArray,
      spelling: respuestasArray[0] || ''
    };

    termsList.forEach((item, i) => {
      payload[item.term] = inputs[i]?.trim() || '';
    });

    const correctCount = termsList.filter((item, i) => (inputs[i]?.trim() || '').toLowerCase() === item.term.toLowerCase()).length;
    const isAllCorrect = correctCount === termsList.length;
    const score = Math.round((correctCount / termsList.length) * 100);

    if (isAllCorrect) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.66 } });
    }
    onEvaluate?.(isAllCorrect, payload, score);
    onComplete?.();
  };

  const handleReset = () => {
    setInputs({});
    setSubmitted(false);
    setActiveIndex(0);
    setRevealedHints({});
  };

  return (
    <div className="skylang-game bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl text-white shadow-sm">
            <Type size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Spelling Game
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-extrabold">
                {filledCount}/{termsList.length} terms
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {data?.description || data?.instrucciones || data?.instructions || 'Listen, check the hint if needed, and write the medical term in English.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-purple-700 bg-slate-100 hover:bg-purple-50 px-3 py-1.5 rounded-xl transition-all font-bold border border-slate-200"
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
        <div className="space-y-2">
          {termsList.map((item, idx) => {
            const isActive = activeIndex === idx;
            const isFilled = Boolean(inputs[idx]?.trim());
            return (
              <button
                key={`${item.term}-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`w-full min-h-12 rounded-2xl border px-3 text-left text-xs font-bold flex items-center justify-between transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                    : isFilled
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-purple-300'
                }`}
              >
                <span>Term {idx + 1}</span>
                {isFilled && <CheckCircle2 size={15} />}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-extrabold text-purple-700 uppercase tracking-wider block">
                Challenge #{activeIndex + 1}
              </span>
              <p className="text-xs text-slate-600 font-semibold">
                {revealedHints[activeIndex] && activeTerm?.hint ? activeTerm.hint : 'Use the audio and type the word you hear.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSpeakWord(activeTerm.term)}
                className="text-xs text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 bg-purple-50 px-3 py-2 rounded-xl cursor-pointer"
              >
                <Volume2 size={14} /> Listen
              </button>
              <button
                type="button"
                onClick={() => setRevealedHints((prev) => ({ ...prev, [activeIndex]: !prev[activeIndex] }))}
                className="text-xs text-slate-700 hover:text-purple-900 font-bold flex items-center gap-1 bg-white border border-slate-200 px-3 py-2 rounded-xl cursor-pointer"
              >
                {revealedHints[activeIndex] ? <EyeOff size={14} /> : <Eye size={14} />} Hint
              </button>
            </div>
          </div>

          <input
            type="text"
            value={inputs[activeIndex] || ''}
            onChange={(event) => setInputs({ ...inputs, [activeIndex]: event.target.value })}
            placeholder="Type the word in English..."
            disabled={submitted}
            className="w-full px-4 py-4 bg-white border border-slate-300 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-slate-100"
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setActiveIndex((value) => Math.max(0, value - 1))}
              disabled={activeIndex === 0}
              className="sm:w-32 py-3 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((value) => Math.min(termsList.length - 1, value + 1))}
              disabled={activeIndex === termsList.length - 1}
              className="sm:w-32 py-3 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isAllFilled || submitted}
        className={`w-full py-3.5 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm ${
          isAllFilled && !submitted
            ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer hover:shadow-md'
            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
        }`}
      >
        <Send size={15} />
        {submitted ? 'Answers submitted' : 'Submit spelling'}
      </button>
    </div>
  );
};
