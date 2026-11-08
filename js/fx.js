import { rand, TAU, clamp, pick } from './util.js';

const BLOOD = ['rgba(112,5,12,', 'rgba(140,9,16,', 'rgba(88,3,9,'];
const DEV = ['rgba(255,60,40,', 'rgba(200,20,20,'];

export class ScreenFX {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.splats = [];
    this.flash = 0;
    this.flashColor = '255,235,200';
    this.low = 0;
    this.w = 1; this.h = 1; this.dpr = 1;
  }

  resize(w, h, dpr) {
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
  }

  splatter(amount = 1, fromTop = false) {
    const n = Math.floor(2 + amount * 3);
    for (let i = 0; i < n; i++) {
      if (this.splats.length > 42) this.splats.shift();
      const edge = Math.random();
      let x, y;
      if (fromTop) { x = rand(this.w * 0.9, this.w * 0.1); y = rand(this.h * 0.1, 0); }
      else if (edge < 0.5) { x = Math.random() < 0.5 ? rand(this.w * 0.24) : rand(this.w, this.w * 0.76); y = rand(this.h * 0.9, this.h * 0.06); }
      else { x = rand(this.w * 0.88, this.w * 0.1); y = Math.random() < 0.5 ? rand(this.h * 0.18) : rand(this.h, this.h * 0.8); }
      this.splats.push({
        x, y, r: rand(26, 6) * (0.6 + amount * 0.4),
        vx: rand(18, -18), vy: rand(60, 10),
        life: rand(7, 3), max: 7,
        color: pick(BLOOD), stretch: rand(2.2, 0.8),
        drops: Array.from({ length: 3 + (Math.random() * 5 | 0) }, () => ({
          ox: rand(26, -26), oy: rand(20, -20), r: rand(3.4, 0.8),
        })),
      });
    }
  }

  flash(strength = 0.5, color = '255,235,200') {
    this.flash = Math.max(this.flash, strength);
    this.flashColor = color;
  }

  update(dt, hpFrac = 1) {
    this.flash = Math.max(0, this.flash - dt * 3.2);
    this.low = clamp(1 - hpFrac, 0, 1);
    for (let i = this.splats.length - 1; i >= 0; i--) {
      const s = this.splats[i];
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy *= 0.995;
      if (s.life <= 0) this.splats.splice(i, 1);
    }
  }

  draw() {
    const c = this.ctx, w = this.w, h = this.h;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    if (this.low > 0.35) {
      const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.72);
      g.addColorStop(0, 'rgba(90,0,4,0)');
      g.addColorStop(1, `rgba(100,2,8,${(this.low - 0.35) * 0.55})`);
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
    for (const s of this.splats) {
      const a = clamp(s.life / s.max, 0, 1) * 0.75;
      c.save();
      c.translate(s.x, s.y);
      const g = c.createRadialGradient(0, 0, s.r * 0.1, 0, 0, s.r * s.stretch);
      g.addColorStop(0, s.color + (a * 0.9).toFixed(3) + ')');
      g.addColorStop(0.55, s.color + (a * 0.65).toFixed(3) + ')');
      g.addColorStop(1, s.color + '0)');
      c.fillStyle = g;
      c.beginPath(); c.ellipse(0, 0, s.r * s.stretch, s.r, 0, 0, TAU); c.fill();
      for (const d of s.drops) {
        c.fillStyle = s.color + (a * 0.8).toFixed(3) + ')';
        c.beginPath(); c.ellipse(d.ox, d.oy, d.r, d.r * 0.7, 0, 0, TAU); c.fill();
      }
      // drip
      if (s.r > 12) {
        c.strokeStyle = s.color + (a * 0.5).toFixed(3) + ')';
        c.lineWidth = 1.8;
        c.beginPath(); c.moveTo(0, s.r * 0.4); c.lineTo(2, s.r * 0.4 + s.life * 5); c.stroke();
      }
      c.restore();
    }
    if (this.flash > 0.001) {
      c.fillStyle = `rgba(${this.flashColor},${this.flash * 0.55})`;
      c.fillRect(0, 0, w, h);
    }
  }
}
