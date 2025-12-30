// Simple synth audio manager using Web Audio API

// Check for browser support
const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
let ctx: AudioContext | null = null;

const getCtx = () => {
  if (!ctx && AudioContextClass) {
    ctx = new AudioContextClass();
  }
  return ctx;
};

// Helper to play a simple tone
const playTone = (freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
  const context = getCtx();
  if (!context) return;
  if (context.state === 'suspended') context.resume();

  const osc = context.createOscillator();
  const gain = context.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, context.currentTime);
  
  gain.gain.setValueAtTime(vol, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(context.destination);
  
  osc.start();
  osc.stop(context.currentTime + duration);
};

export const playShootSound = () => {
    // Short high pitch blip, slightly randomized
    const pitch = 300 + Math.random() * 50;
    playTone(pitch, 'square', 0.05, 0.02);
};

export const playHitSound = () => {
    // Low thud
    playTone(100, 'sawtooth', 0.05, 0.03);
};

export const playSpawnSound = () => {
    const context = getCtx();
    if (!context) return;
    if (context.state === 'suspended') context.resume();

    const osc = context.createOscillator();
    const gain = context.createGain();
    
    osc.frequency.setValueAtTime(220, context.currentTime);
    osc.frequency.linearRampToValueAtTime(600, context.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.1, context.currentTime);
    gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(context.destination);
    
    osc.start();
    osc.stop(context.currentTime + 0.2);
};

export const playMergeSound = () => {
    const context = getCtx();
    if (!context) return;
    if (context.state === 'suspended') context.resume();

    const now = context.currentTime;
    // Play a major triad arpeggio
    [523.25, 659.25, 783.99].forEach((freq, i) => { 
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        
        gain.gain.setValueAtTime(0.1, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
        
        osc.connect(gain);
        gain.connect(context.destination);
        
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.4);
    });
};

export const playDeathSound = () => {
    const context = getCtx();
    if (!context) return;
    if (context.state === 'suspended') context.resume();

    const osc = context.createOscillator();
    const gain = context.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, context.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.1, context.currentTime);
    gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(context.destination);
    
    osc.start();
    osc.stop(context.currentTime + 0.3);
};

export const playGameOverSound = () => {
    const context = getCtx();
    if (!context) return;
    if (context.state === 'suspended') context.resume();

    const osc = context.createOscillator();
    const gain = context.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, context.currentTime);
    osc.frequency.linearRampToValueAtTime(50, context.currentTime + 1.5);
    
    gain.gain.setValueAtTime(0.2, context.currentTime);
    gain.gain.linearRampToValueAtTime(0, context.currentTime + 1.5);
    
    osc.connect(gain);
    gain.connect(context.destination);
    
    osc.start();
    osc.stop(context.currentTime + 1.5);
};

export const playBonusSound = () => {
    const context = getCtx();
    if (!context) return;
    if (context.state === 'suspended') context.resume();

    // Magical chime
    const now = context.currentTime;
    [880, 1174, 1318, 1760].forEach((freq, i) => { 
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        
        gain.gain.setValueAtTime(0.05, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.5);
        
        osc.connect(gain);
        gain.connect(context.destination);
        
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.5);
    });
};

export const playBombSound = () => {
    const context = getCtx();
    if (!context) return;
    if (context.state === 'suspended') context.resume();

    const osc = context.createOscillator();
    const gain = context.createGain();
    
    // Explosion noise
    osc.type = 'sawtooth'; // Rough sound
    osc.frequency.setValueAtTime(100, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.3, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(context.destination);
    
    osc.start();
    osc.stop(context.currentTime + 0.5);
};