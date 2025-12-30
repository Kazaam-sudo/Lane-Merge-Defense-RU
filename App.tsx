import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UnitInstance, UnitLevel, Enemy, Projectile, GameState, FloatingText, TooltipData } from './types';
import { INITIAL_STATE, UNIT_STATS, TOTAL_SLOTS, FPS, LANE_COUNT, ENEMY_SPAWN_Y, WALL_Y, GRID_START_Y, GRID_COLS, GRID_HEIGHT_PERCENT, GRID_ROWS, ENEMIES_PER_WAVE, WAVES_PER_LEVEL, MAX_LEVELS } from './constants';
import { generateEnemy, getNextCost } from './services/gameLogic';
import { playSpawnSound, playMergeSound, playShootSound, playHitSound, playDeathSound, playGameOverSound, playBonusSound, playBombSound } from './services/audio';
import { GridSlot } from './components/GridSlot';
import { GameOverlay } from './components/GameOverlay';

export default function App() {
  // --- STATE ---
  const [gameState, setGameState] = useState<GameState>({ ...INITIAL_STATE, isPlaying: true, isGameOver: false, isVictory: false, isPaused: false, spawnTimer: 0 });
  const [grid, setGrid] = useState<(UnitInstance | null)[]>(Array(TOTAL_SLOTS).fill(null));
  const [tooltip, setTooltip] = useState<TooltipData>({ visible: false, x: 0, y: 0, title: '', content: '' });

  // High frequency state (kept in refs for performance, forced render when needed)
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<FloatingText[]>([]);
  
  // Throttle shooting sounds
  const lastShootSoundRef = useRef(0);

  // Forced update for rendering canvas/entities layer
  const [, setTick] = useState(0);

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

  const containerRef = useRef<HTMLDivElement>(null);

  // --- GAME LOOP ---
  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = time - lastTime;
      
      if (gameState.isPlaying && !gameState.isGameOver && !gameState.isVictory && !gameState.isPaused) {
        // Limit logic updates to approx 60 FPS if monitor is higher refresh
        if (delta >= 1000 / FPS) {
          updateGameLogic();
          lastTime = time;
          setTick(t => t + 1); // Trigger re-render of entities
        }
      }
      
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [gameState.isPlaying, gameState.isGameOver, gameState.isVictory, gameState.isPaused, grid]); // Depend on grid for shooting logic context

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
      
      // Stop spawning if we reached spawn limit for this wave
      const canSpawn = !isBossWave || (isBossWave && newEnemiesSpawned === 0);

      if (canSpawn && newSpawnTimer <= 0) {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        
        let enemy: Enemy;

        if (isBossWave) {
             // Spawn Boss (Once per level)
             enemy = generateEnemy(prev.level, prev.wave, 2, true); // Center lane boss
             newEnemiesSpawned = 1; // Mark as spawned
        } else {
             // Normal Wave (might be bonus)
             enemy = generateEnemy(prev.level, prev.wave, lane, false);
             newEnemiesSpawned++;
        }
        
        enemiesRef.current.push(enemy);
        
        // Next Spawn Timer
        // Difficulty formula: Faster spawns at higher levels
        const globalDifficulty = (prev.level - 1) * 5 + prev.wave;
        const spawnRate = Math.max(25, 100 - (globalDifficulty * 1.5)); 
        newSpawnTimer = isBossWave ? 999999 : spawnRate; // Don't spawn more after boss

        // Wave Progression (Normal Waves 1-4)
        if (!isBossWave && newEnemiesSpawned >= ENEMIES_PER_WAVE) {
             newWave++;
             newEnemiesSpawned = 0;
             newSpawnTimer = 180; // Delay between waves (3 seconds)
             
             // Create "Wave Complete" text
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

      // 2. Move Projectiles
      const remainingProjectiles: Projectile[] = [];
      projectilesRef.current.forEach(proj => {
        proj.y -= proj.speed; // Move Up
        
        let hit = false;
        // Collision: Projectile vs Enemy (Ignore bonuses)
        for (const enemy of enemiesRef.current) {
          const isBonus = enemy.type.startsWith('bonus_');
          if (!isBonus && enemy.lane === proj.lane && Math.abs(enemy.y - proj.y) < 6) {
            enemy.hp -= proj.damage;
            hit = true;
            playHitSound();
            
            // Spawn damage particle
            particlesRef.current.push({
              id: Math.random().toString(),
              x: 10 + (enemy.lane * 20), // Approx X %
              y: enemy.y,
              text: `-${Math.floor(proj.damage)}`,
              color: 'text-white',
              life: 30
            });
            break;
          }
        }
        
        if (!hit && proj.y > -10) {
           remainingProjectiles.push(proj);
        }
      });
      projectilesRef.current = remainingProjectiles;

      // 3. Move Enemies & Check Deaths
      const remainingEnemies: Enemy[] = [];
      let bossDefeated = false;

      enemiesRef.current.forEach(enemy => {
        const isBonus = enemy.type.startsWith('bonus_');
        
        if (!isBonus && enemy.hp <= 0) {
          // Die (Normal Enemy)
          playDeathSound();
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
          
          if (enemy.type === 'boss') {
              bossDefeated = true;
          }

        } else {
          enemy.y += enemy.speed;
          
          if (enemy.y >= 95) { // Hit Wall (Bottom)
             // If bonus hits wall, it just disappears
             if (isBonus) {
               // Missed bonus
             } else {
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

      // Handle Boss Defeat (Level Up Logic)
      if (bossDefeated) {
          if (prev.level === MAX_LEVELS) {
              isVictory = true;
          } else {
              // Level Up!
              newLevel++;
              newWave = 1;
              newEnemiesSpawned = 0;
              newSpawnTimer = 300; // 5 seconds pause between levels
              
              particlesRef.current.push({
                  id: Math.random().toString(),
                  x: 50,
                  y: 30,
                  text: `УРОВЕНЬ ${newLevel}!`,
                  color: 'text-yellow-300 font-bold text-4xl neon-text',
                  life: 200
              });
              
              playBonusSound(); // Victory soundish
          }
      }

      if (newHp <= 0) {
        isGameOver = true;
        playGameOverSound();
      }

      // 4. Units Shoot
      const now = performance.now();
      let didShoot = false;
      grid.forEach(unit => {
        if (!unit) return;
        const stats = UNIT_STATS[unit.level];
        
        // Cooldown check
        if (now - unit.lastFired >= stats.cooldownMs) {
          const col = unit.slotIndex % GRID_COLS;
          
          // Check if enemy in lane (Ignore bonuses)
          const hasEnemyInLane = enemiesRef.current.some(e => 
             !e.type.startsWith('bonus_') && e.lane === col && e.y < 85
          ); 
          
          if (hasEnemyInLane) {
            // FIRE!
            const row = Math.floor(unit.slotIndex / GRID_COLS);
            const cellHeightPercent = GRID_HEIGHT_PERCENT / GRID_ROWS;
            const unitY = GRID_START_Y + (row * cellHeightPercent) + (cellHeightPercent / 2);

            projectilesRef.current.push({
              id: Math.random().toString(),
              lane: col,
              x: 0, // Unused for logic, lane is key
              y: unitY, 
              damage: stats.damage,
              speed: stats.projectileSpeed
            });
            
            unit.lastFired = now; 
            didShoot = true;
          }
        }
      });

      // Global throttle for shooting sound
      if (didShoot && now - lastShootSoundRef.current > 50) {
        playShootSound();
        lastShootSoundRef.current = now;
      }

      // 5. Update Particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.life--;
        p.y -= 0.2; // Float up
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

  // --- ACTIONS ---

  const activateBonus = (type: Enemy['type'], x: number, y: number) => {
      // Remove the bonus entity logic is handled by handleEnemyClick calling this and removing from ref
      
      if (type === 'bonus_bomb') {
          playBombSound();
          // Kill all non-boss enemies, damage boss
          enemiesRef.current = enemiesRef.current.filter(e => {
              if (e.type.startsWith('bonus_')) return true; // Keep other bonuses
              if (e.type === 'boss') {
                  e.hp -= (5000 * gameState.level); // Massive damage to boss scales with level
                  particlesRef.current.push({
                    id: Math.random().toString(),
                    x: 50,
                    y: e.y,
                    text: `-${5000 * gameState.level} 💥`,
                    color: 'text-red-500 font-bold text-3xl',
                    life: 60
                  });
                  return true;
              }
              // Destroy normal enemies
              particlesRef.current.push({
                id: Math.random().toString(),
                x: (e.lane * 20) + 10,
                y: e.y,
                text: `BOOM!`,
                color: 'text-orange-500 font-bold',
                life: 30
              });
              return false;
          });
          
      } else if (type === 'bonus_upgrade') {
          playBonusSound();
          // Upgrade random unit
          const validUnits = grid
             .map((u, i) => ({ unit: u, index: i }))
             .filter(item => item.unit !== null && item.unit.level < UnitLevel.L10);
          
          if (validUnits.length > 0) {
              const pick = validUnits[Math.floor(Math.random() * validUnits.length)];
              setGrid(prev => {
                  const next = [...prev];
                  if (next[pick.index]) {
                      next[pick.index] = { ...next[pick.index]!, level: next[pick.index]!.level + 1 };
                  }
                  return next;
              });
              particlesRef.current.push({
                id: Math.random().toString(),
                x: (pick.index % GRID_COLS) * 20 + 10,
                y: GRID_START_Y,
                text: `UPGRADE!`,
                color: 'text-cyan-400 font-bold text-xl',
                life: 50
              });
          } else {
               setGameState(prev => ({ ...prev, mana: prev.mana + 100 }));
               particlesRef.current.push({
                id: Math.random().toString(),
                x: 50,
                y: 50,
                text: `+100 MANA`,
                color: 'text-blue-400 font-bold',
                life: 40
              });
          }

      } else if (type === 'bonus_unit') {
          playBonusSound();
          // Free unit
          const emptyIndices = grid.map((u, i) => u === null ? i : -1).filter(i => i !== -1);
          if (emptyIndices.length > 0) {
              const slot = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
              setGrid(prev => {
                  const next = [...prev];
                  next[slot] = {
                      id: Math.random().toString(),
                      level: UnitLevel.L1,
                      lastFired: 0,
                      slotIndex: slot
                  };
                  return next;
              });
              particlesRef.current.push({
                id: Math.random().toString(),
                x: (slot % GRID_COLS) * 20 + 10,
                y: GRID_START_Y,
                text: `FREE!`,
                color: 'text-green-400 font-bold',
                life: 40
              });
          } else {
             // Full grid, mana fallback
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

    setGameState(prev => ({
      ...prev,
      mana: prev.mana - prev.spawnCost,
      spawnCost: getNextCost(prev.spawnCost)
    }));
  };

  const handleRestart = () => {
    setGrid(Array(TOTAL_SLOTS).fill(null));
    enemiesRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    setGameState({ ...INITIAL_STATE, isPlaying: true, isGameOver: false, isVictory: false, isPaused: false, spawnTimer: 0, enemiesSpawnedInWave: 0 });
    setTooltip({ visible: false, x: 0, y: 0, title: '', content: '' });
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

      let desc = 'Обычный враг';
      if (enemy.type === 'fast') desc = 'Быстрый и юркий';
      if (enemy.type === 'boss') desc = 'БОСС! Огромное здоровье.';

      showTooltip(clientX, clientY, enemy.type === 'boss' ? 'БОСС' : 'Враг', `${desc}\nHP: ${Math.ceil(enemy.hp)}/${enemy.maxHp}`);
  };

  // --- DRAG & DROP HANDLING ---

  const handleDragStart = (e: React.PointerEvent, unit: UnitInstance, index: number) => {
    if (gameState.isGameOver || gameState.isPaused) return;
    e.preventDefault(); 
    
    const clientX = e.clientX;
    const clientY = e.clientY;

    setDragState({
      activeId: unit.id,
      startIndex: index,
      currentX: clientX,
      currentY: clientY,
      startX: clientX,
      startY: clientY,
      targetIndex: null
    });
    
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e: PointerEvent) => {
    e.preventDefault();
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const slotElement = elements.find(el => el.hasAttribute('data-slot-index'));
    const targetIndex = slotElement ? parseInt(slotElement.getAttribute('data-slot-index') || '-1') : null;

    setDragState(prev => ({
      ...prev,
      currentX: e.clientX,
      currentY: e.clientY,
      targetIndex: targetIndex
    }));
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
             showTooltip(prev.startX, prev.startY, stats.name, `${stats.description}\nУрон: ${stats.damage}\nСкор: ${(1000/stats.cooldownMs).toFixed(1)}/сек`);
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
          newGrid[toIndex] = {
            ...targetUnit,
            level: targetUnit.level + 1,
            id: Math.random().toString()
          };
          newGrid[fromIndex] = null;
          
          particlesRef.current.push({
            id: Math.random().toString(),
            x: (toIndex % GRID_COLS) * 20 + 10,
            y: GRID_START_Y + Math.floor(toIndex / GRID_COLS) * (GRID_HEIGHT_PERCENT / GRID_ROWS) + 5,
            text: 'MERGE!',
            color: 'text-cyan-400 font-bold',
            life: 40
          });
        } else {
          newGrid[toIndex] = { ...sourceUnit, slotIndex: toIndex };
          newGrid[fromIndex] = { ...targetUnit, slotIndex: fromIndex };
        }
      }
      return newGrid;
    });
  };

  const handleContainerClick = () => {
      if (tooltip.visible) {
          setTooltip({ ...tooltip, visible: false });
      }
  };

  // --- RENDERING HELPERS ---
  
  return (
    <div 
        className="relative h-screen w-full max-w-md mx-auto bg-slate-900 overflow-hidden flex flex-col font-sans select-none" 
        ref={containerRef}
        onClick={handleContainerClick} // Close tooltip on background click
    >
      
      {/* 1. TOP BAR (HUD) */}
      <div className="h-[12%] bg-slate-900 border-b border-slate-700 flex justify-between items-center px-2 z-20 shadow-lg relative">
        {/* Pause Button */}
        <button 
            onClick={(e) => { e.stopPropagation(); handlePauseToggle(); }}
            className="p-2 mr-2 text-slate-400 hover:text-white border border-slate-600 rounded bg-slate-800"
        >
            ⏸
        </button>

        <div className="flex flex-col items-center w-1/4">
           <span className="text-[10px] text-slate-400">ЭТАП</span>
           <span className="text-xl font-bold text-yellow-400 neon-text whitespace-nowrap">L{gameState.level} - W{gameState.wave}</span>
        </div>
        <div className="flex flex-col items-center flex-1 mx-2">
           <span className="text-[10px] text-slate-400">БАЗА</span>
           <div className="flex flex-wrap justify-center gap-0.5">
             {Array.from({ length: Math.ceil(gameState.hp) }).map((_, i) => (
                 <span key={i} className="text-sm">❤️</span>
             ))}
           </div>
        </div>
        <div className="flex flex-col items-center w-1/4">
           <span className="text-[10px] text-slate-400">МАНА</span>
           <span className="text-xl font-bold text-blue-400 neon-text">{gameState.mana}</span>
        </div>
      </div>

      {/* 2. GAME AREA */}
      <div className="relative flex-1 bg-slate-900/50">
        
        {/* Lane Dividers */}
        <div className="absolute inset-0 flex pointer-events-none">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-1 border-r border-slate-800/30 last:border-0" />
          ))}
        </div>

        {/* Entities Layer (Enemies & Projectiles) */}
        <div className="absolute inset-0 overflow-hidden z-10">
          
          {/* Enemies (Added Interaction) */}
          {enemiesRef.current.map(enemy => {
             const isBonus = enemy.type.startsWith('bonus_');
             return (
                <div
                  key={enemy.id}
                  className={`
                     absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-75 will-change-transform flex flex-col items-center justify-center cursor-pointer
                     ${isBonus ? 'z-50' : 'z-20'}
                  `}
                  style={{
                    left: `${(enemy.lane * 20) + 10}%`,
                    top: `${enemy.y}%`,
                    width: '18%',
                    height: '8%'
                  }}
                  onClick={(e) => handleEnemyClick(enemy, e)}
                >
                   <div className="relative animate-float w-full flex flex-col items-center">
                      <div 
                         className={`
                           text-4xl filter drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] z-10 
                           ${enemy.type === 'boss' ? 'scale-150' : ''}
                           ${isBonus ? 'animate-pulse scale-125' : ''}
                         `}
                      >
                        {enemy.icon}
                      </div>
                      {!isBonus && (
                          <div className="w-full h-1.5 bg-gray-800/90 rounded-full mt-1 border border-gray-600/50 overflow-hidden shadow-sm">
                            <div 
                              className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-300 ease-out" 
                              style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
                            />
                          </div>
                      )}
                      {isBonus && (
                          <div className="text-[10px] bg-black/50 px-1 rounded text-white mt-1 pointer-events-none">ЖМИ!</div>
                      )}
                  </div>
                </div>
             );
          })}

          {/* Projectiles */}
          {projectilesRef.current.map(proj => (
            <div
              key={proj.id}
              className="absolute w-1.5 h-6 bg-cyan-400 rounded-full shadow-[0_0_10px_cyan] transform -translate-x-1/2 pointer-events-none"
              style={{
                left: `${(proj.lane * 20) + 10}%`,
                top: `${proj.y}%`
              }}
            />
          ))}

          {/* Particles */}
          {particlesRef.current.map(p => (
            <div
              key={p.id}
              className={`absolute transform -translate-x-1/2 pointer-events-none ${p.color} font-bold text-shadow-sm`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              {p.text}
            </div>
          ))}

        </div>

        {/* The Wall Line */}
        <div className="absolute bottom-0 w-full h-1 bg-red-600/50 shadow-[0_0_25px_red] z-0" />

        {/* 3. GRID AREA */}
        <div 
          className="absolute bottom-0 w-full p-2 z-10 bg-gradient-to-t from-slate-900/90 to-transparent"
          style={{ height: `${GRID_HEIGHT_PERCENT}%` }}
        >
          <div className="grid grid-cols-5 grid-rows-2 gap-2 h-full">
            {grid.map((unit, index) => (
              <GridSlot 
                key={index} 
                index={index} 
                unit={unit} 
                onDragStart={handleDragStart}
                isDragTarget={dragState.targetIndex === index}
                isSource={dragState.startIndex === index}
              />
            ))}
          </div>
        </div>

        {/* TOOLTIP */}
        {tooltip.visible && (
            <div 
                className="absolute z-50 bg-slate-800/95 border border-slate-500 text-white text-sm p-3 rounded-lg shadow-xl pointer-events-none whitespace-pre-line"
                style={{ left: tooltip.x, top: tooltip.y }}
            >
                <div className="font-bold text-yellow-400 mb-1">{tooltip.title}</div>
                <div className="text-slate-300">{tooltip.content}</div>
            </div>
        )}
        
      </div>

      {/* 4. DRAGGED ITEM GHOST */}
      {dragState.activeId && (
        <div 
          className="fixed pointer-events-none z-50 text-5xl filter drop-shadow-2xl opacity-90 scale-125"
          style={{ 
            left: dragState.currentX, 
            top: dragState.currentY,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {grid[dragState.startIndex!] ? UNIT_STATS[grid[dragState.startIndex!]!.level].icon : ''}
        </div>
      )}

      {/* 5. CONTROL BAR */}
      <div className="h-[15%] bg-slate-900 border-t border-slate-700 p-4 flex flex-col justify-center gap-2 z-20">
        <button
          className={`
            w-full h-full rounded-xl flex flex-col items-center justify-center font-bold text-white transition-all
            ${gameState.mana >= gameState.spawnCost 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-[0_0_20px_rgba(79,70,229,0.4)] active:scale-95 hover:shadow-[0_0_30px_rgba(79,70,229,0.6)]' 
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
          `}
          onClick={(e) => { e.stopPropagation(); handleSpawn(); }}
          disabled={gameState.mana < gameState.spawnCost}
        >
          <span className="text-xl uppercase tracking-wider">ПРИЗВАТЬ ЮНИТА</span>
          <span className="text-sm font-normal opacity-80 flex items-center gap-1">
             <span className="text-blue-300">{gameState.spawnCost} МАНЫ</span>
          </span>
        </button>
      </div>

      <GameOverlay 
        isGameOver={gameState.isGameOver} 
        isVictory={gameState.isVictory}
        isPaused={gameState.isPaused}
        level={gameState.level}
        wave={gameState.wave} 
        score={gameState.score} 
        onRestart={handleRestart} 
        onResume={handlePauseToggle}
      />
    </div>
  );
}