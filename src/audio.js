// Web Audio API sound effects generated procedurally
export class AudioManager {
  constructor() {
    this._ctx = null;
    this._init = false;
  }

  _ensure() {
    if (!this._ctx) {
      try { this._ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    return this._ctx;
  }

  _noise(duration, freq, type = 'square', decay = 0.1) {
    const ctx = this._ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + duration);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + decay);
    osc.start(); osc.stop(ctx.currentTime + decay + 0.01);
  }

  _whiteNoise(duration, filterFreq = 2000) {
    const ctx = this._ensure();
    if (!ctx) return;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    source.start(); source.stop(ctx.currentTime + duration + 0.01);
  }

  playStep() { this._whiteNoise(0.05, 800 + Math.random() * 200); }

  playBreak() {
    const ctx = this._ensure(); if (!ctx) return;
    this._whiteNoise(0.12, 600);
    setTimeout(() => this._noise(0.05, 150, 'sawtooth', 0.08), 30);
  }

  playPlace() {
    this._whiteNoise(0.06, 1200);
    this._noise(0.04, 200, 'sine', 0.06);
  }

  playJump() { this._noise(0.08, 300, 'sine', 0.1); }
  playLand() { this._whiteNoise(0.06, 400); }

  playHurt() {
    const ctx = this._ensure(); if (!ctx) return;
    this._noise(0.1, 400, 'sawtooth', 0.15);
  }

  playDie() {
    const ctx = this._ensure(); if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(); osc.stop(ctx.currentTime + 0.51);
  }

  playEat() {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => this._whiteNoise(0.04, 1000), i * 80);
    }
  }

  playXP() { this._noise(0.1, 1000 + Math.random() * 500, 'sine', 0.15); }

  playAmbient() {
    // Occasional cave sounds - very quiet rumble
    if (Math.random() < 0.002) this._noise(0.5, 60, 'sine', 0.5);
  }

  playNight() {
    // Occasional cricket chirp
    if (Math.random() < 0.005) {
      const ctx = this._ensure(); if (!ctx) return;
      for (let i = 0; i < 3; i++) {
        setTimeout(() => this._noise(0.03, 3000 + Math.random()*200, 'square', 0.05), i * 100);
      }
    }
  }

  resume() {
    const ctx = this._ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }
}
