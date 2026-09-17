import React from 'react';
import { QuizGame } from './QuizGame';
import { MatchingGame } from './MatchingGame';
import { DragDropGame } from './DragDropGame';
import { ListeningGame } from './ListeningGame';
import { SpellingGame } from './SpellingGame';
import { ClinicalCaseGame } from './ClinicalCaseGame';
import { EmergencySimulator } from './EmergencySimulator';
import { MemoryGameActivity } from '../activities/MemoryGameActivity';

export interface GameRendererProps {
  activity: {
    id?: number | string;
    tipo: string;
    titulo?: string;
    instrucciones?: string;
    datos_json?: any;
    [key: string]: any;
  };
  savedState?: any;
  isCompleted?: boolean;
  onEvaluate?: (isCorrect: boolean, answers: any, score?: number) => void;
  onComplete?: () => void;
}

export const GameRenderer: React.FC<GameRendererProps> = ({
  activity,
  savedState,
  isCompleted = false,
  onEvaluate,
  onComplete
}) => {
  if (!activity) {
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-semibold">
        Could not load configuration for this interactive activity.
      </div>
    );
  }

  const datos = activity?.datos_json || {};
  const explicitGameType = (
    datos.gameType ||
    datos.game_type ||
    datos.gameMode ||
    datos.game_mode ||
    activity?.tipo ||
    ''
  ).toLowerCase();

  // 1. MEMORY GAME (Delegación a MemoryGameActivity manteniendo firstTryResponses)
  if (
    explicitGameType === 'memory' ||
    (activity?.tipo === 'matching' && (datos.gameMode === 'memory' || datos.game_mode === 'memory'))
  ) {
    return (
      <MemoryGameActivity
        data={datos}
        savedState={savedState}
        isCompleted={isCompleted}
        onEvaluate={onEvaluate}
        onComplete={onComplete}
      />
    );
  }

  // 2. QUIZ GAME
  if (explicitGameType === 'quiz' || explicitGameType === 'multiple_choice') {
    return (
      <QuizGame
        data={datos}
        savedState={savedState}
        isCompleted={isCompleted}
        onEvaluate={onEvaluate}
        onComplete={onComplete}
      />
    );
  }

  // 3. MATCHING GAME
  if (explicitGameType === 'matching') {
    return (
      <MatchingGame
        data={datos}
        savedState={savedState}
        isCompleted={isCompleted}
        onEvaluate={onEvaluate}
        onComplete={onComplete}
      />
    );
  }

  // 4. DRAG & DROP GAME
  if (
    explicitGameType === 'drag_drop' ||
    explicitGameType === 'drag_and_drop' ||
    explicitGameType === 'drag_words'
  ) {
    return (
      <DragDropGame
        data={datos}
        savedState={savedState}
        isCompleted={isCompleted}
        onEvaluate={onEvaluate}
        onComplete={onComplete}
      />
    );
  }

  // 5. LISTENING GAME
  if (explicitGameType === 'listening') {
    return (
      <ListeningGame
        data={datos}
        savedState={savedState}
        isCompleted={isCompleted}
        onEvaluate={onEvaluate}
        onComplete={onComplete}
      />
    );
  }

  // 6. SPELLING GAME
  if (explicitGameType === 'spelling') {
    return (
      <SpellingGame
        data={datos}
        savedState={savedState}
        isCompleted={isCompleted}
        onEvaluate={onEvaluate}
        onComplete={onComplete}
      />
    );
  }

  // 7. CASO CLÍNICO GAME
  if (explicitGameType === 'caso_clinico' || explicitGameType === 'clinical_case') {
    return (
      <ClinicalCaseGame
        data={datos}
        savedState={savedState}
        isCompleted={isCompleted}
        onEvaluate={onEvaluate}
        onComplete={onComplete}
      />
    );
  }

  // 8. EMERGENCY SIMULATOR
  if (
    explicitGameType === 'emergency_simulator' ||
    explicitGameType === 'emergency' ||
    explicitGameType === 'simulator'
  ) {
    return (
      <EmergencySimulator
        data={datos}
        savedState={savedState}
        isCompleted={isCompleted}
        onEvaluate={onEvaluate}
        onComplete={onComplete}
      />
    );
  }

  // Resguardo: Quiz por defecto si el tipo no fue explícito
  return (
    <QuizGame
      data={datos}
      savedState={savedState}
      isCompleted={isCompleted}
      onEvaluate={onEvaluate}
      onComplete={onComplete}
    />
  );
};
