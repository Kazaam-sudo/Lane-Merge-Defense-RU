import React from 'react';
import { UnitLevel } from '../types';

interface SkinProps {
  className?: string;
}

// --- UNITS ---

export const UnitSkin: React.FC<SkinProps & { level: UnitLevel }> = ({ level, className = "" }) => {
  const commonClasses = `w-full h-full drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] ${className}`;
  
  // Dynamic colors based on level tiers
  // L1-3: Blue/Cyan, L4-6: Purple/Pink, L7-9: Red/Orange, L10: Gold
  const getColors = (l: number) => {
    if (l <= 3) return { stroke: '#22d3ee', fill: '#0891b2' }; // Cyan
    if (l <= 6) return { stroke: '#e879f9', fill: '#c026d3' }; // Fuchsia
    if (l <= 9) return { stroke: '#f87171', fill: '#dc2626' }; // Red
    return { stroke: '#facc15', fill: '#ca8a04' }; // Gold
  };

  const { stroke, fill } = getColors(level);

  const renderShape = () => {
    switch (level) {
      // 1. Novice (Simple Triangle)
      case UnitLevel.L1:
        return (
          <path d="M50 20 L80 80 L20 80 Z" stroke={stroke} strokeWidth="4" fill="none" />
        );
      // 2. Soldier (Split Triangle)
      case UnitLevel.L2:
        return (
          <g>
             <path d="M50 15 L80 85 L20 85 Z" stroke={stroke} strokeWidth="3" fill="none" />
             <line x1="50" y1="15" x2="50" y2="85" stroke={stroke} strokeWidth="2" />
          </g>
        );
      // 3. Sniper (Crosshair)
      case UnitLevel.L3:
        return (
          <g>
            <circle cx="50" cy="50" r="30" stroke={stroke} strokeWidth="3" fill="none" />
            <line x1="50" y1="10" x2="50" y2="90" stroke={stroke} strokeWidth="2" />
            <line x1="10" y1="50" x2="90" y2="50" stroke={stroke} strokeWidth="2" />
            <circle cx="50" cy="50" r="5" fill={fill} />
          </g>
        );
      // 4. Tank (Shield/Hexagon)
      case UnitLevel.L4:
        return (
          <path d="M50 10 L90 30 L90 70 L50 90 L10 70 L10 30 Z" stroke={stroke} strokeWidth="4" fill={fill} fillOpacity="0.3" />
        );
      // 5. Legend (Star)
      case UnitLevel.L5:
        return (
           <polygon points="50,10 61,35 90,35 66,55 75,85 50,70 25,85 34,55 10,35 39,35" stroke={stroke} strokeWidth="3" fill="none" />
        );
      // 6. Mage (Orb)
      case UnitLevel.L6:
        return (
          <g>
             <circle cx="50" cy="50" r="25" stroke={stroke} strokeWidth="4" fill={fill} fillOpacity="0.5" />
             <circle cx="50" cy="50" r="35" stroke={stroke} strokeWidth="1" strokeDasharray="4 4" className="animate-[spin_4s_linear_infinite]" />
          </g>
        );
      // 7. UFO (Saucer)
      case UnitLevel.L7:
        return (
          <g>
            <ellipse cx="50" cy="60" rx="40" ry="15" stroke={stroke} strokeWidth="3" fill="none" />
            <path d="M30 50 Q50 10 70 50" stroke={stroke} strokeWidth="3" fill={fill} fillOpacity="0.4" />
          </g>
        );
      // 8. Ghost (Phantom)
      case UnitLevel.L8:
        return (
          <path d="M20 90 L20 40 Q50 -10 80 40 L80 90 L65 80 L50 90 L35 80 Z" stroke={stroke} strokeWidth="3" fill={fill} fillOpacity="0.2" />
        );
      // 9. Demon (Spikes)
      case UnitLevel.L9:
        return (
          <path d="M50 10 L65 40 L90 20 L75 60 L90 90 L50 75 L10 90 L25 60 L10 20 L35 40 Z" stroke={stroke} strokeWidth="3" fill={fill} />
        );
      // 10. King (Crown)
      case UnitLevel.L10:
        return (
          <g>
             <path d="M20 70 L20 30 L40 50 L50 10 L60 50 L80 30 L80 70 Z" stroke={stroke} strokeWidth="4" fill="none" />
             <rect x="20" y="75" width="60" height="10" fill={fill} />
          </g>
        );
      default:
        return <circle cx="50" cy="50" r="30" fill="gray" />;
    }
  };

  return (
    <svg viewBox="0 0 100 100" className={commonClasses} style={{ filter: `drop-shadow(0 0 5px ${stroke})` }}>
      {renderShape()}
    </svg>
  );
};

