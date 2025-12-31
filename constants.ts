import { UnitConfig, UnitLevel } from "./types";

export const FPS = 60;
export const LANE_COUNT = 5;
export const GRID_ROWS = 2; 
export const GRID_COLS = 5;
export const TOTAL_SLOTS = GRID_ROWS * GRID_COLS;

// Percentage heights
export const ENEMY_SPAWN_Y = -10;
export const WALL_Y = 100; // Enemies hit player here
export const GRID_HEIGHT_PERCENT = 30; // 30% of screen height for grid
export const GRID_START_Y = 100 - GRID_HEIGHT_PERCENT; // 70% down

export const ENEMIES_PER_WAVE = 10; 
export const WAVES_PER_LEVEL = 5;
export const MAX_LEVELS = 10;

export const UNIT_STATS: Record<UnitLevel, UnitConfig> = {
  [UnitLevel.L1]: { damage: 10, cooldownMs: 1200, projectileSpeed: 0.8, name: 'Новичок', color: 'text-cyan-400', description: 'Базовый юнит. Медленная стрельба.' },
  [UnitLevel.L2]: { damage: 25, cooldownMs: 1000, projectileSpeed: 1.0, name: 'Солдат', color: 'text-cyan-400', description: 'Обученный боец. Средний урон.' },
  [UnitLevel.L3]: { damage: 60, cooldownMs: 800, projectileSpeed: 1.2, name: 'Снайпер', color: 'text-cyan-400', description: 'Высокая точность и скорость пули.' },
  [UnitLevel.L4]: { damage: 150, cooldownMs: 500, projectileSpeed: 1.5, name: 'Танк', color: 'text-fuchsia-400', description: 'Тяжелая артиллерия. Быстрая перезарядка.' },
  [UnitLevel.L5]: { damage: 400, cooldownMs: 300, projectileSpeed: 2.0, name: 'Легенда', color: 'text-fuchsia-400', description: 'Элитный юнит. Стреляет молниями.' },
  // Levels 6-10
  [UnitLevel.L6]: { damage: 1000, cooldownMs: 250, projectileSpeed: 2.5, name: 'Маг', color: 'text-fuchsia-400', description: 'Магический урон. Пробивает броню.' },
  [UnitLevel.L7]: { damage: 2500, cooldownMs: 200, projectileSpeed: 3.0, name: 'НЛО', color: 'text-red-400', description: 'Инопланетные технологии.' },
  [UnitLevel.L8]: { damage: 6000, cooldownMs: 150, projectileSpeed: 3.5, name: 'Призрак', color: 'text-red-400', description: 'Сверхъестественная скорость атаки.' },
  [UnitLevel.L9]: { damage: 15000, cooldownMs: 100, projectileSpeed: 4.0, name: 'Демон', color: 'text-red-400', description: 'Адская мощь. Испепеляет врагов.' },
  [UnitLevel.L10]: { damage: 40000, cooldownMs: 50, projectileSpeed: 5.0, name: 'Король', color: 'text-yellow-400', description: 'Бог войны. Уничтожает всё.' },
};

export const WAVE_CONFIG = {
  baseHp: 30,
  hpMultiplier: 1.25, 
  baseSpawnRate: 120, // Frames
};

export const INITIAL_STATE = {
  mana: 200,
  hp: 5, 
  level: 1,
  wave: 1,
  score: 0,
  spawnCost: 100,
  isPaused: false,
  isVictory: false,
  enemiesSpawnedInWave: 0,
};