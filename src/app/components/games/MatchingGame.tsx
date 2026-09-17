import React, { useMemo, useState } from 'react';
import { CheckCircle2, Layers, Link2, RotateCcw, Shuffle, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';

export interface MatchingPair {
  left?: string;
  right?: string;
  label?: string;
  text?: string;
  term?: string;
  definition?: string;
}

export interface MatchingGameProps {
  data: {
    pairs?: MatchingPair[];
    warmupPairs?: MatchingPair[];
    vocabulary?: MatchingPair[];
    [key: string]: any;
  };
  savedState?: any;
  isCompleted?: boolean;
  onEvaluate?: (isCorrect: boolean, answers: any, score?: number) => void;
  onComplete?: () => void;
}

function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const MatchingGame: React.FC<MatchingGameProps> = ({
  data,
  savedState,
  onEvaluate,
  onComplete
}) => {
  const cleanPairs = useMemo(() => {
    const raw = data?.pairs || data?.warmupPairs || data?.vocabulary || [
      { left: 'Nurse', right: 'Enfermera' },
      { left: 'Patient', right: 'Paciente' },
      { left: 'Doctor', right: 'Medico' }
    ];
    return raw
      .map((p) => ({
        left: (p.left || p.label || p.term || '').trim(),
        right: (p.right || p.text || p.definition || '').trim()
      }))
      .filter((p) => p.left && p.right);
  }, [data]);

  const [rightOptions, setRightOptions] = useState(() => shuffleArray(cleanPairs.map((p) => p.right)));
  const [selectedLeftIndex, setSelectedLeftIndex] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>(() => savedState || {});
  const [attempts, setAttempts] = useState(0);
  const [lastPair, setLastPair] = useState<string | null>(null);
  const [wrongMatch, setWrongMatch] = useState<{ left: string; right: string } | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const matchedCount = Object.keys(matches).length;
  const isFinished = matchedCount === cleanPairs.length;

  const completeIfReady = (updated: Record<string, string>) => {
    if (Object.keys(updated).length !== cleanPairs.length) return;
    confetti({ particleCount: 110, spread: 75, origin: { y: 0.62 } });
    const payload = {
      ...updated,
      respuestas: cleanPairs.map((p) => updated[p.left] || '')
    };
    onEvaluate?.(true, payload, 100);
    onComplete?.();
  };

  const handleLeftClick = (index: number) => {
    if (matches[cleanPairs[index].left]) return;
    setSelectedLeftIndex(index === selectedLeftIndex ? null : index);
    setFeedbackMsg(null);
  };

  const handleRightClick = (rightText: string) => {
    if (selectedLeftIndex === null || Object.values(matches).includes(rightText)) return;
    const currentPair = cleanPairs[selectedLeftIndex];
    const leftText = currentPair.left;
    const expectedRight = currentPair.right;

    setAttempts((value) => value + 1);

    // Validar si es la pareja correcta
    const isCorrect = expectedRight.trim().toLowerCase() === rightText.trim().toLowerCase();

    if (isCorrect) {
      const updated = { ...matches, [leftText]: rightText };
      setMatches(updated);
      setLastPair(`${leftText} ➔ ${rightText} (Correct!)`);
      setFeedbackMsg({ type: 'success', text: `Correct match! "${leftText}" matches "${rightText}".` });
      setSelectedLeftIndex(null);
      setWrongMatch(null);
      completeIfReady(updated);
    } else {
      setLastPair(`${leftText} ✗ ${rightText} (Incorrect)`);
      setFeedbackMsg({ type: 'error', text: `"${rightText}" is not the correct match for "${leftText}". Try again!` });
      setWrongMatch({ left: leftText, right: rightText });
      setTimeout(() => {
        setWrongMatch(null);
      }, 1200);
    }
  };

  const handleReset = () => {
    setSelectedLeftIndex(null);
    setMatches({});
    setAttempts(0);
    setLastPair(null);
    setWrongMatch(null);
    setFeedbackMsg(null);
    setRightOptions(shuffleArray(cleanPairs.map((p) => p.right)));
  };

  return (
    <div className="skylang-game bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl text-white shadow-sm">
            <Layers size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Matching Game
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-extrabold">
                {matchedCount}/{cleanPairs.length} pairs
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Choose a term and connect it with its translation or definition.
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
          <span className="text-[11px] font-extrabold uppercase text-slate-500 flex items-center gap-1.5">
            <Link2 size={14} /> Connections
          </span>
          <strong className="text-sm text-slate-950">{matchedCount} completed</strong>
        </div>
        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-3">
          <span className="text-[11px] font-extrabold uppercase text-indigo-700 flex items-center gap-1.5">
            <Zap size={14} /> Attempts
          </span>
          <strong className="text-sm text-indigo-950">{attempts}</strong>
        </div>
        <button
          type="button"
          onClick={() => setRightOptions(shuffleArray(rightOptions))}
          className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 text-left hover:bg-emerald-100 transition-colors"
        >
          <span className="text-[11px] font-extrabold uppercase text-emerald-700 flex items-center gap-1.5">
            <Shuffle size={14} /> Shuffle
          </span>
          <strong className="text-sm text-emerald-950">Reorder column</strong>
        </button>
      </div>

      {feedbackMsg && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-3 text-xs font-bold border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedbackMsg.text}
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider text-center">Terms</h4>
          {cleanPairs.map((pair, idx) => {
            const isSelected = selectedLeftIndex === idx;
            const isMatched = Boolean(matches[pair.left]);
            const isWrong = wrongMatch?.left === pair.left;
            return (
              <button
                key={pair.left}
                type="button"
                onClick={() => handleLeftClick(idx)}
                className={`w-full min-h-14 p-4 rounded-2xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                  isMatched
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : isWrong
                      ? 'bg-rose-50 border-rose-400 text-rose-800 animate-shake ring-2 ring-rose-400'
                      : isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-md font-extrabold scale-[1.02]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-purple-300'
                }`}
              >
                <span>{pair.left}</span>
                {isMatched && <CheckCircle2 size={16} className="text-emerald-600" />}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider text-center">Definitions / Translations</h4>
          {rightOptions.map((rightText) => {
            const isMatchedWithLeft = Object.values(matches).includes(rightText);
            const isWrong = wrongMatch?.right === rightText;
            return (
              <button
                key={rightText}
                type="button"
                onClick={() => handleRightClick(rightText)}
                disabled={selectedLeftIndex === null || isMatchedWithLeft}
                className={`w-full min-h-14 p-4 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                  isMatchedWithLeft
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : isWrong
                      ? 'bg-rose-50 border-rose-400 text-rose-800 animate-shake ring-2 ring-rose-400'
                      : selectedLeftIndex !== null
                        ? 'bg-white text-slate-700 border-purple-300 hover:bg-purple-50 shadow-xs cursor-pointer'
                        : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                }`}
              >
                <span>{rightText}</span>
                {isMatchedWithLeft && <CheckCircle2 size={16} className="text-emerald-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {isFinished && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={18} /> Activity completed: all pairs have been connected.
        </div>
      )}
    </div>
  );
};
