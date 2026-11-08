import { rand, TAU, clamp, noise1, pick } from './util.js';

export const WORLD_W = 4200;
export const GROUND_Y = 700;
export const WALL_TOP = -420;

export class World {
  constructor() {
    this.w = WORLD_W;
    this.ground = GROUND_Y;
    this.lamps = [
      { x: 220, y: -110, hue: 30, flicker: 0.2 },
      { x: 900, y: -125, hue: 26, flicker: 0.9 },
      { x: 1580, y: -105, hue: 32, flicker: 0.1 },
      { x: 2270, y: -130, hue: 22, flicker: 1.4 },
      { x: 2960, y: -110, hue: 30, flicker: 0.4 },
      { x: 3680, y: -120, hue: 27, flicker: 1.0 },
    ];
    this.dust = Array.from({ length: 110 }, () => ({
      x: rand(this.w), y: rand(820, -300), z: rand(1, 0.3),
      sp: rand(9, 2), ph: rand(TAU),
    }));
    this.embers = Array.from({ length: 26 }, () => ({
      x: rand(this.w), y: rand(820, -200), sp: rand(26, 6), ph: rand(TAU), r: rand(2.2, 0.7),
    }));
    this.buildStatic();
  }

  buildStatic() {
    const s = 0.72;
    const top = WALL_TOP - 60;
    const height = 920 - top;
    this.bgScale = s;
    this.bgTop = top;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(this.w * s);
    cv.height = Math.ceil(height * s);
    const c = cv.getContext('2d');
    c.scale(s, s);
    c.translate(0, -top);
    this.drawBackWall(c, top, 920);
    this.static = cv;
  }

  drawBackWall(c, top, bottom) {
    const g = c.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, '#08090a');
    g.addColorStop(0.18, '#111213');
    g.addColorStop(0.62, '#181817');
    g.addColorStop(0.88, '#201d1a');
    g.addColorStop(1, '#151412');
    c.fillStyle = g;
    c.fillRect(0, top, this.w, bottom - top);

    // distant arches / alcoves
    for (let i = 0; i < 7; i++) {
      const x = 140 + i * 610 + (i % 2) * 80;
      c.fillStyle = '#0b0c0d';
      c.beginPath();
      c.moveTo(x, 700);
      c.lineTo(x, 360);
      c.quadraticCurveTo(x + 90, 270, x + 180, 360);
      c.lineTo(x + 180, 700);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(90,86,78,.13)'; c.lineWidth = 5; c.stroke();
      // dim red emergency lamp inside
      const eg = c.createRadialGradient(x + 90, 380, 1, x + 90, 380, 110);
      eg.addColorStop(0, 'rgba(150,26,20,.17)');
      eg.addColorStop(1, 'rgba(150,26,20,0)');
      c.fillStyle = eg;
      c.fillRect(x, 280, 180, 300);
    }

