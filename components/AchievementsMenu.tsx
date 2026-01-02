import React from 'react';
import { ACHIEVEMENTS } from '../constants';
import { PlayerProgress } from '../types';

interface AchievementsMenuProps {
  progress: PlayerProgress;
  onBack: () => void;
}

export const AchievementsMenu: React.FC<AchievementsMenuProps> = ({ progress, onBack }) => {
  return (
    <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col p-6 overflow-y-auto">
      <div className="flex items-center mb-6">
        <button 
            onClick={onBack}
            className="p-2 mr-4 bg-slate-800 rounded-lg text-slate-300 hover:text-white"
        >
            ←
        </button>
        <h1 className="text-2xl font-bold text-white">Достижения</h1>
      </div>

      <div className="space-y-4 w-full max-w-md mx-auto pb-8">
        {ACHIEVEMENTS.map(ach => {
            const isUnlocked = progress.unlockedAchievements.includes(ach.id);
            return (
                <div 
                    key={ach.id}
                    className={`
                        relative p-4 rounded-xl border flex items-center gap-4 transition-all
                        ${isUnlocked 
                            ? 'bg-slate-800 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                            : 'bg-slate-900/50 border-slate-800 grayscale opacity-60'}
                    `}
                >
                    <div className="text-4xl">{ach.icon}</div>
                    <div className="flex-1">
                        <div className={`font-bold ${isUnlocked ? 'text-indigo-300' : 'text-slate-500'}`}>
                            {ach.title}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                            {ach.description}
                        </div>
                    </div>
                    {isUnlocked && (
                        <div className="absolute top-2 right-2 text-xs text-green-400 font-bold">✓</div>
                    )}
                </div>
            );
        })}
      </div>
    </div>
  );
};