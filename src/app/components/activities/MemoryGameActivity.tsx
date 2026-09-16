import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sparkles, RotateCcw, CheckCircle2, Brain, HelpCircle, Layers, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';

export interface WarmupPair {
  label?: string;
  text?: string;
  left?: string;
  right?: string;
  term?: string;
  definition?: string;
  draggable?: string;
  dropzone?: string;
}

export interface MemoryGameActivityProps {
  data?: {
    warmupPairs?: WarmupPair[];
    pairs?: WarmupPair[];
    vocabulary?: WarmupPair[];
    gameMode?: string;
    [key: string]: any;
  };
  savedState?: any;
  isCompleted?: boolean;
  onEvaluate?: (isCorrect: boolean, answers: any, score?: number) => void;
  onComplete?: () => void;
}

interface CardItem {
  id: string;
  pairIndex: number;
  content: string;
  type: 'english' | 'spanish';
  matchValue: string; // The corresponding answer expected by grading.service.js
  pairLabel: string; // The label key expected by grading.service.js
}

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export const MemoryGameActivity: React.FC<MemoryGameActivityProps> = ({
  data,
  savedState,
  isCompleted = false,
  onEvaluate,
  onComplete
}) => {
  // 1. Extraer parejas de datos recibidos (soportando warmupPairs, pairs o vocabulary)
  const rawPairs: WarmupPair[] = useMemo(() => {
    if (data?.warmupPairs && Array.isArray(data.warmupPairs)) return data.warmupPairs;
    if (data?.pairs && Array.isArray(data.pairs)) return data.pairs;
    if (data?.vocabulary && Array.isArray(data.vocabulary)) return data.vocabulary;
    return [
      { label: 'Nurse', text: 'Enfermera' },
      { label: 'Patient', text: 'Paciente' },
      { label: 'Doctor', text: 'Médico' },
      { label: 'Hospital', text: 'Hospital' },
      { label: 'Medicine', text: 'Medicina' }
    ];
  }, [data]);

  const cleanPairs = useMemo(() => {
    return rawPairs
      .map((p) => ({
        label: (p.label || p.left || p.term || p.draggable || '').trim(),
        text: (p.text || p.right || p.definition || p.dropzone || '').trim()
      }))
      .filter((p) => p.label && p.text);
  }, [rawPairs]);

  // Generación inicial de las cartas (2 por cada pareja)
  const initialCards = useMemo(() => {
    const cards: CardItem[] = [];
    cleanPairs.forEach((pair, idx) => {
      // Carta en Inglés
      cards.push({
        id: `card-${idx}-en`,
        pairIndex: idx,
        content: pair.label,
        type: 'english',
        matchValue: pair.text,
        pairLabel: pair.label
      });
      // Carta en Español
      cards.push({
        id: `card-${idx}-es`,
        pairIndex: idx,
        content: pair.text,
        type: 'spanish',
        matchValue: pair.text,
        pairLabel: pair.label
      });
    });
    return shuffleArray(cards);
  }, [cleanPairs]);

  // Estados del juego
  const [shuffledCards, setShuffledCards] = useState<CardItem[]>(initialCards);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [matchedPairIndices, setMatchedPairIndices] = useState<number[]>([]);
  const [mismatchedIds, setMismatchedIds] = useState<string[]>([]);
  const [firstTryResponses, setFirstTryResponses] = useState<Record<string, string>>({});
  const [isLocking, setIsLocking] = useState<boolean>(false);
  const [attemptsCount, setAttemptsCount] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Huella digital para reiniciar si cambian los datos
  const dataFingerprint = useMemo(() => {
    return cleanPairs.map((p) => `${p.label}:${p.text}`).join('|');
  }, [cleanPairs]);

  const prevDataFingerprintRef = useRef<string>('');

  // Inicialización / Reset cuando cambian props o estado de completado
  useEffect(() => {
    const changed = prevDataFingerprintRef.current !== '' && prevDataFingerprintRef.current !== dataFingerprint;
    prevDataFingerprintRef.current = dataFingerprint;

    if (changed || (!isCompleted && (!savedState || Object.keys(savedState).length === 0))) {
      resetGame();
    } else if (isCompleted) {
      // Marcar todas como encontradas si ya estaba completada
      setMatchedPairIndices(cleanPairs.map((_, i) => i));
      setIsFinished(true);
    }
  }, [dataFingerprint, isCompleted]);

  // Reiniciar juego
  const resetGame = () => {
    setShuffledCards(shuffleArray(initialCards));
    setFlippedIds([]);
    setMatchedPairIndices([]);
    setMismatchedIds([]);
    setFirstTryResponses({});
    setIsLocking(false);
    setAttemptsCount(0);
    setIsFinished(false);
  };

  // Manejo de clic en una carta
  const handleCardClick = (card: CardItem) => {
    // Bloquear interacción si el tablero está evaluando, si la carta ya fue volteada o si ya fue encontrada
    if (
      isLocking ||
      flippedIds.includes(card.id) ||
      matchedPairIndices.includes(card.pairIndex) ||
      flippedIds.length >= 2
    ) {
      return;
    }

    const nextFlipped = [...flippedIds, card.id];
    setFlippedIds(nextFlipped);

    // Si es la primera carta volteada, esperamos a la segunda
    if (nextFlipped.length === 1) return;

    // Si es la segunda carta volteada, evaluamos la pareja
    if (nextFlipped.length === 2) {
      setIsLocking(true);
      // ⚠️ NO incrementamos el contador aquí: solo cuenta al fallar (ver bloque else)

      const firstCard = shuffledCards.find((c) => c.id === nextFlipped[0]);
      const secondCard = card;

      let updatedFirstTry = { ...firstTryResponses };

      if (firstCard) {
        // Determinar qué concepto (label en inglés) y qué respuesta (texto en español) se intentaron
        const conceptLabel = firstCard.type === 'english' ? firstCard.pairLabel : secondCard.pairLabel;
        const selectedText = firstCard.type === 'english' ? secondCard.content : firstCard.content;

        // Si este concepto no tiene aún su primera asociación registrada, guardarla (sin sobrescribir elecciones previas)
        if (!updatedFirstTry[conceptLabel]) {
          updatedFirstTry[conceptLabel] = selectedText;
          setFirstTryResponses(updatedFirstTry);
        }
      }

      if (firstCard && firstCard.pairIndex === secondCard.pairIndex) {
        // ✅ MATCH CORRECTO — no cuenta como error
        const newMatched = [...matchedPairIndices, firstCard.pairIndex];
        setMatchedPairIndices(newMatched);
        setFlippedIds([]);
        setIsLocking(false);

        // Verificar si se completaron todas las parejas
        if (newMatched.length === cleanPairs.length) {
          setIsFinished(true);
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 }
          });

          // Siempre enviamos las respuestas CORRECTAS al backend.
          // El juego de memoria se aprueba al completar el tablero (100%);
          // el contador de errores es solo visual. Si enviáramos firstTryResponses
          // con asociaciones incorrectas, el servidor calificaría por debajo del
          // umbral aunque el aprendiz haya encontrado todas las parejas.
          const finalResponses: Record<string, string> = {};
          cleanPairs.forEach((p) => {
            finalResponses[p.label] = p.text;
          });

          if (onEvaluate) {
            onEvaluate(true, finalResponses, 100);
          }
          if (onComplete) {
            onComplete();
          }
        }
      } else {
        // ❌ ERROR — solo aquí sumamos al contador
        setAttemptsCount((prev) => prev + 1);
        setMismatchedIds([nextFlipped[0], secondCard.id]);
        setTimeout(() => {
          setFlippedIds([]);
          setMismatchedIds([]);
          setIsLocking(false);
        }, 1100);
      }
    }
  };

  if (!cleanPairs.length) return null;

  return (
    <div className="skylang-game bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      {/* Encabezado del Juego */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl text-white shadow-sm">
            <Brain size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Memory Game
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-extrabold">
                {cleanPairs.length} parejas
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {data?.description || data?.instrucciones || data?.instructions || 'Voltea las cartas para encontrar cada término en inglés con su traducción en español.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <span>Errores:</span>
            <span className={`font-black ${attemptsCount === 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {attemptsCount}
            </span>
          </div>

          <button
            onClick={resetGame}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-purple-700 bg-slate-100 hover:bg-purple-50 px-3 py-1.5 rounded-xl transition-all font-bold cursor-pointer border border-slate-200 hover:border-purple-200"
          >
            <RotateCcw size={14} /> Reiniciar juego
          </button>
        </div>
      </div>

      {/* Banner de Victoria */}
      {isFinished && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 rounded-2xl text-white flex items-center justify-between shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <Sparkles size={24} />
            </div>
            <div>
              <h4 className="font-extrabold text-base">¡Excelente trabajo!</h4>
              <p className="text-xs opacity-90 font-medium">
                {attemptsCount === 0
                  ? `¡Perfecto! Encontraste las ${cleanPairs.length} parejas sin ningún error. 🌟`
                  : `Encontraste las ${cleanPairs.length} parejas con ${attemptsCount} error${attemptsCount === 1 ? '' : 'es'}.`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3.5 py-1.5 rounded-xl text-sm font-black border border-white/30">
            <CheckCircle2 size={18} /> 100%
          </div>
        </motion.div>
      )}

      {/* Tablero de Cartas (Grid Responsive) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {shuffledCards.map((card) => {
          const isFlipped = flippedIds.includes(card.id) || matchedPairIndices.includes(card.pairIndex);
          const isMatched = matchedPairIndices.includes(card.pairIndex);
          const isMismatched = mismatchedIds.includes(card.id);

          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(card)}
              className="h-28 sm:h-32 perspective-1000 cursor-pointer select-none"
            >
              <motion.div
                className="w-full h-full relative rounded-2xl shadow-xs transition-all duration-300 transform-gpu"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Cara Oculta (Dorso de la Carta) */}
                <div
                  className={`absolute inset-0 w-full h-full rounded-2xl border-2 flex flex-col items-center justify-center p-3 text-center transition-all ${
                    isFlipped ? 'pointer-events-none' : ''
                  } bg-gradient-to-br from-slate-900 to-purple-950 border-purple-800 text-purple-200 hover:border-purple-400 hover:shadow-md`}
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="w-9 h-9 rounded-full bg-purple-900/60 border border-purple-700/50 flex items-center justify-center mb-1 text-purple-300">
                    <HelpCircle size={18} />
                  </div>
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-purple-400">SkyLang</span>
                </div>

                {/* Cara Revelada (Frente de la Carta) */}
                <div
                  className={`absolute inset-0 w-full h-full rounded-2xl border-2 flex flex-col items-center justify-center p-3 text-center transition-all ${
                    isMatched
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs'
                      : isMismatched
                      ? 'bg-rose-50 border-rose-400 text-rose-950 animate-shake'
                      : 'bg-white border-purple-300 text-purple-950 shadow-md'
                  }`}
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <span className="text-[9px] uppercase font-bold tracking-wider mb-1 px-2 py-0.5 rounded-full bg-purple-100/80 text-purple-800">
                    {card.type === 'english' ? 'English' : 'Español'}
                  </span>
                  <p className="font-extrabold text-xs sm:text-sm leading-tight text-slate-900">{card.content}</p>
                  {isMatched && (
                    <span className="mt-1.5 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 size={16} />
                    </span>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
