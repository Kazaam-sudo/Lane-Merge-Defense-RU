import { PlayerProgress } from "../types";

const STORAGE_KEY = 'lane_merge_defense_save_v1';

const DEFAULT_PROGRESS: PlayerProgress = {
  maxUnlockedLevel: 1,
  unlockedAchievements: [],
  stats: {
    totalKills: 0,
    totalMerges: 0,
    gamesPlayed: 0
  }
};

export const loadProgress = (): PlayerProgress => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PROGRESS;
    return { ...DEFAULT_PROGRESS, ...JSON.parse(stored) };
  } catch (e) {
    console.error("Failed to load save", e);
    return DEFAULT_PROGRESS;
  }
};

export const saveProgress = (progress: PlayerProgress) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error("Failed to save progress", e);
  }
};

export const updateStats = (
  kills: number, 
  merges: number, 
  levelReached: number, 
  gameCompleted: boolean
): PlayerProgress => {
  const current = loadProgress();
  
  const newProgress: PlayerProgress = {
    ...current,
    maxUnlockedLevel: Math.max(current.maxUnlockedLevel, levelReached),
    stats: {
      totalKills: current.stats.totalKills + kills,
      totalMerges: current.stats.totalMerges + merges,
      gamesPlayed: current.stats.gamesPlayed + 1
    }
  };

  // Check Achievements
  const newAchievements = [...newProgress.unlockedAchievements];
  
  const addAch = (id: string) => {
    if (!newAchievements.includes(id)) newAchievements.push(id);
  };

  if (newProgress.stats.totalKills >= 10) addAch('first_blood');
  if (newProgress.stats.totalMerges >= 50) addAch('merger');
  if (levelReached >= 5) addAch('level_5');
  if (gameCompleted) addAch('survivor');
  // Note: 'max_unit' needs to be checked in gameplay

  newProgress.unlockedAchievements = newAchievements;
  saveProgress(newProgress);
  return newProgress;
};

export const unlockAchievement = (id: string) => {
    const current = loadProgress();
    if (!current.unlockedAchievements.includes(id)) {
        current.unlockedAchievements.push(id);
        saveProgress(current);
    }
}