import { clamp, makeNoiseBuffer, rand } from './util.js';

// Fully procedural sound design: no external assets.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noise = null;
    this.muted = false;
    this.lastStep = 0;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.62;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 24;
    comp.ratio.value = 6;
    comp.attack.value = 0.002;
    comp.release.value = 0.22;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);
    this.noise = makeNoiseBuffer(this.ctx, 2.2);
    this.ambience();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.62, this.ctx.currentTime, 0.05);
  }

  now() { return this.ctx ? this.ctx.currentTime : 0; }

  noiseBurst({ dur = 0.1, gain = 0.5, filter = 'lowpass', freq = 1000, q = 0.8, freqEnd = null, attack = 0.002, pan = 0, playbackRate = 1 } = {}) {
    if (!this.ctx) return;
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = playbackRate;
    const f = this.ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (p) { p.pan.value = clamp(pan, -1, 1); src.connect(f); f.connect(g); g.connect(p); p.connect(this.master); }
    else { src.connect(f); f.connect(g); g.connect(this.master); }
    src.start(t, Math.random() * 1.2, dur + 0.05);
    src.stop(t + dur + 0.08);
  }

  tone({ freq = 200, freqEnd = null, dur = 0.1, gain = 0.3, type = 'sine', attack = 0.003, pan = 0, detune = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.now();
    const o = this.ctx.createOscillator();
    o.type = type;
    o.detune.value = detune;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (p) { p.pan.value = clamp(pan, -1, 1); o.connect(g); g.connect(p); p.connect(this.master); }
    else { o.connect(g); g.connect(this.master); }
    o.start(t); o.stop(t + dur + 0.02);
  }

  ambience() {
    if (!this.ctx) return;
    const t = this.now();
    // Deep room tone
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 170; f.Q.value = 0.4;
    const g = this.ctx.createGain(); g.gain.value = 0.14;
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
    // Electrical hum
    const hum = this.ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 49.5;
    const hum2 = this.ctx.createOscillator(); hum2.type = 'sine'; hum2.frequency.value = 99.2;
    const hf = this.ctx.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 220;
    const hg = this.ctx.createGain(); hg.gain.value = 0.018;
    hum.connect(hf); hum2.connect(hf); hf.connect(hg); hg.connect(this.master);
    hum.start(t); hum2.start(t);
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.13;
    const lg = this.ctx.createGain(); lg.gain.value = 0.008;
    lfo.connect(lg); lg.connect(hg.gain); lfo.start(t);
  }

  shot(kind, vol = 1) {
    if (!this.ctx) return;
    const p = rand(0.4, -0.4);
    if (kind === 'pistol') {
      this.noiseBurst({ dur: 0.11, gain: 0.46 * vol, filter: 'bandpass', freq: 1400, freqEnd: 500, q: 0.7, pan: p });
      this.noiseBurst({ dur: 0.04, gain: 0.5 * vol, filter: 'highpass', freq: 3200, pan: p });
      this.tone({ freq: 150, freqEnd: 55, dur: 0.14, gain: 0.5 * vol, type: 'triangle', pan: p });
    } else if (kind === 'shotgun') {
      this.noiseBurst({ dur: 0.3, gain: 0.62 * vol, filter: 'lowpass', freq: 2200, freqEnd: 300, q: 0.5, pan: p });
      this.noiseBurst({ dur: 0.06, gain: 0.4 * vol, filter: 'highpass', freq: 2400, pan: p });
      this.tone({ freq: 95, freqEnd: 38, dur: 0.34, gain: 0.65 * vol, type: 'triangle', pan: p });
    } else if (kind === 'smg') {
      this.noiseBurst({ dur: 0.07, gain: 0.34 * vol, filter: 'bandpass', freq: 1900, freqEnd: 700, q: 0.6, pan: p });
      this.tone({ freq: 190, freqEnd: 90, dur: 0.07, gain: 0.28 * vol, type: 'square', pan: p });
    } else if (kind === 'rifle') {
      this.noiseBurst({ dur: 0.16, gain: 0.5 * vol, filter: 'lowpass', freq: 3600, freqEnd: 700, q: 0.5, pan: p });
      this.noiseBurst({ dur: 0.05, gain: 0.42 * vol, filter: 'highpass', freq: 2600, pan: p });
      this.tone({ freq: 130, freqEnd: 44, dur: 0.2, gain: 0.5 * vol, type: 'triangle', pan: p });
    } else if (kind === 'enemy') {
      this.noiseBurst({ dur: 0.09, gain: 0.2 * vol, filter: 'bandpass', freq: 1100, freqEnd: 400, q: 0.8, pan: p });
      this.tone({ freq: 170, freqEnd: 70, dur: 0.09, gain: 0.16 * vol, type: 'triangle', pan: p });
    }
  }

  dryFire() { this.tone({ freq: 900, freqEnd: 420, dur: 0.04, gain: 0.1, type: 'square' }); }
  reloadClick(heavy = false) {
    this.tone({ freq: heavy ? 320 : 620, freqEnd: heavy ? 180 : 380, dur: 0.05, gain: 0.12, type: 'square' });
    this.noiseBurst({ dur: 0.05, gain: 0.1, filter: 'highpass', freq: 1800 });
  }
  equip() { this.noiseBurst({ dur: 0.09, gain: 0.12, filter: 'bandpass', freq: 2400, q: 2 }); this.tone({ freq: 420, freqEnd: 240, dur: .06, gain: .06, type: 'square' }); }

  swing() {
    this.noiseBurst({ dur: 0.17, gain: 0.17, filter: 'bandpass', freq: 300, freqEnd: 1600, q: 2.4, attack: 0.03 });
  }
  chainsaw() {
    this.tone({ freq: 68, freqEnd: 92, dur: 0.13, gain: 0.09, type: 'sawtooth' });
    this.noiseBurst({ dur: 0.12, gain: 0.14, filter: 'bandpass', freq: 700, freqEnd: 1200, q: 3 });
  }
  flesh(heavy = false) {
    const p = rand(0.35, -0.35);
    this.noiseBurst({ dur: heavy ? 0.16 : 0.08, gain: heavy ? 0.4 : 0.24, filter: 'lowpass', freq: heavy ? 700 : 1100, freqEnd: 160, pan: p });
    this.tone({ freq: heavy ? 90 : 140, freqEnd: 38, dur: heavy ? 0.18 : 0.1, gain: heavy ? 0.3 : 0.16, type: 'sine', pan: p });
  }
  squelch() {
    this.noiseBurst({ dur: 0.28, gain: 0.28, filter: 'lowpass', freq: 900, freqEnd: 180, q: 4, pan: rand(0.3, -0.3) });
    this.tone({ freq: 180, freqEnd: 60, dur: 0.22, gain: 0.12, type: 'sawtooth' });
  }
  bone() {
    this.noiseBurst({ dur: 0.09, gain: 0.26, filter: 'highpass', freq: 1500, q: 1.2 });
    this.tone({ freq: 440, freqEnd: 160, dur: 0.08, gain: 0.1, type: 'square' });
  }
  headPop() {
    this.noiseBurst({ dur: 0.22, gain: 0.45, filter: 'lowpass', freq: 700, freqEnd: 120 });
    this.bone();
    this.squelch();
  }
  hitmarker(kill = false) {
    this.tone({ freq: kill ? 1250 : 1750, freqEnd: kill ? 900 : 1400, dur: 0.04, gain: kill ? 0.1 : 0.06, type: 'sine' });
  }
  impact(kind = 'concrete') {
    if (kind === 'metal') this.tone({ freq: 900, freqEnd: 420, dur: 0.09, gain: 0.07, type: 'triangle' });
    else this.noiseBurst({ dur: 0.04, gain: 0.06, filter: 'highpass', freq: 2200 });
  }
  explosion() {
    this.noiseBurst({ dur: 0.9, gain: 0.75, filter: 'lowpass', freq: 900, freqEnd: 60, q: 0.6 });
    this.tone({ freq: 70, freqEnd: 24, dur: 0.9, gain: 0.7, type: 'sine' });
    this.noiseBurst({ dur: 0.18, gain: 0.4, filter: 'highpass', freq: 1800 });
  }
  footstep() {
    const t = this.now();
    if (t - this.lastStep < 0.14) return;
    this.lastStep = t;
    this.noiseBurst({ dur: 0.05, gain: 0.035, filter: 'lowpass', freq: 300 });
  }
  death() {
    this.tone({ freq: 210, freqEnd: 55, dur: 0.42, gain: 0.13, type: 'sawtooth' });
    this.noiseBurst({ dur: 0.3, gain: 0.08, filter: 'lowpass', freq: 500, freqEnd: 100 });
  }
  grunt() { this.tone({ freq: 150, freqEnd: 70, dur: 0.16, gain: 0.14, type: 'sawtooth' }); }
  waveStart() {
    this.tone({ freq: 60, freqEnd: 45, dur: 0.8, gain: 0.25, type: 'sine' });
    this.tone({ freq: 320, freqEnd: 300, dur: 0.5, gain: 0.05, type: 'square' });
  }
  ui() { this.tone({ freq: 700, freqEnd: 950, dur: 0.05, gain: 0.05, type: 'sine' }); }
}
