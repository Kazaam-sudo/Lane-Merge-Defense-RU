import { Enemy } from "../types";
import { WAVES_PER_LEVEL } from "../constants";

export const generateEnemy = (level: number, wave: number, lane: number, forceBoss: boolean = false): Enemy => {
  // Bonus chance: 10% (only in normal waves)
  const isBonus = !forceBoss && Math.random() < 0.1;
  
  if (isBonus) {
    const bonusRoll = Math.random();
    let bonusType: Enemy['type'] = 'bonus_unit';
    let icon = '🎁';
    
    if (bonusRoll < 0.4) {
      bonusType = 'bonus_unit'; // 40%
      icon = '🎁';
    } else if (bonusRoll < 0.7) {
      bonusType = 'bonus_upgrade'; // 30%
      icon = '⬆️';
    } else {
      bonusType = 'bonus_bomb'; // 30%
      icon = '💣';
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      lane,
      y: -10,
      hp: 1,
      maxHp: 1,
      speed: 0.2, 
      type: bonusType,
      icon,
    };
  }

  // Global Progression Index (0 to 49 approx)
  const globalWaveIndex = ((level - 1) * WAVES_PER_LEVEL) + wave;

  const isFast = !forceBoss && (globalWaveIndex % 3 === 0);

  // Difficulty Scaling
  // Start base: 35
  // Growth: ~1.15x per global wave. 
  // At Level 1 Wave 5: 35 * 1.15^5 = ~70
  // At Level 10 Wave 5: 35 * 1.15^50 = ~38,000 (Matches L10 Unit damage)
  let hp = 35 * Math.pow(1.15, globalWaveIndex - 1);
  let speed = 0.15 + (globalWaveIndex * 0.005); 
  let icon = '🔴';
  let type: Enemy['type'] = 'normal';

  if (forceBoss) {
    hp *= 25; // Boss multiplier (lower because base HP scales fast)
    speed = 0.04; 
    icon = '👹';
    type = 'boss';
  } else if (isFast) {
    hp *= 0.7;
    speed += 0.1; 
    icon = '🔺';
    type = 'fast';
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    lane,
    y: -10,
    hp: Math.floor(hp),
    maxHp: Math.floor(hp),
    speed,
    type,
    icon,
  };
};

export const getNextCost = (currentCost: number): number => {
  return currentCost + 10;
};