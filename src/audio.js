// Tiny procedural sound kit — no external audio assets.
export class Sound {
  constructor() {
    this.ctx = null;
    this.out = null;
    this.noiseBuf = null;
    this.muted = false;
    this.ambience = null;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 22;
    comp.ratio.value = 8;
    comp.attack.value = 0.003;
    comp.release.value = 0.22;

    const out = ctx.createGain();
    out.gain.value = this.muted ? 0 : 0.5;
    comp.connect(out).connect(ctx.destination);
    this.out = out;

    const len = Math.floor(ctx.sampleRate * 1.2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = 0.94 * last + 0.06 * white;
      data[i] = last * 3.2;
    }
    this.noiseBuf = buf;
    this.startAmbience();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.out && this.ctx) {
      this.out.gain.cancelScheduledValues(this.ctx.currentTime);
      this.out.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
  }

  startAmbience() {
    if (!this.ctx || this.ambience) return;
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.035, ctx.currentTime, 1.8);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    filter.Q.value = 3;

    const a = ctx.createOscillator();
    const b = ctx.createOscillator();
    a.type = 'sawtooth';
    b.type = 'sawtooth';
    a.frequency.value = 41;
    b.frequency.value = 41.7;
    a.connect(filter);
    b.connect(filter);
    filter.connect(g).connect(this.out);
    a.start();
    b.start();

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.09;
    lfoGain.gain.value = 0.014;
    lfo.connect(lfoGain).connect(g.gain);
    lfo.start();

    this.ambience = { a, b, lfo, g };
  }

  _now(delay = 0) { return this.ctx.currentTime + delay; }

  tone(freq, dur, { type = 'sine', gain = 0.2, end = freq, delay = 0, attack = 0.004 } = {}) {
    if (!this.ctx) return;
    const t = this._now(delay);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, freq), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  noise(dur, { gain = 0.2, freq = 900, end = 300, q = 0.8, delay = 0, type = 'lowpass' } = {}) {
    if (!this.ctx || !this.noiseBuf) return;
    const t = this._now(delay);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 1 + Math.random() * 0.2;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(Math.max(40, freq), t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, end), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(this.out);
    src.start(t, Math.random() * 0.2);
    src.stop(t + dur + 0.02);
  }

  punch() {
    this.noise(0.09, { gain: 0.24, freq: 620, end: 130, q: 1.2 });
    this.tone(120, 0.1, { type: 'triangle', gain: 0.22, end: 46 });
  }

  swing() {
    this.noise(0.16, { gain: 0.14, freq: 2400, end: 380, q: 1.6, type: 'bandpass' });
  }

  hit() {
    this.noise(0.12, { gain: 0.32, freq: 1200, end: 160, q: 1.1 });
    this.tone(150, 0.14, { type: 'square', gain: 0.12, end: 48 });
  }

  crit() {
    this.noise(0.2, { gain: 0.36, freq: 2200, end: 220, q: 0.9 });
    this.tone(210, 0.2, { type: 'sawtooth', gain: 0.12, end: 42 });
  }

  gib() {
    this.noise(0.42, { gain: 0.4, freq: 1000, end: 90, q: 0.7 });
    this.tone(72, 0.45, { type: 'sawtooth', gain: 0.16, end: 30 });
    this.tone(190, 0.18, { type: 'triangle', gain: 0.1, end: 60, delay: 0.04 });
  }

  hurt() {
    this.tone(95, 0.22, { type: 'sawtooth', gain: 0.2, end: 40 });
    this.noise(0.18, { gain: 0.22, freq: 500, end: 110 });
  }

  grab() {
    this.noise(0.13, { gain: 0.18, freq: 500, end: 1400, q: 2, type: 'bandpass' });
    this.tone(260, 0.09, { type: 'triangle', gain: 0.1, end: 340 });
  }

  pickup() {
    this.tone(420, 0.08, { type: 'triangle', gain: 0.14, end: 620 });
    this.tone(640, 0.1, { type: 'triangle', gain: 0.1, end: 880, delay: 0.05 });
  }

  throw() {
    this.noise(0.22, { gain: 0.16, freq: 700, end: 2400, q: 1.4, type: 'bandpass' });
    this.tone(180, 0.18, { type: 'triangle', gain: 0.1, end: 90 });
  }

  spawn() {
    this.tone(48, 0.7, { type: 'sawtooth', gain: 0.2, end: 24 });
    this.noise(0.6, { gain: 0.22, freq: 240, end: 1800, q: 1.4, type: 'bandpass' });
    this.tone(320, 0.3, { type: 'triangle', gain: 0.08, end: 120, delay: 0.08 });
  }

  step() {
    this.noise(0.07, { gain: 0.05, freq: 220, end: 90 });
  }

  ui() {
    this.tone(540, 0.06, { type: 'triangle', gain: 0.09, end: 720 });
  }

  death() {
    this.tone(70, 1.1, { type: 'sawtooth', gain: 0.24, end: 26 });
    this.noise(0.9, { gain: 0.2, freq: 900, end: 60 });
  }
}
