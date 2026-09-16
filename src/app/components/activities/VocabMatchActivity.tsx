import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';

interface VocabPair {
  term: string;
  definition: string;
}

interface VocabMatchActivityProps {
  vocabulary: VocabPair[];
  isCompleted?: boolean;
  onComplete?: () => void;
}

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function VocabMatchActivity({ vocabulary, isCompleted = false, onComplete }: VocabMatchActivityProps) {
  const cleanPairs = useMemo(() => {
    return (vocabulary || []).filter(v => v.term && v.definition);
  }, [vocabulary]);

  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);

  const terms = useMemo(() => {
    return shuffleArray(cleanPairs.map(v => v.term));
  }, [cleanPairs]);

  const defs = useMemo(() => {
    return shuffleArray(cleanPairs.map(v => ({ term: v.term, def: v.definition })));
  }, [cleanPairs]);

  const vocabFingerprint = useMemo(() => {
    return cleanPairs.map(v => `${v.term}:${v.definition}`).join('|');
  }, [cleanPairs]);

  const prevVocabRef = React.useRef<string>('');

  useEffect(() => {
    const vocabChanged = prevVocabRef.current !== '' && prevVocabRef.current !== vocabFingerprint;
    prevVocabRef.current = vocabFingerprint;

    if (vocabChanged || !isCompleted) {
      setMatchedPairs([]);
      setSelectedTerm(null);
    } else {
      setMatchedPairs(cleanPairs.map(v => v.term));
    }
  }, [isCompleted, vocabFingerprint]);

  const handleTermClick = (term: string) => {
    if (matchedPairs.includes(term)) return;
    setSelectedTerm(term === selectedTerm ? null : term);
  };

  const handleDefClick = (defObj: { term: string; def: string }) => {
    if (matchedPairs.includes(defObj.term)) return;
    if (!selectedTerm) return;

    if (selectedTerm === defObj.term) {
      const newMatched = [...matchedPairs, selectedTerm];
      setMatchedPairs(newMatched);
      setSelectedTerm(null);

      if (newMatched.length === cleanPairs.length && onComplete) {
        onComplete();
      }
    } else {
      setSelectedTerm(null);
    }
  };

  const handleReset = () => {
    setMatchedPairs([]);
    setSelectedTerm(null);
  };

  if (!cleanPairs.length) return null;

  const allMatched = matchedPairs.length === cleanPairs.length;

  return (
    <div className="bg-white rounded-xl p-6 border border-purple-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
            <BookOpen size={22} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Vocabulary Match</h3>
            <p className="text-sm text-gray-500">Select an English term and match it with its corresponding definition.</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 bg-gray-100 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors font-medium"
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      {allMatched && (
        <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl text-white flex items-center justify-between shadow-md animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <Sparkles size={24} />
            </div>
            <div>
              <h4 className="font-bold text-lg">Excellent Work!</h4>
              <p className="text-sm opacity-90">You matched all vocabulary terms.</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-lg text-sm font-bold">
            <CheckCircle2 size={18} /> 100%
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Terms Column */}
        <div className="space-y-3">
          <h4 className="font-bold text-gray-700 mb-3 text-center text-sm uppercase tracking-wider">Terms</h4>
          {terms.map((term, i) => {
            const isMatched = matchedPairs.includes(term);
            const isSelected = selectedTerm === term;
            return (
              <div
                key={`term-${i}`}
                onClick={() => handleTermClick(term)}
                className={`p-4 rounded-xl border-2 text-center font-bold text-base transition-all cursor-pointer select-none ${
                  isMatched
                    ? 'bg-green-50 border-green-300 text-green-700 opacity-70 cursor-default shadow-xs'
                    : isSelected
                    ? 'bg-purple-100 border-purple-500 text-purple-800 shadow-md transform scale-102'
                    : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>{term}</span>
                  {isMatched && <CheckCircle2 size={18} className="text-green-600" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Definitions Column */}
        <div className="space-y-3">
          <h4 className="font-bold text-gray-700 mb-3 text-center text-sm uppercase tracking-wider">Definitions</h4>
          {defs.map((defObj, i) => {
            const isMatched = matchedPairs.includes(defObj.term);
            return (
              <div
                key={`def-${i}`}
                onClick={() => handleDefClick(defObj)}
                className={`p-4 rounded-xl border-2 text-center text-sm font-medium transition-all cursor-pointer select-none ${
                  isMatched
                    ? 'bg-green-50 border-green-300 text-green-700 opacity-70 cursor-default shadow-xs'
                    : selectedTerm
                    ? 'bg-white border-purple-200 hover:border-purple-500 hover:bg-purple-50 hover:shadow-md'
                    : 'bg-white border-gray-200 opacity-80'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>{defObj.def}</span>
                  {isMatched && <CheckCircle2 size={18} className="text-green-600" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
