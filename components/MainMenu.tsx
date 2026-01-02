import React from 'react';
import { MAX_LEVELS } from '../constants';
import { PlayerProgress } from '../types';

interface MainMenuProps {
  progress: PlayerProgress;
  onStartLevel: (level: number) => void;
  onShowAchievements: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ progress, onStartLevel, onShowAchievements }) => {
  return (
    <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center p-6 overflow-y-auto">
      <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2 neon-text text-center mt-8">
        LANE MERGE DEFENSE
      </h1>
      <p className="text-slate-400 mb-8 text-sm">CYBERPUNK TOWER DEFENSE</p>

      {/* Stats Summary */}
      <div className="w-full max-w-sm bg-slate-800/50 p-4 rounded-lg border border-slate-700 mb-8 flex justify-around">
         <div className="text-center">
            <div className="text-xl font-bold text-yellow-400">{progress.stats.totalKills}</div>
            <div className="text-[10px] text-slate-400 uppercase">Убийств</div>
         </div>
         <div className="text-center">
            <div className="text-xl font-bold text-blue-400">{progress.stats.totalMerges}</div>
            <div className="text-[10px] text-slate-400 uppercase">Слияний</div>
         </div>
         <div className="text-center">
            <div className="text-xl font-bold text-green-400">{progress.maxUnlockedLevel}</div>
            <div className="text-[10px] text-slate-400 uppercase">Макс. Ур</div>
         </div>
      </div>

      <div className="w-full max-w-sm mb-4">
        <h2 className="text-white font-bold mb-4 uppercase tracking-wider text-sm border-b border-slate-700 pb-2">Выбор Уровня</h2>
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: MAX_LEVELS }).map((_, i) => {
            const lvl = i + 1;
            const isUnlocked = lvl <= progress.maxUnlockedLevel;
            return (
              <button
                key={lvl}
                disabled={!isUnlocked}
                onClick={() => onStartLevel(lvl)}
                className={`
                  aspect-square rounded-lg flex items-center justify-center font-bold text-lg relative overflow-hidden transition-all
                  ${isUnlocked 
                    ? 'bg-slate-700 hover:bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)] border border-slate-600' 
                    : 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed'}
                `}
              >
                {lvl}
                {!isUnlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">🔒</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1" />

      <button
        onClick={onShowAchievements}
        className="w-full max-w-sm py-4 mb-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        <span>🏆</span>
        <span className="font-bold text-gray-200">ДОСТИЖЕНИЯ</span>
      </button>

      <div className="text-[10px] text-slate-600">v1.2.0 • RU Edition</div>
    </div>
  );
};