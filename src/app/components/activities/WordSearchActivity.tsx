import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, RotateCcw, Sparkles, Type } from 'lucide-react';

interface WordSearchActivityProps {
  words: string[];
  isCompleted?: boolean;
  onComplete?: () => void;
}

interface Cell {
  row: number;
  col: number;
  letter: string;
}

interface Point {
  row: number;
  col: number;
}

export function WordSearchActivity({ words, isCompleted = false, onComplete }: WordSearchActivityProps) {
  const normalizedWords = useMemo(() => {
    return (words || [])
      .map(w => w.trim().toUpperCase())
      .filter(w => w.length > 0);
  }, [words]);

  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [selectedCells, setSelectedCells] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [wordPositions, setWordPositions] = useState<{ [word: string]: Point[] }>({});

  // Determine grid size based on longest word
  const gridSize = useMemo(() => {
    const maxLen = Math.max(...normalizedWords.map(w => w.length), 0);
    return Math.max(10, maxLen + 2);
  }, [normalizedWords]);

  // Generate grid and place words
  const generateGrid = () => {
    const size = gridSize;
    const newGrid: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));
    const positions: { [word: string]: Point[] } = {};

    const directions = [
      { r: 0, c: 1 },  // Horizontal right
      { r: 1, c: 0 },  // Vertical down
      { r: 1, c: 1 },  // Diagonal down-right
      { r: -1, c: 1 }  // Diagonal up-right
    ];

    for (const word of normalizedWords) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 200) {
        attempts++;
        const dir = directions[Math.floor(Math.random() * directions.length)];
        const startR = Math.floor(Math.random() * size);
        const startC = Math.floor(Math.random() * size);

        const endR = startR + dir.r * (word.length - 1);
        const endC = startC + dir.c * (word.length - 1);

        if (endR >= 0 && endR < size && endC >= 0 && endC < size) {
          let canPlace = true;
          for (let i = 0; i < word.length; i++) {
            const r = startR + dir.r * i;
            const c = startC + dir.c * i;
            const existingChar = newGrid[r][c];
            if (existingChar !== '' && existingChar !== word[i]) {
              canPlace = false;
              break;
            }
          }

          if (canPlace) {
            const cellPoints: Point[] = [];
            for (let i = 0; i < word.length; i++) {
              const r = startR + dir.r * i;
              const c = startC + dir.c * i;
              newGrid[r][c] = word[i];
              cellPoints.push({ row: r, col: c });
            }
            positions[word] = cellPoints;
            placed = true;
          }
        }
      }
    }

    // Fill remaining empty cells with random letters
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const finalGridCells: Cell[][] = [];
    for (let r = 0; r < size; r++) {
      const rowCells: Cell[] = [];
      for (let c = 0; c < size; c++) {
        if (!newGrid[r][c]) {
          newGrid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        rowCells.push({ row: r, col: c, letter: newGrid[r][c] });
      }
      finalGridCells.push(rowCells);
    }

    setGrid(finalGridCells);
    setWordPositions(positions);
  };

  const wordsFingerprint = useMemo(() => {
    return normalizedWords.join(',');
  }, [normalizedWords]);

  const prevWordsRef = React.useRef<string>('');

  useEffect(() => {
    const wordsChanged = prevWordsRef.current !== '' && prevWordsRef.current !== wordsFingerprint;
    prevWordsRef.current = wordsFingerprint;

    if (normalizedWords.length > 0) {
      generateGrid();
      if (wordsChanged || !isCompleted) {
        setFoundWords([]);
      } else {
        setFoundWords(normalizedWords);
      }
      setStartPoint(null);
      setSelectedCells([]);
    } else {
      setFoundWords([]);
    }
  }, [wordsFingerprint, isCompleted]);

  // Helper to check if a point is in a list of points
  const containsPoint = (points: Point[], p: Point) => {
    return points.some(pt => pt.row === p.row && pt.col === p.col);
  };

  // Helper to get line between start and end
  const getPointsBetween = (start: Point, end: Point): Point[] => {
    const dr = end.row - start.row;
    const dc = end.col - start.col;
    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    
    if (steps === 0) return [start];

    // Check for straight lines (horizontal, vertical, diagonal)
    if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) {
      return [start]; // Not a straight line
    }

    const stepR = dr === 0 ? 0 : dr / steps;
    const stepC = dc === 0 ? 0 : dc / steps;

    const line: Point[] = [];
    for (let i = 0; i <= steps; i++) {
      line.push({
        row: Math.round(start.row + stepR * i),
        col: Math.round(start.col + stepC * i)
      });
    }
    return line;
  };

  const handleCellClick = (r: number, c: number) => {
    if (isCompleted || foundWords.length === normalizedWords.length) return;

    const clickedPoint = { row: r, col: c };

    if (!startPoint) {
      setStartPoint(clickedPoint);
      setSelectedCells([clickedPoint]);
    } else {
      const line = getPointsBetween(startPoint, clickedPoint);
      const selectedString = line.map(p => grid[p.row][p.col].letter).join('');
      const reverseString = selectedString.split('').reverse().join('');

      const matchedWord = normalizedWords.find(
        w => (w === selectedString || w === reverseString) && !foundWords.includes(w)
      );

      if (matchedWord) {
        const newFound = [...foundWords, matchedWord];
        setFoundWords(newFound);

        if (newFound.length === normalizedWords.length && onComplete) {
          onComplete();
        }
      }

      setStartPoint(null);
      setSelectedCells([]);
    }
  };

  const handleCellMouseEnter = (r: number, c: number) => {
    if (startPoint) {
      const line = getPointsBetween(startPoint, { row: r, col: c });
      setSelectedCells(line);
    }
  };

  // Collect all cells belonging to found words
  const highlightedFoundCells = useMemo(() => {
    const set = new Set<string>();
    foundWords.forEach(w => {
      const pos = wordPositions[w];
      if (pos) {
        pos.forEach(p => set.add(`${p.row}-${p.col}`));
      }
    });
    return set;
  }, [foundWords, wordPositions]);

  if (!normalizedWords.length) {
    return (
      <div className="p-6 bg-white rounded-xl border border-gray-200 text-center text-gray-500">
        No words added to the Word Search activity yet.
      </div>
    );
  }

  const allFound = foundWords.length === normalizedWords.length;

  return (
    <div className="bg-white rounded-xl p-6 border border-orange-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
            <Type size={22} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Word Search</h3>
            <p className="text-sm text-gray-500">Click the first letter and then the last letter to select each word.</p>
          </div>
        </div>
        <button
          onClick={() => {
            setFoundWords([]);
            setStartPoint(null);
            setSelectedCells([]);
            generateGrid();
          }}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-600 bg-gray-100 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors font-medium"
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      {allFound && (
        <div className="p-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl text-white flex items-center justify-between shadow-md animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <Sparkles size={24} />
            </div>
            <div>
              <h4 className="font-bold text-lg">Excellent Work!</h4>
              <p className="text-sm opacity-90">You found all the words in the word search.</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-lg text-sm font-bold">
            <CheckCircle2 size={18} /> 100%
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* The Grid */}
        <div className="lg:col-span-2 flex justify-center overflow-x-auto p-2">
          <div
            className="grid gap-1.5 bg-gray-100 p-3 rounded-2xl shadow-inner select-none"
            style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          >
            {grid.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const isSelected = containsPoint(selectedCells, { row: rIdx, col: cIdx });
                const isFound = highlightedFoundCells.has(`${rIdx}-${cIdx}`);
                const isStart = startPoint?.row === rIdx && startPoint?.col === cIdx;

                let cellBg = "bg-white text-gray-800 hover:bg-orange-50 hover:border-orange-300";
                if (isFound) {
                  cellBg = "bg-orange-500 text-white font-bold shadow-sm border-orange-600 scale-95";
                } else if (isSelected || isStart) {
                  cellBg = "bg-orange-300 text-orange-950 font-bold border-orange-400 scale-95";
                }

                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    onClick={() => handleCellClick(rIdx, cIdx)}
                    onMouseEnter={() => handleCellMouseEnter(rIdx, cIdx)}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-bold text-sm sm:text-base border transition-all duration-150 cursor-pointer ${cellBg}`}
                  >
                    {cell.letter}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Word Checklist */}
        <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-800 text-base">Words to find:</h4>
            <span className="text-xs px-2.5 py-1 rounded-full bg-orange-200 text-orange-800 font-bold">
              {foundWords.length} / {normalizedWords.length}
            </span>
          </div>

          <div className="flex flex-wrap lg:flex-col gap-2">
            {normalizedWords.map((word) => {
              const isFound = foundWords.includes(word);
              return (
                <div
                  key={word}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-between border ${
                    isFound
                      ? 'bg-orange-500 text-white border-orange-600 line-through opacity-80 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 shadow-xs'
                  }`}
                >
                  <span>{word}</span>
                  {isFound && <CheckCircle2 size={16} className="text-white ml-2 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
