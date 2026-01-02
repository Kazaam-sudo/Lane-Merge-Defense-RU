import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UnitInstance, UnitLevel, Enemy, Projectile, GameState, FloatingText, TooltipData, PlayerProgress } from './types';
import { INITIAL_STATE, UNIT_STATS, TOTAL_SLOTS, FPS, LANE_COUNT, ENEMY_SPAWN_Y, WALL_Y, GRID_START_Y, GRID_COLS, GRID_HEIGHT_PERCENT, GRID_ROWS, ENEMIES_PER_WAVE, WAVES_PER_LEVEL, MAX_LEVELS } from './constants';
import { generateEnemy, getNextCost } from './services/gameLogic';
import { playSpawnSound, playMergeSound, playShootSound, playHitSound, playDeathSound, playGameOverSound, playBonusSound, playBombSound } from './services/audio';
import { loadProgress, updateStats, unlockAchievement } from './services/storage';
import { GridSlot } from './components/GridSlot';
import { GameOverlay } from './components/GameOverlay';
import { EnemySkin, UnitSkin } from './components/Skins';
import { MainMenu } from './components/MainMenu';
import { AchievementsMenu } from './components/AchievementsMenu';

type Screen = 'MENU' | 'GAME' | 'ACHIEVEMENTS';

export default function App() {
  // --- STATE ---
  const [screen, setScreen] = useState<Screen>('MENU');
  const [progress, setProgress] = useState<PlayerProgress>(loadProgress());
  
  // Game State
  const [gameState, setGameState] = useState<GameState>({ ...INITIAL_STATE, isPlaying: false });
  const [grid, setGrid] = useState<(UnitInstance | null)[]>(Array(TOTAL_SLOTS).fill(null));
  const [tooltip, setTooltip] = useState<TooltipData>({ visible: false, x: 0, y: 0, title: '', content: '' });

  // Refs
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<FloatingText[]>([]);
  const sessionStats = useRef({ kills: 0, merges: 0 }); // Track current game stats
  const lastShootSoundRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [, setTick] = useState(0); // Force render

  // Dragging State
  const [dragState, setDragState] = useState<{
    activeId: string | null;
    startIndex: number | null;
    currentX: number;
    currentY: number;
    startX: number;
    startY: number;
    targetIndex: number | null;
  }>({ activeId: null, startIndex: null, currentX: 0, currentY: 0, startX: 0, startY: 0, targetIndex: null });

  // --- GAME LOOP ---
  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = time - lastTime;
      
      if (screen === 'GAME' && gameState.isPlaying && !gameState.isGameOver && !gameState.isVictory && !gameState.isPaused) {
        if (delta >= 1000 / FPS) {
          updateGameLogic();
          lastTime = time;
          setTick(t => t + 1);
        }
      }
      
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [screen, gameState.isPlaying, gameState.isGameOver, gameState.isVictory, gameState.isPaused, grid]);

  // --- CORE LOGIC ---
  const updateGameLogic = () => {
    setGameState(prev => {
      if (prev.isGameOver || prev.isVictory) return prev;

      let newHp = prev.hp;
      let newMana = prev.mana;
      let newScore = prev.score;
      let newLevel = prev.level;
      let newWave = prev.wave;
      let newEnemiesSpawned = prev.enemiesSpawnedInWave;
      let isGameOver = false;
      let isVictory = false;

      // 1. Spawning Enemies
      let newSpawnTimer = prev.spawnTimer - 1;
      const isBossWave = prev.wave === WAVES_PER_LEVEL;
      const canSpawn = !isBossWave || (isBossWave && newEnemiesSpawned === 0);

      if (canSpawn && newSpawnTimer <= 0) {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        let enemy: Enemy;

        if (isBossWave) {
             enemy = generateEnemy(prev.level, prev.wave, 2, true); 
             newEnemiesSpawned = 1;
        } else {
             enemy = generateEnemy(prev.level, prev.wave, lane, false);
             newEnemiesSpawned++;
        }
        
        enemiesRef.current.push(enemy);
        
        const globalDifficulty = (prev.level - 1) * 5 + prev.wave;
        const spawnRate = Math.max(25, 100 - (globalDifficulty * 1.5)); 
        newSpawnTimer = isBossWave ? 999999 : spawnRate;

        if (!isBossWave && newEnemiesSpawned >= ENEMIES_PER_WAVE) {
             newWave++;
             newEnemiesSpawned = 0;
             newSpawnTimer = 180;
             particlesRef.current.push({
                id: Math.random().toString(),
                x: 50,
                y: 40,
                text: `ВОЛНА ${newWave}`,
                color: 'text-white font-bold text-2xl',
                life: 100
             });
        }
      }

      // 2. Projectiles
      const remainingProjectiles: Projectile[] = [];
      projectilesRef.current.forEach(proj => {
        proj.y -= proj.speed;
        let hit = false;
        
        for (const enemy of enemiesRef.current) {
          const isBonus = enemy.type.startsWith('bonus_');
          if (!isBonus && enemy.lane === proj.lane && Math.abs(enemy.y - proj.y) < 6) {
            enemy.hp -= proj.damage;
            hit = true;
            playHitSound();
            particlesRef.current.push({
              id: Math.random().toString(),
              x: 10 + (enemy.lane * 20),
              y: enemy.y,
              text: `-${Math.floor(proj.damage)}`,
              color: 'text-white',
              life: 20
            });
            break;
          }
        }
        if (!hit && proj.y > -10) remainingProjectiles.push(proj);
      });
      projectilesRef.current = remainingProjectiles;

      // 3. Enemies
      const remainingEnemies: Enemy[] = [];
      let bossDefeated = false;

      enemiesRef.current.forEach(enemy => {
        const isBonus = enemy.type.startsWith('bonus_');
        
        if (!isBonus && enemy.hp <= 0) {
          playDeathSound();
          sessionStats.current.kills++;
          const reward = enemy.type === 'boss' ? (1000 * prev.level) : (15 + (prev.level * 5));
          newMana += reward;
          newScore += reward;
          
          particlesRef.current.push({
            id: Math.random().toString(),
            x: 10 + (enemy.lane * 20),
            y: enemy.y,
            text: `+${reward}`,
            color: 'text-yellow-400 font-bold text-lg',
            life: 40
          });
          
          if (enemy.type === 'boss') bossDefeated = true;
        } else {
          enemy.y += enemy.speed;
          if (enemy.y >= 95) {
             if (!isBonus) {
                newHp -= 1;
                playHitSound(); 
                particlesRef.current.push({
                  id: Math.random().toString(),
                  x: 10 + (enemy.lane * 20),
                  y: 95,
                  text: `-1 HP`,
                  color: 'text-red-500 font-bold text-xl',
                  life: 50
                });
             }
          } else {
            remainingEnemies.push(enemy);
          }
        }
      });
      enemiesRef.current = remainingEnemies;

      // Level Up / Win / Loss Logic
      if (bossDefeated) {
          if (prev.level === MAX_LEVELS) {
              isVictory = true;
              handleGameEnd(true, prev.level);
          } else {
              newLevel++;
              newWave = 1;
              newEnemiesSpawned = 0;
              newSpawnTimer = 300;
              particlesRef.current.push({
                  id: Math.random().toString(),
                  x: 50,
                  y: 30,
                  text: `УРОВЕНЬ ${newLevel}!`,
                  color: 'text-yellow-300 font-bold text-4xl neon-text',
                  life: 200
              });
              playBonusSound();
          }
      }

      if (newHp <= 0) {
        isGameOver = true;
        handleGameEnd(false, prev.level);
        playGameOverSound();
      }

      // 4. Shooting Logic (Multi-lane Support)
      const now = performance.now();
      let didShoot = false;
      grid.forEach(unit => {
        if (!unit) return;
        const stats = UNIT_STATS[unit.level];
        
        if (now - unit.lastFired >= stats.cooldownMs) {
          const col = unit.slotIndex % GRID_COLS;
          
          // Determine target lanes
          const targetLanes = [col];
          if (stats.multiLane) {
             if (col > 0) targetLanes.push(col - 1);
             if (col < GRID_COLS - 1) targetLanes.push(col + 1);
          }

          // Check if ANY target lane has an enemy close enough
          const hasTarget = enemiesRef.current.some(e => 
             !e.type.startsWith('bonus_') && targetLanes.includes(e.lane) && e.y < 85
          ); 
          
          if (hasTarget) {
            // Fire in ALL valid target lanes
            targetLanes.forEach(lane => {
                const row = Math.floor(unit.slotIndex / GRID_COLS);
                const cellHeightPercent = GRID_HEIGHT_PERCENT / GRID_ROWS;
                const unitY = GRID_START_Y + (row * cellHeightPercent) + (cellHeightPercent / 2);

                projectilesRef.current.push({
                    id: Math.random().toString(),
                    lane: lane,
                    x: 0,
                    y: unitY, 
                    damage: stats.damage,
                    speed: stats.projectileSpeed
                });
            });
            
            unit.lastFired = now; 
            didShoot = true;
          }
        }
      });

      if (didShoot && now - lastShootSoundRef.current > 50) {
        playShootSound();
        lastShootSoundRef.current = now;
      }

      // 5. Particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.life--;
        p.y -= 0.2; 
        return p.life > 0;
      });

      return {
        ...prev,
        hp: newHp,
        mana: newMana,
        score: newScore,
        level: newLevel,
        wave: newWave,
        enemiesSpawnedInWave: newEnemiesSpawned,
        isGameOver,
        isVictory,
        spawnTimer: newSpawnTimer
      };
    });
  };

  const handleGameEnd = (won: boolean, levelReached: number) => {
      const p = updateStats(sessionStats.current.kills, sessionStats.current.merges, levelReached, won);
      setProgress(p);
  };

  const startGame = (startLevel: number) => {
      setGrid(Array(TOTAL_SLOTS).fill(null));
      enemiesRef.current = [];
      projectilesRef.current = [];
      particlesRef.current = [];
      sessionStats.current = { kills: 0, merges: 0 };
      
      setGameState({ 
          ...INITIAL_STATE, 
          level: startLevel,
          isPlaying: true, 
          isGameOver: false, 
          isVictory: false, 
          isPaused: false,
          enemiesSpawnedInWave: 0 
      });
      setScreen('GAME');
  };

  const returnToMenu = () => {
      setScreen('MENU');
      setGameState({ ...INITIAL_STATE, isPlaying: false });
  };

  // --- ACTIONS ---

  const activateBonus = (type: Enemy['type'], x: number, y: number) => {
      if (type === 'bonus_bomb') {
          playBombSound();
          enemiesRef.current = enemiesRef.current.filter(e => {
              if (e.type.startsWith('bonus_')) return true; 
              if (e.type === 'boss') {
                  e.hp -= (5000 * gameState.level);
                  particlesRef.current.push({ id: Math.random().toString(), x: 50, y: e.y, text: `💥`, color: 'text-red-500 text-3xl', life: 60 });
                  return true;
              }
              particlesRef.current.push({ id: Math.random().toString(), x: (e.lane * 20) + 10, y: e.y, text: `BOOM!`, color: 'text-orange-500', life: 30 });
              sessionStats.current.kills++;
              return false;
          });
          
      } else if (type === 'bonus_upgrade') {
          playBonusSound();
          const validUnits = grid.map((u, i) => ({ unit: u, index: i })).filter(item => item.unit !== null && item.unit.level < UnitLevel.L10);
          if (validUnits.length > 0) {
              const pick = validUnits[Math.floor(Math.random() * validUnits.length)];
              setGrid(prev => {
                  const next = [...prev];
                  if (next[pick.index]) {
                      next[pick.index] = { ...next[pick.index]!, level: next[pick.index]!.level + 1 };
                  }
                  return next;
              });
              particlesRef.current.push({ id: Math.random().toString(), x: (pick.index % GRID_COLS) * 20 + 10, y: GRID_START_Y, text: `UPGRADE!`, color: 'text-cyan-400 font-bold', life: 50 });
          } else {
               setGameState(prev => ({ ...prev, mana: prev.mana + 100 }));
          }
      } else if (type === 'bonus_unit') {
          playBonusSound();
          const emptyIndices = grid.map((u, i) => u === null ? i : -1).filter(i => i !== -1);
          if (emptyIndices.length > 0) {
              const slot = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
              setGrid(prev => {
                  const next = [...prev];
                  next[slot] = { id: Math.random().toString(), level: UnitLevel.L1, lastFired: 0, slotIndex: slot };
                  return next;
              });
              particlesRef.current.push({ id: Math.random().toString(), x: (slot % GRID_COLS) * 20 + 10, y: GRID_START_Y, text: `FREE!`, color: 'text-green-400', life: 40 });
          } else {
             setGameState(prev => ({ ...prev, mana: prev.mana + 50 }));
          }
      }
  };

  const handleSpawn = () => {
    if (gameState.mana < gameState.spawnCost) return;
    const emptyIndices = grid.map((u, i) => u === null ? i : -1).filter(i => i !== -1);
    if (emptyIndices.length === 0) return;

    playSpawnSound();
    const randomSlot = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    const newUnit: UnitInstance = {
      id: Math.random().toString(),
      level: UnitLevel.L1,
      lastFired: 0,
      slotIndex: randomSlot
    };
    const newGrid = [...grid];
    newGrid[randomSlot] = newUnit;
    setGrid(newGrid);
    setGameState(prev => ({ ...prev, mana: prev.mana - prev.spawnCost, spawnCost: getNextCost(prev.spawnCost) }));
  };

  const handlePauseToggle = () => {
      setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
      setTooltip({ visible: false, x: 0, y: 0, title: '', content: '' });
  };

  const showTooltip = (x: number, y: number, title: string, content: string) => {
    const screenWidth = window.innerWidth;
    const finalX = Math.min(x, screenWidth - 220); 
    setTooltip({ visible: true, x: finalX, y: y + 20, title, content });
  };

  const handleEnemyClick = (enemy: Enemy, e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      let clientX, clientY;
      if ('touches' in e) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      } else {
          clientX = (e as React.MouseEvent).clientX;
          clientY = (e as React.MouseEvent).clientY;
      }

      if (enemy.type.startsWith('bonus_')) {
          activateBonus(enemy.type, clientX, clientY);
          enemiesRef.current = enemiesRef.current.filter(x => x.id !== enemy.id);
          return;
      }

      let desc = `Уровень: ${enemy.level}`;
      if (enemy.type === 'fast') desc += '\nБыстрый и юркий';
      if (enemy.type === 'boss') desc += '\nБОСС! Огромное здоровье.';

      showTooltip(clientX, clientY, enemy.type === 'boss' ? 'БОСС' : 'Враг', `${desc}\nHP: ${Math.ceil(enemy.hp)}/${enemy.maxHp}`);
  };

  // --- DRAG ---
  const handleDragStart = (e: React.PointerEvent, unit: UnitInstance, index: number) => {
    if (gameState.isGameOver || gameState.isPaused) return;
    e.preventDefault(); 
    setDragState({ activeId: unit.id, startIndex: index, currentX: e.clientX, currentY: e.clientY, startX: e.clientX, startY: e.clientY, targetIndex: null });
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e: PointerEvent) => {
    e.preventDefault();
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const slotElement = elements.find(el => el.hasAttribute('data-slot-index'));
    const targetIndex = slotElement ? parseInt(slotElement.getAttribute('data-slot-index') || '-1') : null;
    setDragState(prev => ({ ...prev, currentX: e.clientX, currentY: e.clientY, targetIndex: targetIndex }));
  };

  const handlePointerUp = (e: PointerEvent) => {
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);

    setDragState(prev => {
      const dist = Math.hypot(prev.currentX - prev.startX, prev.currentY - prev.startY);
      if (dist < 10 && prev.startIndex !== null) {
          const unit = grid[prev.startIndex];
          if (unit) {
             const stats = UNIT_STATS[unit.level];
             showTooltip(prev.startX, prev.startY, stats.name, `${stats.description}\nУрон: ${stats.damage}`);
          }
      } else {
          if (prev.activeId && prev.startIndex !== null && prev.targetIndex !== null && prev.startIndex !== prev.targetIndex) {
            performMoveOrMerge(prev.startIndex, prev.targetIndex);
          }
      }
      return { activeId: null, startIndex: null, currentX: 0, currentY: 0, startX: 0, startY: 0, targetIndex: null };
    });
  };

  const performMoveOrMerge = (fromIndex: number, toIndex: number) => {
    setGrid(prevGrid => {
      const newGrid = [...prevGrid];
      const sourceUnit = newGrid[fromIndex];
      const targetUnit = newGrid[toIndex];
      if (!sourceUnit) return prevGrid;

      if (!targetUnit) {
        newGrid[toIndex] = { ...sourceUnit, slotIndex: toIndex };
        newGrid[fromIndex] = null;
      } else {
        if (sourceUnit.level === targetUnit.level && sourceUnit.level < UnitLevel.L10) {
          playMergeSound();
          sessionStats.current.merges++;
          if (sourceUnit.level + 1 === 10) unlockAchievement('max_unit');
          
          newGrid[toIndex] = { ...targetUnit, level: targetUnit.level + 1, id: Math.random().toString() };
          newGrid[fromIndex] = null;
          particlesRef.current.push({ id: Math.random().toString(), x: (toIndex % GRID_COLS) * 20 + 10, y: GRID_START_Y + 5, text: 'MERGE!', color: 'text-cyan-400', life: 40 });
        } else {
          newGrid[toIndex] = { ...sourceUnit, slotIndex: toIndex };
          newGrid[fromIndex] = { ...targetUnit, slotIndex: fromIndex };
        }
      }
      return newGrid;
    });
  };

  const handleContainerClick = () => { if (tooltip.visible) setTooltip({ ...tooltip, visible: false }); };

  // --- RENDER ---

  if (screen === 'MENU') {
      return <MainMenu progress={progress} onStartLevel={startGame} onShowAchievements={() => setScreen('ACHIEVEMENTS')} />;
  }

  if (screen === 'ACHIEVEMENTS') {
      return <AchievementsMenu progress={progress} onBack={() => setScreen('MENU')} />;
  }
  
  return (
    <div className="relative h-screen w-full max-w-md mx-auto bg-slate-900 overflow-hidden flex flex-col font-sans select-none" ref={containerRef} onClick={handleContainerClick}>
      {/* TOP HUD */}
      <div className="h-[12%] bg-slate-900 border-b border-slate-700 flex justify-between items-center px-2 z-20 shadow-lg relative">
        <button onClick={(e) => { e.stopPropagation(); handlePauseToggle(); }} className="p-2 mr-2 text-slate-400 hover:text-white border border-slate-600 rounded bg-slate-800">⏸</button>
        <div className="flex flex-col items-center w-1/4">
           <span className="text-[10px] text-slate-400">ЭТАП</span>
           <span className="text-xl font-bold text-yellow-400 neon-text whitespace-nowrap">L{gameState.level} - W{gameState.wave}</span>
        </div>
        <div className="flex flex-col items-center flex-1 mx-2">
           <span className="text-[10px] text-slate-400">БАЗА</span>
           <div className="flex flex-wrap justify-center gap-0.5">
             {Array.from({ length: Math.ceil(gameState.hp) }).map((_, i) => <span key={i} className="text-sm">❤️</span>)}
           </div>
        </div>
        <div className="flex flex-col items-center w-1/4">
           <span className="text-[10px] text-slate-400">МАНА</span>
           <span className="text-xl font-bold text-blue-400 neon-text">{gameState.mana}</span>
        </div>
      </div>

      {/* GAME LAYER */}
      <div className="relative flex-1 bg-slate-900/50">
        <div className="absolute inset-0 flex pointer-events-none">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex-1 border-r border-slate-800/30 last:border-0" />)}
        </div>

        <div className="absolute inset-0 overflow-hidden z-10">
          {enemiesRef.current.map(enemy => {
             const isBonus = enemy.type.startsWith('bonus_');
             return (
                <div key={enemy.id} className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center cursor-pointer ${isBonus ? 'z-50' : 'z-20'}`}
                  style={{ left: `${(enemy.lane * 20) + 10}%`, top: `${enemy.y}%`, width: '18%', height: '8%' }}
                  onClick={(e) => handleEnemyClick(enemy, e)}>
                   <div className="relative animate-float w-full h-full flex flex-col items-center">
                      {!isBonus && <div className="text-[8px] text-white/50 mb-0.5 font-mono">Lv.{enemy.level}</div>}
                      <EnemySkin type={enemy.type} className={`w-full h-full ${enemy.type === 'boss' ? 'scale-125' : ''}`} />
                      {!isBonus && (
                          <div className="w-full h-1.5 bg-gray-800/90 rounded-full mt-1 border border-gray-600/50 overflow-hidden shadow-sm">
                            <div className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-300 ease-out" style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} />
                          </div>
                      )}
                      {isBonus && <div className="text-[10px] bg-black/50 px-1 rounded text-white mt-1 pointer-events-none">ЖМИ!</div>}
                  </div>
                </div>
             );
          })}
          {projectilesRef.current.map(proj => (
            <div key={proj.id} className="absolute w-1.5 h-6 bg-cyan-400 rounded-full shadow-[0_0_10px_cyan] transform -translate-x-1/2 pointer-events-none" style={{ left: `${(proj.lane * 20) + 10}%`, top: `${proj.y}%` }} />
          ))}
          {particlesRef.current.map(p => (
            <div key={p.id} className={`absolute transform -translate-x-1/2 pointer-events-none ${p.color} font-bold text-shadow-sm`} style={{ left: `${p.x}%`, top: `${p.y}%` }}>{p.text}</div>
          ))}
        </div>
        
        <div className="absolute bottom-0 w-full h-1 bg-red-600/50 shadow-[0_0_25px_red] z-0" />

        <div className="absolute bottom-0 w-full p-2 z-10 bg-gradient-to-t from-slate-900/90 to-transparent" style={{ height: `${GRID_HEIGHT_PERCENT}%` }}>
          <div className="grid grid-cols-5 grid-rows-2 gap-2 h-full">
            {grid.map((unit, index) => <GridSlot key={index} index={index} unit={unit} onDragStart={handleDragStart} isDragTarget={dragState.targetIndex === index} isSource={dragState.startIndex === index} />)}
          </div>
        </div>

        {tooltip.visible && (
            <div className="absolute z-50 bg-slate-800/95 border border-slate-500 text-white text-sm p-3 rounded-lg shadow-xl pointer-events-none whitespace-pre-line" style={{ left: tooltip.x, top: tooltip.y }}>
                <div className="font-bold text-yellow-400 mb-1">{tooltip.title}</div>
                <div className="text-slate-300">{tooltip.content}</div>
            </div>
        )}
      </div>

      {dragState.activeId && (
        <div className="fixed pointer-events-none z-50 w-20 h-20 opacity-90 scale-125" style={{ left: dragState.currentX, top: dragState.currentY, transform: 'translate(-50%, -50%)' }}>
          {grid[dragState.startIndex!] && <UnitSkin level={grid[dragState.startIndex!]!.level} />}
        </div>
      )}

      <div className="h-[15%] bg-slate-900 border-t border-slate-700 p-4 flex flex-col justify-center gap-2 z-20">
        <button className={`w-full h-full rounded-xl flex flex-col items-center justify-center font-bold text-white transition-all ${gameState.mana >= gameState.spawnCost ? 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-[0_0_20px_rgba(79,70,229,0.4)] active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`} onClick={(e) => { e.stopPropagation(); handleSpawn(); }} disabled={gameState.mana < gameState.spawnCost}>
          <span className="text-xl uppercase tracking-wider">ПРИЗВАТЬ ЮНИТА</span>
          <span className="text-sm font-normal opacity-80 flex items-center gap-1"><span className="text-blue-300">{gameState.spawnCost} МАНЫ</span></span>
        </button>
      </div>

      <GameOverlay isGameOver={gameState.isGameOver} isVictory={gameState.isVictory} isPaused={gameState.isPaused} level={gameState.level} wave={gameState.wave} score={gameState.score} onRestart={() => returnToMenu()} onResume={handlePauseToggle} />
    </div>
  );
}