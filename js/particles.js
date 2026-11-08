import { rand, randInt, pick, TAU, clamp } from './util.js';

const BLOOD_COLORS = ['#6e0710', '#870b12', '#a3101a', '#5a050c', '#b51722'];

export class GoreSystem {
  constructor(worldW, worldH, groundY) {
    this.worldW = worldW;
    this.worldH = worldH;
    this.groundY = groundY;
    this.scale = 0.62;
    this.decals = document.createElement('canvas');
    this.decals.width = Math.ceil(worldW * this.scale);
    this.decals.height = Math.ceil(worldH * this.scale);
    this.dctx = this.decals.getContext('2d');
    this.dctx.scale(this.scale, this.scale);
    this.blood = [];
    this.gibs = [];
    this.casings = [];
    this.sparks = [];
    this.smoke = [];
    this.rings = [];
    this.mist = [];
    this.pools = [];
  }

  clear() {
    this.dctx.setTransform(1, 0, 0, 1, 0, 0);
    this.dctx.clearRect(0, 0, this.decals.width, this.decals.height);
    this.dctx.scale(this.scale, this.scale);
    this.blood.length = 0;
    this.gibs.length = 0;
    this.casings.length = 0;
    this.sparks.length = 0;
    this.smoke.length = 0;
    this.rings.length = 0;
    this.mist.length = 0;
    this.pools.length = 0;
  }

  bloodDrip(x, y, count = 1, spread = 18, speed = 120, opts = {}) {
    for (let i = 0; i < count; i++) {
      if (this.blood.length > 1500) this.blood.shift();
      const a = opts.angle !== undefined
        ? opts.angle + rand(spread, -spread)
        : -Math.PI / 2 + rand(spread, -spread);
      const sp = speed * rand(1.2, 0.35);
      this.blood.push({
        x: x + rand(6, -6), y: y + rand(8, -8),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        size: (opts.size || 2.4) * rand(1.5, 0.5),
        life: rand(2.2, 0.7), max: 2.2,
        color: pick(BLOOD_COLORS),
        gore: opts.gore || 0,
      });
    }
  }

