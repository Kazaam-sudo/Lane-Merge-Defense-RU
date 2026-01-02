import { Enemy } from "../types";
import { WAVES_PER_LEVEL } from "../constants";

export const generateEnemy = (level: number, wave: number, lane: number, forceBoss: boolean = false): Enemy => {
  // Bonus chance: 10% (only in normal waves)
  const isBonus = !forceBoss && Math.random() < 0.1;
  
  if (isBonus) {
    const bonusRoll = Math.random();
    let bonusType: Enemy['type'] = 'bonus_unit';
    
    if (bonusRoll < 0.4) {
      bonusType = 'bonus_unit'; // 40%
    } else if (bonusRoll < 0.7) {
      bonusType = 'bonus_upgrade'; // 30%
    } else {
      bonusType = 'bonus_bomb'; // 30%
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      lane,
      y: -10,
      hp: 1,
      maxHp: 1,
      speed: 0.2, 
      level: 0,
      type: bonusType,
    };
  }

  // Global Progression Index (0 to 49 approx)
  const globalWaveIndex = ((level - 1) * WAVES_PER_LEVEL) + wave;

  const isFast = !forceBoss && (globalWaveIndex % 3 === 0);

  // Difficulty Scaling
  // Enemies "level up" every wave essentially
  const enemyLevel = globalWaveIndex;

  // HP Formula: Base * (1.18 ^ Level)
  // Slightly harder scaling than before to account for multi-lane towers
  let hp = 40 * Math.pow(1.18, enemyLevel - 1);
  let speed = 0.15 + (enemyLevel * 0.005); 
  let type: Enemy['type'] = 'normal';

  if (forceBoss) {
    hp *= 20; // Boss multiplier
    speed = 0.04; 
    type = 'boss';
  } else if (isFast) {
    hp *= 0.6;
    speed += 0.12; 
    type = 'fast';
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    lane,
    y: -10,
    hp: Math.floor(hp),
    maxHp: Math.floor(hp),
    speed,
    level: enemyLevel,
    type,
  };
};

export const getNextCost = (currentCost: number): number => {
  return currentCost + 10;
};