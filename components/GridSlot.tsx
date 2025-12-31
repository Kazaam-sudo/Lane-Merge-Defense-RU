import React from 'react';
import { UnitInstance, UnitLevel } from '../types';
import { UNIT_STATS } from '../constants';
import { UnitSkin } from './Skins';

interface GridSlotProps {
  index: number;
  unit: UnitInstance | null;
  onDragStart: (e: React.PointerEvent, unit: UnitInstance, index: number) => void;
  isDragTarget: boolean;
  isSource: boolean;
}

export const GridSlot: React.FC<GridSlotProps> = ({ index, unit, onDragStart, isDragTarget, isSource }) => {
  const stats = unit ? UNIT_STATS[unit.level] : null;

  return (
    <div
      className={`
        relative w-full h-full border rounded-lg flex items-center justify-center select-none touch-none overflow-hidden
        transition-colors duration-150
        ${isDragTarget ? 'bg-indigo-900/50 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-slate-800/80 border-slate-700'}
        ${isSource ? 'opacity-50' : 'opacity-100'}
      `}
      data-slot-index={index}
    >
      {unit && stats && (
        <div
          className="w-full h-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing p-2"
          onPointerDown={(e) => onDragStart(e, unit, index)}
        >
          <div className="w-full h-full transform transition-transform hover:scale-105">
            <UnitSkin level={unit.level} />
          </div>
          
          <div className={`absolute bottom-0 right-1 text-[10px] font-bold ${stats.color} z-10`}>
            LV{unit.level}
          </div>
          
          {/* Level indicator dots */}
          <div className="absolute top-1 flex gap-0.5 pointer-events-none">
            {Array.from({ length: unit.level }).map((_, i) => (
              <div key={i} className={`w-1 h-1 rounded-full ${unit.level === UnitLevel.L10 ? 'bg-yellow-400' : 'bg-slate-400'}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};