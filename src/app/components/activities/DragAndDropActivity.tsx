import React, { useState, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { CheckCircle2, GripHorizontal } from "lucide-react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";

interface DragItem {
  id: string;
  text: string;
}

interface DropzoneProps {
  id: string;
  targetText: string;
  matchedItem: DragItem | null;
  onDrop: (item: DragItem) => void;
}

const Dropzone: React.FC<DropzoneProps> = ({ targetText, matchedItem, onDrop }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "ITEM",
    drop: (item: DragItem) => onDrop(item),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`relative w-full min-h-[60px] flex items-center justify-between px-4 py-3 border-2 rounded-xl transition-colors ${
        matchedItem
          ? "border-green-500 bg-green-50"
          : isOver
          ? "border-[#4DA6FF] bg-[#4DA6FF]/10 border-dashed"
          : "border-gray-300 bg-gray-50 border-dashed"
      }`}
    >
      <span className="font-medium text-gray-700">{targetText}</span>
      {matchedItem ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-green-200 shadow-sm text-green-700 font-bold"
        >
          {matchedItem.text}
          <CheckCircle2 size={18} />
        </motion.div>
      ) : (
        <div className="text-gray-400 text-sm italic">Drop here</div>
      )}
    </div>
  );
};

const DraggableItem: React.FC<{ item: DragItem }> = ({ item }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "ITEM",
    item: { id: item.id, text: item.text },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-2 bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm cursor-grab hover:shadow-md hover:border-[#4DA6FF] transition-all active:cursor-grabbing"
    >
      <GripHorizontal className="text-gray-400" size={18} />
      <span className="font-medium text-[#111111]">{item.text}</span>
    </div>
  );
};

interface DragAndDropActivityProps {
  data: Array<{ draggable: string; dropzone: string }>;
  isCompleted?: boolean;
  onComplete?: () => void;
}

export function DragAndDropActivity({ data, isCompleted, onComplete }: DragAndDropActivityProps) {
  const [items, setItems] = useState<DragItem[]>([]);
  const [matches, setMatches] = useState<Record<string, DragItem>>({}); // dropzoneId -> matched item
  const dataFingerprint = React.useMemo(() => {
    return (data || []).map(d => `${d.draggable}:${d.dropzone}`).join('|');
  }, [data]);

  const prevDataRef = React.useRef<string>('');

  useEffect(() => {
    const dataChanged = prevDataRef.current !== '' && prevDataRef.current !== dataFingerprint;
    prevDataRef.current = dataFingerprint;

    const validData = (data || []).filter((d) => d.draggable && d.dropzone);
    
    if (dataChanged || !isCompleted) {
      // Initialize items and shuffle them
      const initialItems = validData.map((d, i) => ({
        id: `item-${i}`,
        text: d.draggable,
      }));

      const shuffled = [...initialItems].sort(() => Math.random() - 0.5);
      setItems(shuffled);
      setMatches({});
    } else {
      // Pre-fill all matches and leave items empty
      const prefilledMatches: Record<string, DragItem> = {};
      validData.forEach((d, i) => {
        prefilledMatches[i] = { id: `item-${i}`, text: d.draggable };
      });
      setMatches(prefilledMatches);
      setItems([]);
    }
  }, [dataFingerprint, isCompleted]);

  const handleDrop = (item: DragItem, dropzoneIndex: number, expectedDraggableText: string) => {
    if (item.text === expectedDraggableText) {
      setMatches((prev) => {
        const newMatches = { ...prev, [dropzoneIndex]: item };
        
        // Check if all matched
        const validData = data.filter((d) => d.draggable && d.dropzone);
        if (Object.keys(newMatches).length === validData.length) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
          if (onComplete) onComplete();
        }
        return newMatches;
      });

      // Remove from available items
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } else {
      // Logic for incorrect drop (optional shake animation could be added here)
    }
  };

  const validData = data.filter((d) => d.draggable && d.dropzone);

  if (validData.length === 0) return null;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="bg-white p-6 rounded-xl border border-pink-200 shadow-sm mt-4">
        <h3 className="text-xl font-bold text-[#111111] mb-2 flex items-center gap-2">
          <GripHorizontal className="text-pink-500" size={24} />
          Drag and Drop
        </h3>
        <p className="text-gray-600 mb-6">Match the items by dragging them to their correct targets.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Targets (Dropzones) */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700">Drop Targets</h4>
            {validData.map((pair, idx) => (
              <Dropzone
                key={idx}
                id={`dropzone-${idx}`}
                targetText={pair.dropzone}
                matchedItem={matches[idx] || null}
                onDrop={(item) => handleDrop(item, idx, pair.draggable)} // Compare draggable text
              />
            ))}
          </div>

          {/* Available Draggables */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-4">Items</h4>
            <div className="flex flex-wrap gap-3">
              {items.map((item) => (
                <DraggableItem key={item.id} item={item} />
              ))}
              {items.length === 0 && (
                <div className="w-full text-center p-8 border-2 border-dashed border-green-200 rounded-xl bg-green-50 text-green-700 font-bold">
                  All pairs matched! 🎉
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