  sprayCone(x, y, angle, spread, count, speed = 500, size = 2.6) {
    for (let i = 0; i < count; i++) {
      if (this.blood.length > 1600) this.blood.shift();
      const a = angle + rand(spread, -spread);
      const sp = speed * rand(1.25, 0.2);
      this.blood.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        size: size * rand(1.7, 0.35), life: rand(1.9, 0.35), max: 1.9,
        color: pick(BLOOD_COLORS), gore: 0.4,
      });
    }
  }

  bloodBurst(x, y, power = 400, count = 26) {
    for (let i = 0; i < count; i++) {
      if (this.blood.length > 1600) this.blood.shift();
      const a = rand(TAU);
      const sp = power * rand(1.4, 0.15);
      this.blood.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(120),
        size: rand(4.2, 0.9), life: rand(2.5, 0.6), max: 2.5,
        color: pick(BLOOD_COLORS), gore: 0.7,
      });
    }
  }

  arterial(x, y, dirAngle, strength = 1) {
    const n = 3 + Math.floor(strength * 4);
    for (let i = 0; i < n; i++) {
      const a = dirAngle + rand(0.55, -0.55);
      const sp = rand(680, 220) * strength;
      this.blood.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        size: rand(4.5, 1.4), life: rand(1.6, 0.4), max: 1.6,
        color: pick(BLOOD_COLORS), gore: 0.9,
      });
    }
  }

  pool(x, y, radius = 30, color = '#58060d') {
    this.pools.push({ x, y, r: radius, life: 1 });
    const c = this.dctx;
    c.save();
    c.globalAlpha = 0.85;
    const g = c.createRadialGradient(x, y, 1, x, y, radius);
    g.addColorStop(0, 'rgba(78,4,11,.95)');
    g.addColorStop(0.55, 'rgba(88,6,13,.75)');
    g.addColorStop(1, 'rgba(60,3,8,0)');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(x, y, radius, radius * 0.34, 0, 0, TAU);
    c.fill();
    c.globalAlpha = 0.5;
    c.fillStyle = 'rgba(140,18,26,.5)';
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.ellipse(x + rand(radius * 0.6, -radius * 0.6), y + rand(6, -6), rand(6, 2), rand(3, 1), 0, 0, TAU);
      c.fill();
    }
    c.restore();
  }

  splat(x, y, radius, angle = 0, alpha = 0.9) {
    const c = this.dctx;
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = pick(BLOOD_COLORS);
    const n = 4 + (radius / 5 | 0);
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rand(TAU), r = rand(radius, radius * 0.25);
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.6;
      c.moveTo(px + rand(5, 2), py);
      c.arc(px, py, rand(5, 2), 0, TAU);
    }
    c.fill();
    // droplets trailing opposite the travel direction
    for (let i = 0; i < 5; i++) {
      const d = rand(radius * 2.6, radius);
      c.beginPath();
      c.arc(x + Math.cos(angle + Math.PI) * d + rand(6, -6), y + Math.sin(angle + Math.PI) * d * 0.4 + rand(4, -4), rand(3.2, 0.8), 0, TAU);
      c.fill();
    }
    // specks
    for (let i = 0; i < 7; i++) {
      c.beginPath();
      c.arc(x + rand(radius * 3, -radius * 3), y + rand(radius * 1.1, -radius * 1.1), rand(1.8, 0.5), 0, TAU);
      c.fill();
    }
    c.restore();
  }

  decalWound(x, y, size = 4) {
    const c = this.dctx;
    c.save();
    c.fillStyle = 'rgba(40,2,5,.85)';
    c.beginPath(); c.arc(x, y, size, 0, TAU); c.fill();
    c.fillStyle = 'rgba(150,20,28,.8)';
    c.beginPath(); c.arc(x + size * 0.5, y + size * 0.5, size * 0.5, 0, TAU); c.fill();
    c.restore();
  }

  gib(x, y, vx, vy, size, color = '#8a5c4c', opts = {}) {
    if (this.gibs.length > 120) this.gibs.shift();
    this.gibs.push({
      x, y, vx, vy, size, color,
      rot: rand(TAU), vr: rand(14, -14),
      life: opts.life || rand(14, 6), max: 14,
      bone: opts.bone || false,
      rest: false, bounces: 0,
      stretch: 1,
    });
  }

  boneShard(x, y, vx, vy, size = 7) {
    if (this.gibs.length > 130) this.gibs.shift();
    this.gibs.push({
      x, y, vx, vy, size, color: '#d8cbae', rot: rand(TAU), vr: rand(18, -18),
      life: 14, max: 14, bone: true, rest: false, bounces: 0, stretch: 1.6,
    });
  }

  casing(x, y, dir, angle) {
    if (this.casings.length > 90) this.casings.shift();
    this.casings.push({
      x, y, vx: Math.cos(angle + dir * rand(1.5, 0.7)) * rand(260, 90),
      vy: Math.sin(angle) * 80 - rand(320, 140),
      rot: rand(TAU), vr: rand(26, -26), life: 6, rest: false,
    });
  }

  spark(x, y, nx, ny, count = 8, color = '#ffd08a') {
    for (let i = 0; i < count; i++) {
      this.sparks.push({
        x, y,
        vx: (nx + rand(0.9, -0.9)) * rand(520, 80),
        vy: (ny + rand(0.9, -0.9)) * rand(520, 80) - 40,
        life: rand(0.6, 0.15), max: 0.6, color,
      });
    }
  }

  dust(x, y, count = 5, size = 8, color = 'rgba(150,140,125,') {
    for (let i = 0; i < count; i++) {
      this.smoke.push({
        x: x + rand(10, -10), y: y + rand(8, -8),
        vx: rand(90, -90), vy: rand(-20, -90),
        r: size * rand(1.6, 0.5), life: rand(1.3, 0.4), max: 1.3,
        color, grow: rand(34, 10),
      });
      if (this.smoke.length > 160) this.smoke.shift();
    }
  }

  shockwave(x, y, radius = 260) {
    this.rings.push({ x, y, r: 6, max: radius, life: 1, maxLife: 1 });
  }

  bloodMist(x, y, radius = 40) {
    for (let i = 0; i < 6; i++) {
      this.mist.push({
        x: x + rand(radius, -radius) * 0.5, y: y + rand(radius, -radius) * 0.5,
        r: radius * rand(0.8, 0.25), life: rand(0.9, 0.3), max: 0.9,
        vx: rand(40, -40), vy: rand(-10, -50), color: 'rgba(120,8,16,',
      });
    }
  }

  update(dt) {
    const gy = this.groundY;
    const blood = this.blood;
    for (let i = blood.length - 1; i >= 0; i--) {
      const b = blood[i];
      b.vy += 2100 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.y >= gy + rand(4, -1)) {
        // floor splat
        if (Math.abs(b.vx) + Math.abs(b.vy) > 130) this.splat(b.x, gy + rand(1, -1), clamp(b.size * 1.9, 1.6, 9), Math.atan2(b.vy, b.vx), 0.85);
        blood.splice(i, 1);
        continue;
      }
      if (b.y > this.worldH || b.life <= 0 || b.x < -20 || b.x > this.worldW + 20) blood.splice(i, 1);
    }

    for (let i = this.gibs.length - 1; i >= 0; i--) {
      const g = this.gibs[i];
      g.life -= dt;
      if (!g.rest) {
        g.vy += 2000 * dt;
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.rot += g.vr * dt;
        if (g.y > gy - g.size * 0.3) {
          g.y = gy - g.size * 0.3;
          if (g.vy > 220 && g.bounces < 2) {
            g.vy *= -0.32; g.vx *= 0.6; g.vr *= 0.5; g.bounces++;
            this.splat(g.x, gy, g.size * 1.3, rand(TAU), 0.7);
            this.bloodDrip(g.x, g.y, 2, 1.2, 80);
          } else {
            g.vy = 0; g.vx *= 0.75; g.vr *= 0.7;
            if (Math.abs(g.vx) < 20) { g.rest = true; g.vx = 0; g.vr = 0; }
          }
        }
      }
      if (g.life <= 0) this.gibs.splice(i, 1);
    }

    for (let i = this.casings.length - 1; i >= 0; i--) {
      const c = this.casings[i];
      c.life -= dt;
      if (!c.rest) {
        c.vy += 1900 * dt;
        c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt;
        if (c.y > gy - 1) {
          c.y = gy - 1;
          if (Math.abs(c.vy) > 90) { c.vy *= -0.35; c.vx *= 0.6; c.vr *= 0.6; }
          else { c.vy = 0; c.vx *= 0.8; c.vr *= 0.5; if (Math.abs(c.vx) < 8) c.rest = true; }
        }
      }
      if (c.life <= 0) this.casings.splice(i, 1);
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt; s.vy += 1600 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.life <= 0 || s.y > gy) this.sparks.splice(i, 1);
    }
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const s = this.smoke[i];
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
      s.vx *= 0.97; s.vy *= 0.97; s.r += s.grow * dt;
      if (s.life <= 0) this.smoke.splice(i, 1);
    }
    for (let i = this.mist.length - 1; i >= 0; i--) {
      const m = this.mist[i];
      m.life -= dt; m.x += m.vx * dt; m.y += m.vy * dt; m.r += 30 * dt;
      if (m.life <= 0) this.mist.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt * 1.6; r.r += (r.max - r.r) * dt * 5;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
  }

  drawDecals(ctx) {
    ctx.drawImage(this.decals, 0, 0, this.worldW, this.worldH);
  }

  drawBehind(ctx) {
    // pools glisten under characters
    for (const p of this.pools) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      const g = ctx.createRadialGradient(p.x, p.y - 2, 1, p.x, p.y - 2, p.r);
      g.addColorStop(0, 'rgba(255,120,120,.5)');
      g.addColorStop(1, 'rgba(255,120,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 1.25, p.r * 0.4, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  draw(ctx) {
    // mist
    for (const m of this.mist) {
      const a = Math.max(0, m.life / m.max) * 0.25;
      ctx.fillStyle = m.color + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.fill();
    }
    // blood droplets (streak + drop)
    for (const b of this.blood) {
      const a = Math.min(1, b.life * 2.2);
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = a * 0.85;
      ctx.lineWidth = Math.max(1, b.size * 0.9);
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.014, b.y - b.vy * 0.014);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.globalAlpha = a;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.size * 0.62, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const g of this.gibs) {
      ctx.save();
      ctx.translate(g.x, g.y); ctx.rotate(g.rot);
      const a = Math.min(1, g.life * 1.5);
      ctx.globalAlpha = a;
      ctx.fillStyle = g.color;
      if (g.bone) {
        ctx.fillRect(-g.size * 0.9, -g.size * 0.22, g.size * 1.8, g.size * 0.44);
        ctx.fillStyle = 'rgba(120,20,20,.65)';
        ctx.fillRect(-g.size * 0.9, -g.size * 0.22, g.size * 1.8, g.size * 0.16);
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, g.size, g.size * 0.72, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(150,24,30,.55)';
        ctx.beginPath(); ctx.arc(g.size * 0.3, -g.size * 0.2, g.size * 0.35, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(40,4,6,.4)';
        ctx.beginPath(); ctx.arc(-g.size * 0.25, g.size * 0.18, g.size * 0.3, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    for (const c of this.casings) {
      ctx.save();
      ctx.translate(c.x, c.y); ctx.rotate(c.rot);
      ctx.fillStyle = '#c49b4e';
      ctx.fillRect(-3.5, -1.2, 7, 2.4);
      ctx.fillStyle = '#7d5c25';
      ctx.fillRect(-3.5, -1.2, 2, 2.4);
      ctx.restore();
    }

    for (const s of this.sparks) {
      const a = Math.max(0, s.life / s.max);
      ctx.strokeStyle = s.color; ctx.globalAlpha = a;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.02, s.y - s.vy * 0.02); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const s of this.smoke) {
      const a = Math.max(0, s.life / s.max);
      ctx.fillStyle = s.color + (a * 0.32).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    }

    for (const r of this.rings) {
      ctx.strokeStyle = `rgba(255,190,120,${(r.life * 0.4).toFixed(3)})`;
      ctx.lineWidth = 2 + r.life * 4;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = `rgba(180,30,30,${(r.life * 0.3).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 0.72, 0, TAU); ctx.stroke();
    }
  }
}
