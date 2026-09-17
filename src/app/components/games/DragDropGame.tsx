import React, { useMemo, useState } from 'react';
import { CheckCircle2, Grab, Move, RotateCcw, Send, Target } from 'lucide-react';
import confetti from 'canvas-confetti';

export interface DragItem {
  id?: string | number;
  text?: string;
  draggable?: string;
  dropzone?: string;
  target?: string;
  label?: string;
  definition?: string;
}

export interface DragDropGameProps {
  data: {
    pairs?: DragItem[];
    items?: DragItem[];
    targets?: DragItem[];
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

export const DragDropGame: React.FC<DragDropGameProps> = ({
  data,
  savedState,
  onEvaluate,
  onComplete
}) => {
  const cleanPairs = useMemo(() => {
    const raw = data?.pairs || data?.items || [
      { draggable: 'Stethoscope', dropzone: 'Tool used to listen to heart and lung sounds' },
      { draggable: 'Thermometer', dropzone: 'Tool used to measure body temperature' },
      { draggable: 'Syringe', dropzone: 'Tool used to inject fluids or withdraw blood' }
    ];
    return raw
      .map((p, i) => ({
        id: String(p.id ?? i),
        draggable: (p.draggable || p.text || p.label || '').trim(),
        dropzone: (p.dropzone || p.target || p.definition || '').trim()
      }))
      .filter((p) => p.draggable && p.dropzone);
  }, [data]);

  const [draggableOptions, setDraggableOptions] = useState(() => shuffleArray(cleanPairs.map((p) => p.draggable)));
  const [selectedDraggable, setSelectedDraggable] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Record<string, string>>(() => savedState || {});
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [wrongTarget, setWrongTarget] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const availableDraggables = useMemo(() => {
    const placedValues = Object.values(placements);
    return draggableOptions.filter((d) => !placedValues.includes(d));
  }, [draggableOptions, placements]);

  const placedCount = Object.keys(placements).length;
  const isFinished = placedCount === cleanPairs.length;

  const completeIfReady = (updated: Record<string, string>) => {
    if (Object.keys(updated).length !== cleanPairs.length) return;
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.65 } });
    const pairMap: Record<string, string> = {};
    cleanPairs.forEach((p) => {
      pairMap[p.draggable] = p.dropzone;
      pairMap[p.dropzone] = p.draggable;
    });
    const payload = {
      ...updated,
      ...pairMap,
      respuestas: cleanPairs.map((p) => p.dropzone)
    };
    onEvaluate?.(true, payload, 100);
    onComplete?.();
  };

  const placeItem = (targetId: string, itemText: string | null) => {
    if (!itemText) return;
    const pair = cleanPairs.find((p) => p.id === targetId);
    if (!pair) return;

    setAttempts((value) => value + 1);

    // Validar si el elemento arrastrado corresponde verdaderamente a esta zona
    const isCorrect = pair.draggable.trim().toLowerCase() === itemText.trim().toLowerCase();

    if (isCorrect) {
      const updated = { ...placements, [pair.draggable]: itemText };
      setPlacements(updated);
      setSelectedDraggable(null);
      setDragOverTarget(null);
      setWrongTarget(null);
      setFeedbackMsg({ type: 'success', text: `Correct! "${itemText}" matches this definition.` });
      completeIfReady(updated);
    } else {
      setSelectedDraggable(null);
      setDragOverTarget(null);
      setWrongTarget(targetId);
      setFeedbackMsg({ type: 'error', text: `"${itemText}" does not match that definition. Try again!` });
      setTimeout(() => {
        setWrongTarget(null);
      }, 1200);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault();
    const itemText = event.dataTransfer.getData('text/plain');
    placeItem(targetId, itemText);
  };

  const handleReset = () => {
    setSelectedDraggable(null);
    setPlacements({});
    setDragOverTarget(null);
    setAttempts(0);
    setWrongTarget(null);
    setFeedbackMsg(null);
    setDraggableOptions(shuffleArray(cleanPairs.map((p) => p.draggable)));
  };

  return (
    <div className="skylang-game bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl text-white shadow-sm">
            <Move size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Drag & Drop Game
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-extrabold">
                {placedCount}/{cleanPairs.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Drag a concept or tap it, then select a target zone.
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
            <Target size={14} /> Targets
          </span>
          <strong className="text-sm text-slate-950">{placedCount} completed</strong>
        </div>
        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-3">
          <span className="text-[11px] font-extrabold uppercase text-indigo-700 flex items-center gap-1.5">
            <Grab size={14} /> Selected
          </span>
          <strong className="text-sm text-indigo-950">{selectedDraggable || 'None'}</strong>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
          <span className="text-[11px] font-extrabold uppercase text-emerald-700 flex items-center gap-1.5">
            <Send size={14} /> Moves
          </span>
          <strong className="text-sm text-emerald-950">{attempts}</strong>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`rounded-2xl p-3 text-xs font-bold border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedbackMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Target Zones</h4>
          {cleanPairs.map((pair) => {
            const placedText = placements[pair.draggable];
            const isDragOver = dragOverTarget === pair.id;
            const isWrong = wrongTarget === pair.id;
            return (
              <div
                key={pair.id}
                onClick={() => placeItem(pair.id, selectedDraggable)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverTarget(pair.id);
                }}
                onDragLeave={() => setDragOverTarget(null)}
                onDrop={(event) => handleDrop(event, pair.id)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer min-h-24 flex items-center justify-between ${
                  placedText
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                    : isWrong
                      ? 'bg-rose-50 border-rose-400 text-rose-800 ring-2 ring-rose-400'
                      : isDragOver || selectedDraggable
                        ? 'bg-purple-50/80 border-purple-400 border-dashed text-purple-900'
                        : 'bg-slate-50 border-slate-200 border-dashed text-slate-500'
                }`}
              >
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700 block">{pair.dropzone}</span>
                  {placedText && (
                    <span className="text-xs font-black text-emerald-700 block">Assigned: {placedText}</span>
                  )}
                </div>
                {placedText && <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />}
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Available Concepts</h4>
          <div className="flex flex-wrap gap-2.5">
            {availableDraggables.map((itemText) => {
              const isSelected = selectedDraggable === itemText;
              return (
                <button
                  key={itemText}
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', itemText);
                    setSelectedDraggable(itemText);
                  }}
                  onDragEnd={() => setDragOverTarget(null)}
                  onClick={() => setSelectedDraggable(itemText === selectedDraggable ? null : itemText)}
                  className={`px-4 py-3 rounded-2xl border text-xs font-bold transition-all cursor-grab active:cursor-grabbing ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md font-extrabold scale-105'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  {itemText}
                </button>
              );
            })}

            {availableDraggables.length === 0 && (
              <div className="w-full p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold text-center">
                All concepts have been placed.
              </div>
            )}
          </div>
        </div>
      </div>

      {isFinished && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={18} /> Sequence completed and submitted.
        </div>
      )}
    </div>
  );
};