    // concrete panels
    for (let x = 0; x < this.w; x += 236) {
      const shade = 0.9 + noise1(x * 0.11) * 0.24;
      c.fillStyle = `rgba(${34 * shade | 0},${33 * shade | 0},${31 * shade | 0},.45)`;
      c.fillRect(x, -120, 234, 820);
      c.strokeStyle = 'rgba(0,0,0,.34)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x, -120); c.lineTo(x, 700); c.stroke();
      c.strokeStyle = 'rgba(120,114,102,.05)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x + 2, -120); c.lineTo(x + 2, 700); c.stroke();
      // panel seams horizontal
      for (let y = 40; y < 700; y += 190) {
        c.strokeStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 234, y); c.stroke();
      }
      // stains running down
      const n = 1 + (noise1(x * 0.9) * 3 | 0);
      for (let i = 0; i < n; i++) {
        const sx = x + 20 + noise1(x + i * 17) * 190;
        const sy = 130 + noise1(x + i * 5) * 420;
        const len = 60 + noise1(x + i) * 260;
        const grad = c.createLinearGradient(0, sy, 0, sy + len);
        grad.addColorStop(0, 'rgba(6,5,4,.30)');
        grad.addColorStop(1, 'rgba(6,5,4,0)');
        c.fillStyle = grad;
        c.fillRect(sx, sy, 5 + noise1(sx) * 13, len);
      }
    }

    // big structural girders
    for (let x = 420; x < this.w; x += 706) {
      c.fillStyle = '#0c0d0e';
      c.fillRect(x, top, 46, bottom - top);
      c.fillStyle = '#1d1f20';
      c.fillRect(x + 5, top, 8, bottom - top);
      c.fillStyle = 'rgba(160,150,132,.07)';
      c.fillRect(x + 42, top, 3, bottom - top);
      for (let y = -80; y < 700; y += 96) {
        c.fillStyle = '#2a2c2c';
        c.beginPath(); c.arc(x + 16, y, 3.4, 0, TAU); c.fill();
        c.beginPath(); c.arc(x + 30, y, 3.4, 0, TAU); c.fill();
      }
      // diagonal brace
      c.strokeStyle = 'rgba(20,21,22,.9)'; c.lineWidth = 12;
      c.beginPath(); c.moveTo(x + 46, 70); c.lineTo(x + 170, -50); c.stroke();
      c.strokeStyle = 'rgba(110,104,92,.08)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x + 46, 70); c.lineTo(x + 170, -50); c.stroke();
    }

    // ceiling truss
    c.fillStyle = '#0a0b0c';
    c.fillRect(0, top, this.w, 84);
    c.strokeStyle = 'rgba(100,94,84,.09)'; c.lineWidth = 3;
    for (let x = 0; x < this.w; x += 236) {
      c.beginPath(); c.moveTo(x, top + 20); c.lineTo(x + 118, top + 66); c.lineTo(x + 236, top + 20); c.stroke();
    }
    c.strokeStyle = 'rgba(90,84,74,.06)'; c.lineWidth = 2;
    for (let x = 120; x < this.w; x += 520) {
      c.beginPath(); c.moveTo(x, top + 84); c.lineTo(x, 140); c.stroke();
    }

    // pipes along wall
    this.pipe(c, 0, 42, 930, 14, '#2a2724', '#0e0d0c');
    this.pipe(c, 0, 90, 2360, 9, '#332a24', '#0f0d0c');
    this.pipe(c, 0, 590, 150, 10, '#232527', '#0b0c0d');
    // pipe joints
    for (let x = 90; x < 2400; x += 340) {
      c.fillStyle = '#3b3833'; c.fillRect(x, 78, 14, 22);
      c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(x + 2, 80, 3, 18);
    }
    // valves
    for (let x = 260; x < 2300; x += 690) {
      c.strokeStyle = '#4a4038'; c.lineWidth = 4;
      c.beginPath(); c.arc(x, 94, 15, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(x - 20, 94); c.lineTo(x + 20, 94); c.stroke();
      c.beginPath(); c.moveTo(x, 74); c.lineTo(x, 114); c.stroke();
    }

    // vents
    for (let i = 0; i < 4; i++) {
      const x = 300 + i * 980, y = 190 + (i % 2) * 40;
      c.fillStyle = '#191a1a'; c.fillRect(x, y, 90, 60);
      c.strokeStyle = '#0a0b0b'; c.lineWidth = 2; c.strokeRect(x, y, 90, 60);
      c.strokeStyle = 'rgba(120,114,102,.16)'; c.lineWidth = 2;
      for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(x + 8, y + 8 + k * 8); c.lineTo(x + 82, y + 8 + k * 8); c.stroke(); }
    }

    // warning stripes at wall base
    this.stripes(c, 0, 660, this.w, 38);
    c.fillStyle = 'rgba(8,8,8,.7)';
    c.fillRect(0, 698, this.w, 6);

    // graffiti
    this.graffiti(c, 860, 520, 'NO CLEAN-UP', 'rgba(170,160,140,.16)', 34);
    this.graffiti(c, 1760, 470, 'MEAT', 'rgba(150,22,26,.33)', 74);
    this.graffiti(c, 2860, 545, 'RUN', 'rgba(170,160,140,.14)', 42);
    this.graffiti(c, 3520, 500, 'GOD IS DEAD', 'rgba(150,22,26,.2)', 27);
    // tally marks
    c.strokeStyle = 'rgba(185,175,155,.17)'; c.lineWidth = 3;
    for (let i = 0; i < 17; i++) {
      const x = 1220 + i * 11, y = 470;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 2, y + 26); c.stroke();
    }

    // hanging chains and hooks
    for (let i = 0; i < 9; i++) {
      const x = 380 + i * 430 + noise1(i) * 60;
      this.chain(c, x, top + 70, 230 + noise1(i * 2) * 220);
    }

    // floor
    const fg = c.createLinearGradient(0, 690, 0, 920);
    fg.addColorStop(0, '#28251f');
    fg.addColorStop(0.18, '#1b1916');
    fg.addColorStop(1, '#0b0a09');
    c.fillStyle = fg;
    c.fillRect(0, 690, this.w, 230);
    // floor slabs
    c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 2;
    for (let x = 0; x < this.w; x += 300) {
      c.beginPath(); c.moveTo(x, 700); c.lineTo(x + 26, 920); c.stroke();
    }
    for (let y = 720; y < 920; y += 48) {
      c.strokeStyle = 'rgba(0,0,0,.18)';
      c.beginPath(); c.moveTo(0, y); c.lineTo(this.w, y); c.stroke();
    }
    // drains
    for (let i = 0; i < 5; i++) {
      const x = 300 + i * 900;
      c.fillStyle = '#0c0c0b';
      c.beginPath(); c.ellipse(x, 806, 44, 12, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(120,114,102,.16)'; c.lineWidth = 2;
      for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(x + k * 10, 797); c.lineTo(x + k * 12, 815); c.stroke(); }
    }
    // puddles
    for (let i = 0; i < 14; i++) {
      const x = rand(this.w), y = rand(790, 720);
      const w = rand(150, 40);
      const pg = c.createRadialGradient(x, y, 1, x, y, w);
      pg.addColorStop(0, 'rgba(90,80,64,.18)');
      pg.addColorStop(0.6, 'rgba(50,48,40,.12)');
      pg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = pg;
      c.beginPath(); c.ellipse(x, y, w, w * 0.2, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(190,175,145,.05)'; c.lineWidth = 1;
      c.beginPath(); c.ellipse(x, y - 1, w * 0.8, w * 0.14, 0, 0, TAU); c.stroke();
    }

    // old blood stains baked into the room
    for (let i = 0; i < 22; i++) {
      const x = rand(this.w), y = rand(710, 694);
      c.fillStyle = `rgba(${60 + rand(30) | 0},6,10,${rand(0.35, 0.12)})`;
      c.beginPath();
      c.ellipse(x, y, rand(52, 8), rand(14, 3), rand(0.4, -0.4), 0, TAU);
      c.fill();
    }

    // debris
    for (let i = 0; i < 120; i++) {
      const x = rand(this.w), y = rand(905, 700);
      c.fillStyle = `rgba(${60 + rand(50) | 0},${55 + rand(40) | 0},${45 + rand(30) | 0},${rand(0.35, 0.1)})`;
      c.fillRect(x, y, rand(6, 1), rand(2, 1));
    }

    // vignette-ish wall grime
    const vg = c.createLinearGradient(0, 200, 0, 690);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.3)');
    c.fillStyle = vg;
    c.fillRect(0, 200, this.w, 500);
  }

  pipe(c, x, y, len, r, col, dark) {
    c.strokeStyle = dark; c.lineWidth = r * 2 + 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + len, y); c.stroke();
    c.strokeStyle = col; c.lineWidth = r * 2;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + len, y); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.06)'; c.lineWidth = r * 0.5;
    c.beginPath(); c.moveTo(x, y - r * 0.5); c.lineTo(x + len, y - r * 0.5); c.stroke();
  }

  chain(c, x, y, len) {
    c.strokeStyle = 'rgba(80,76,68,.42)'; c.lineWidth = 3;
    for (let yy = y; yy < y + len; yy += 12) {
      c.beginPath(); c.ellipse(x + Math.sin(yy * 0.5) * 1.5, yy, 3.2, 8, 0, 0, TAU); c.stroke();
    }
    // hook
    c.strokeStyle = 'rgba(100,96,88,.5)'; c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x, y + len);
    c.quadraticCurveTo(x + 2, y + len + 26, x + 18, y + len + 20);
    c.stroke();
  }

  stripes(c, x, y, w, h) {
    c.save();
    c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.fillStyle = '#181612'; c.fillRect(x, y, w, h);
    for (let i = -h; i < w; i += 60) {
      c.fillStyle = 'rgba(150,116,30,.5)';
      c.beginPath();
      c.moveTo(x + i, y + h); c.lineTo(x + i + 30, y);
      c.lineTo(x + i + 62, y); c.lineTo(x + i + 32, y + h);
      c.closePath(); c.fill();
    }
    c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(x, y, w, 4);
    c.restore();
  }

  graffiti(c, x, y, text, color, size) {
    c.save();
    c.globalAlpha = 0.9;
    c.fillStyle = color;
    c.font = `900 ${size}px "Arial Narrow", Impact, sans-serif`;
    c.letterSpacing = '2px';
    c.translate(x, y);
    c.rotate(-0.03);
    c.fillText(text, 0, 0);
    // drips
    c.fillStyle = color;
    for (let i = 0; i < 4; i++) {
      c.fillRect(10 + i * size * 0.6, 4, 2, size * rand(0.6, 0.15));
    }
    c.restore();
  }

  drawLamps(ctx, time, camX) {
    for (const l of this.lamps) {
      const fl = 1 - Math.abs(Math.sin(time * (3.1 + l.flicker) + l.x)) * 0.06 * l.flicker;
      const x = l.x, y = l.y;
      // cable
      ctx.strokeStyle = 'rgba(20,20,20,.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y - 260); ctx.lineTo(x + 4, y - 22); ctx.stroke();
      // shade
      ctx.fillStyle = '#1c1d1c';
      ctx.beginPath();
      ctx.moveTo(x - 26, y); ctx.lineTo(x + 26, y); ctx.lineTo(x + 15, y - 22); ctx.lineTo(x - 15, y - 22);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(160,140,100,.15)'; ctx.lineWidth = 1.5; ctx.stroke();
      // bulb glow
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const bg = ctx.createRadialGradient(x, y + 6, 1, x, y + 6, 34);
      bg.addColorStop(0, `rgba(255,225,160,${0.55 * fl})`);
      bg.addColorStop(0.4, `rgba(255,170,70,${0.18 * fl})`);
      bg.addColorStop(1, 'rgba(255,140,30,0)');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(x, y + 6, 34, 0, TAU); ctx.fill();
      // cone of light
      const cg = ctx.createLinearGradient(0, y, 0, this.ground + 100);
      cg.addColorStop(0, `rgba(255,190,100,${0.13 * fl})`);
      cg.addColorStop(0.5, `rgba(255,170,80,${0.055 * fl})`);
      cg.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(x - 16, y);
      ctx.lineTo(x + 16, y);
      ctx.lineTo(x + 190, this.ground + 120);
      ctx.lineTo(x - 190, this.ground + 120);
      ctx.closePath(); ctx.fill();
      // local floor pool of light
      const fg = ctx.createRadialGradient(x, this.ground + 10, 4, x, this.ground + 10, 230);
      fg.addColorStop(0, `rgba(255,180,90,${0.15 * fl})`);
      fg.addColorStop(1, 'rgba(255,150,50,0)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.ellipse(x, this.ground + 10, 230, 46, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  draw(ctx, time, camX) {
    // static backdrop
    ctx.drawImage(this.static, 0, this.bgTop, this.w, this.static.height / this.bgScale);
    // emergency lamps flicker
    const t = time;
    this.lamps.forEach((l, i) => {
      if (Math.sin(t * (0.7 + l.flicker) + i * 4) > 0.985) {
        ctx.fillStyle = 'rgba(10,8,7,.35)';
        ctx.fillRect(l.x - 260, -120, 520, 820);
      }
    });
    this.drawLamps(ctx, t, camX);
    this.drawDust(ctx, t, camX);
    this.drawBackgroundProps(ctx, t);
  }

  drawDust(ctx, time, camX) {
    ctx.save();
    for (const d of this.dust) {
      const x = ((d.x + Math.sin(time * 0.3 + d.ph) * 36 + time * d.sp) % this.w + this.w) % this.w;
      const y = d.y + Math.sin(time * 0.6 + d.ph) * 14;
      if (Math.abs(x - camX) > 1200) continue;
      const a = 0.06 + (d.z * 0.12);
      ctx.fillStyle = `rgba(230,210,180,${a})`;
      ctx.beginPath(); ctx.arc(x, y, d.z * 1.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawBackgroundProps(ctx, time) {
    // crates and barrels in the back, behind the action
    const props = [
      [180, 1], [520, 0], [1080, 1], [1250, 0], [1900, 1], [2150, 0], [2650, 1], [3200, 0], [3450, 1], [3920, 0],
    ];
    for (const [x, type] of props) {
      if (type === 1) {
        // crate stack
        this.crate(ctx, x, 630, 84, 70);
        if (x % 2) this.crate(ctx, x + 14, 570, 64, 58);
      } else {
        // barrel
        this.barrel(ctx, x, 640, 34, 62, '#3a3630');
      }
    }
    // hanging meat hooks with old carcasses
    for (let i = 0; i < 3; i++) {
      const x = 1500 + i * 1150;
      ctx.strokeStyle = 'rgba(30,26,24,.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, 160); ctx.lineTo(x, 300); ctx.stroke();
      ctx.fillStyle = '#3a211c';
      ctx.beginPath();
      ctx.ellipse(x, 350, 22, 56, 0.05, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(90,20,18,.4)';
      ctx.beginPath(); ctx.ellipse(x + 6, 370, 8, 30, 0.1, 0, TAU); ctx.fill();
      ctx.fillStyle = '#161312';
      ctx.beginPath(); ctx.arc(x, 292, 12, 0, TAU); ctx.fill();
    }
  }

  crate(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = '#2a231b';
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3;
    ctx.strokeRect(x - w / 2, y - h, w, h);
    ctx.strokeStyle = 'rgba(140,115,80,.12)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - w / 2 + 6, y - h + 6); ctx.lineTo(x + w / 2 - 6, y - 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w / 2 - 6, y - h + 6); ctx.lineTo(x - w / 2 + 6, y - 6); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - w / 2, y - h + i * h / 4); ctx.lineTo(x + w / 2, y - h + i * h / 4); ctx.stroke(); }
    ctx.restore();
  }

  barrel(ctx, x, y, w, h, color) {
    ctx.save();
    const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
    g.addColorStop(0, '#19170f');
    g.addColorStop(0.35, color);
    g.addColorStop(0.62, '#4e4838');
    g.addColorStop(1, '#171510');
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2; ctx.strokeRect(x - w / 2, y - h, w, h);
    ctx.strokeStyle = 'rgba(180,170,150,.1)'; ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - w / 2, y - h + i * h / 3); ctx.lineTo(x + w / 2, y - h + i * h / 3); ctx.stroke(); }
    ctx.restore();
  }

  drawForeground(ctx, time) {
    // floating embers / sparks
    for (const e of this.embers) {
      const x = (e.x + Math.sin(time * 0.5 + e.ph) * 26) % this.w;
      const y = e.y - ((time * e.sp) % 900);
      const yy = y < -300 ? y + 1200 : y;
      ctx.fillStyle = `rgba(255,150,60,${0.08 + Math.abs(Math.sin(time + e.ph)) * 0.18})`;
      ctx.beginPath(); ctx.arc(x, yy, e.r, 0, TAU); ctx.fill();
    }
  }
}
