export enum UnitLevel {
  L1 = 1,
  L2 = 2,
  L3 = 3,
  L4 = 4,
  L5 = 5,
  L6 = 6,
  L7 = 7,
  L8 = 8,
  L9 = 9,
  L10 = 10,
}

export interface UnitConfig {
  damage: number;
  cooldownMs: number; // Fire rate
  projectileSpeed: number;
  icon: string;
  name: string;
  color: string;
  description?: string;
}

export interface UnitInstance {
  id: string;
  level: UnitLevel;
  lastFired: number;
  slotIndex: number; // 0-24
}

export interface Enemy {
  id: string;
  lane: number; // 0-4
  y: number; // Percentage 0-100
  hp: number;
  maxHp: number;
  speed: number;
  type: 'normal' | 'fast' | 'boss' | 'bonus_bomb' | 'bonus_upgrade' | 'bonus_unit';
  icon: string;
  frozen?: boolean;
}

export interface Projectile {
  id: string;
  lane: number;
  x: number; // Center of lane usually
  y: number; // Percentage
  damage: number;
  speed: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number; // Frames remaining
}

export interface GameState {
  mana: number;
  hp: number;
  level: number; // Current Level 1-10
  wave: number;  // Current Wave 1-5
  score: number;
  spawnCost: number;
  isPlaying: boolean;
  isGameOver: boolean;
  isVictory: boolean;
  isPaused: boolean;
  spawnTimer: number; // Frames until next enemy
  enemiesSpawnedInWave: number;
}

export interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  content: string;
}