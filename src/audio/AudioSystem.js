/**
 * AudioSystem — Self-contained Web Audio procedural synthesizer.
 * Provides rich sound effects and ambient noise without external assets.
 */
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.initialized = false;

    // Looping ambiance nodes
    this.fireGain = null;
    this.fireFilter = null;
    this.windGain = null;

    // Step timer
    this.stepTimer = 0;
  }

  init() {
    if (this.initialized) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    this.ctx = new AudioContext();
    this.initialized = true;

    this.setupAmbiance();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupAmbiance() {
    if (!this.ctx) return;

    // 1. Procedural Fire Crackle / Roar Loop
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    // Pink noise approximation
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const fireNoise = this.ctx.createBufferSource();
    fireNoise.buffer = noiseBuffer;
    fireNoise.loop = true;

    this.fireFilter = this.ctx.createBiquadFilter();
    this.fireFilter.type = 'bandpass';
    this.fireFilter.frequency.value = 650;
    this.fireFilter.Q.value = 2.0;

    this.fireGain = this.ctx.createGain();
    this.fireGain.gain.value = 0.35;

    fireNoise.connect(this.fireFilter);
    this.fireFilter.connect(this.fireGain);
    this.fireGain.connect(this.ctx.destination);
    fireNoise.start();

    // Occasional procedural crackle pops
    this.startRandomPops();

    // 2. Wind Ambiance Loop
    const windNoise = this.ctx.createBufferSource();
    windNoise.buffer = noiseBuffer;
    windNoise.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 280;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.12;

    windNoise.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);
    windNoise.start();
  }

  startRandomPops() {
    const triggerPop = () => {
      if (!this.initialized || !this.ctx) return;
      if (this.fireGain && this.fireGain.gain.value > 0.05) {
        this.playPop();
      }
      const nextDelay = 150 + Math.random() * 550;
      setTimeout(triggerPop, nextDelay);
    };
    setTimeout(triggerPop, 300);
  }

  playPop() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400 + Math.random() * 800, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.04);

    const popVol = (this.fireGain ? this.fireGain.gain.value : 0.3) * 0.45;
    gain.gain.setValueAtTime(popVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  updateFireSound(fuelPercent, distanceToFire = 0) {
    if (!this.fireGain || !this.fireFilter || !this.ctx) return;

    // Attenuation based on distance to fire
    const distFactor = Math.max(0, 1 - distanceToFire / 22);
    const targetGain = (fuelPercent / 100) * 0.45 * distFactor;
    const targetFreq = 300 + (fuelPercent / 100) * 600;

    const now = this.ctx.currentTime;
    this.fireGain.gain.setTargetAtTime(targetGain, now, 0.2);
    this.fireFilter.frequency.setTargetAtTime(targetFreq, now, 0.2);
  }

  playFootstep(isSprinting = false) {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = isSprinting ? 85 : 70;
    osc.frequency.setValueAtTime(baseFreq + Math.random() * 15, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    const vol = isSprinting ? 0.16 : 0.09;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playPickup() {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Crisp wooden knock chord
    [520, 780].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + i * 0.04 + 0.08);

      gain.gain.setValueAtTime(0.18, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.14);
    });
  }

  playAddFuel() {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Flame whoosh & crackle surge
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.46);

    // Rapid crackle pops
    for (let i = 0; i < 4; i++) {
      setTimeout(() => this.playPop(), i * 60);
    }
  }

  playWin() {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Major chord sunrise arpeggio (C4, E4, G4, C5, E5)
    const freqs = [261.63, 329.63, 392.0, 523.25, 659.25];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0.001, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.12 + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 2.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 2.6);
    });
  }

  playLose() {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Heavy descending dark tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 2.0);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 2.0);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 2.3);
  }

  playDrink() {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Refreshing liquid scoop and swallow
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.28);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playEat() {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Crisp food foraging bite / crunch
    [400, 310, 260].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + idx * 0.07 + 0.05);

      gain.gain.setValueAtTime(0.18, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.07);
    });
  }

  playColdShiver() {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Chattering teeth / cold shivering flutter
    for (let i = 0; i < 6; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900 + Math.random() * 200, now + i * 0.045);
      gain.gain.setValueAtTime(0.08, now + i * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.035);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.045);
      osc.stop(now + i * 0.045 + 0.04);
    }
  }

  playHurt() {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Impact / damage heartbeat thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.22);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  playSplash(intensity = 1.0) {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Water drop plop / bubble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480 * intensity, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

    gain.gain.setValueAtTime(0.22 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);

    // 2. High-frequency water spray noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.18);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, now);
    filter.frequency.linearRampToValueAtTime(450, now + 0.18);
    filter.Q.value = 3.0;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18 * intensity, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);
  }

  playBeaconBeep() {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Dual diagnostic chime (880Hz -> 1760Hz)
    [880, 1320, 1760].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.15, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.13);
    });
  }
}