// --- ENEMIES ---

interface EnemySkinProps extends SkinProps {
    type: 'normal' | 'fast' | 'boss' | 'bonus_bomb' | 'bonus_upgrade' | 'bonus_unit';
}

export const EnemySkin: React.FC<EnemySkinProps> = ({ type, className = "" }) => {
    
    // Bonuses
    if (type === 'bonus_bomb') {
        return (
            <svg viewBox="0 0 100 100" className={className}>
                <circle cx="50" cy="55" r="30" fill="#333" stroke="red" strokeWidth="3" />
                <path d="M50 25 L50 10" stroke="orange" strokeWidth="4" />
                <circle cx="50" cy="10" r="3" fill="yellow" className="animate-pulse" />
                <text x="50" y="65" fontSize="30" textAnchor="middle" fill="white">💣</text>
            </svg>
        );
    }
    if (type === 'bonus_upgrade') {
        return (
             <svg viewBox="0 0 100 100" className={className}>
                <rect x="20" y="20" width="60" height="60" rx="10" fill="#0f172a" stroke="#22d3ee" strokeWidth="3" />
                <path d="M50 70 L50 30 M35 45 L50 30 L65 45" stroke="#22d3ee" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce" />
            </svg>
        );
    }
    if (type === 'bonus_unit') {
        return (
             <svg viewBox="0 0 100 100" className={className}>
                <rect x="25" y="30" width="50" height="50" fill="#166534" stroke="#4ade80" strokeWidth="3" />
                <path d="M25 55 L75 55 M50 30 L50 80" stroke="#4ade80" strokeWidth="2" />
                <path d="M35 30 L35 20 Q50 10 65 20 L65 30" stroke="#4ade80" strokeWidth="4" fill="none" />
            </svg>
        );
    }

    // Enemies
    if (type === 'boss') {
        return (
            <svg viewBox="0 0 100 100" className={className} style={{ filter: 'drop-shadow(0 0 15px red)' }}>
                {/* Mechanical Skull */}
                <path d="M20 30 Q20 0 50 0 Q80 0 80 30 L70 80 L50 90 L30 80 Z" fill="#450a0a" stroke="#ef4444" strokeWidth="3" />
                <circle cx="35" cy="40" r="8" fill="red" className="animate-pulse" />
                <circle cx="65" cy="40" r="8" fill="red" className="animate-pulse" />
                <path d="M40 70 L50 60 L60 70" stroke="#ef4444" strokeWidth="3" fill="none" />
                <path d="M30 80 L30 95 M40 85 L40 100 M50 90 L50 105 M60 85 L60 100 M70 80 L70 95" stroke="#ef4444" strokeWidth="2" />
            </svg>
        );
    }

    if (type === 'fast') {
        return (
            <svg viewBox="0 0 100 100" className={className} style={{ filter: 'drop-shadow(0 0 5px yellow)' }}>
                {/* Dart Shape */}
                <path d="M50 100 L90 20 L50 40 L10 20 Z" fill="#713f12" stroke="#facc15" strokeWidth="3" />
                <circle cx="50" cy="50" r="5" fill="#facc15" />
            </svg>
        );
    }

    // Normal
    return (
        <svg viewBox="0 0 100 100" className={className} style={{ filter: 'drop-shadow(0 0 5px red)' }}>
            {/* Robot Face */}
            <path d="M20 20 L80 20 L70 80 L30 80 Z" fill="#200505" stroke="#ef4444" strokeWidth="3" />
            <rect x="35" y="40" width="10" height="10" fill="#ef4444" />
            <rect x="55" y="40" width="10" height="10" fill="#ef4444" />
            <line x1="40" y1="70" x2="60" y2="70" stroke="#ef4444" strokeWidth="2" />
        </svg>
    );
};
