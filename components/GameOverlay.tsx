import React from 'react';

interface GameOverlayProps {
  isGameOver: boolean;
  isVictory: boolean;
  isPaused: boolean;
  level: number;
  wave: number;
  score: number;
  onRestart: () => void;
  onResume: () => void;
}

export const GameOverlay: React.FC<GameOverlayProps> = ({ 
  isGameOver, 
  isVictory, 
  isPaused, 
  level,
  wave, 
  score, 
  onRestart, 
  onResume 
}) => {
  if (!isGameOver && !isVictory && !isPaused) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 text-center animate-fade-in backdrop-blur-sm">
      
      {/* GAME OVER */}
      {isGameOver && (
        <>
          <h1 className="text-5xl font-bold text-red-500 mb-2 neon-text">ИГРА ОКОНЧЕНА</h1>
          <p className="text-xl text-gray-300 mb-8">Защита прорвана</p>
        </>
      )}

      {/* VICTORY */}
      {isVictory && (
        <>
          <h1 className="text-5xl font-bold text-yellow-400 mb-2 neon-text">ПОБЕДА!</h1>
          <p className="text-xl text-gray-300 mb-8">Вы прошли все 10 уровней!</p>
        </>
      )}

      {/* PAUSE */}
      {isPaused && !isGameOver && !isVictory && (
        <>
          <h1 className="text-5xl font-bold text-blue-400 mb-8 neon-text">ПАУЗА</h1>
          <button
            onClick={onResume}
            className="mb-4 px-8 py-3 w-64 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-xl text-white transition-colors border border-slate-500"
          >
            ПРОДОЛЖИТЬ
          </button>
        </>
      )}

      {/* Stats Display (Always show for End Game states) */}
      {(isGameOver || isVictory) && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-sm mb-8">
          <div className="flex justify-between mb-4">
            <span className="text-gray-400">Уровень</span>
            <span className="text-2xl font-bold text-yellow-400">{level} - {wave}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Очки</span>
            <span className="text-2xl font-bold text-blue-400">{score}</span>
          </div>
        </div>
      )}

      {/* RESTART BUTTON (Always available except logic below) */}
      <button
        onClick={onRestart}
        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full font-bold text-xl text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"
      >
        {isPaused ? 'В МЕНЮ (РЕСТАРТ)' : 'ИГРАТЬ СНОВА'}
      </button>
    </div>
  );
};