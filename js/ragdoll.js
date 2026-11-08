import { clamp, rand, TAU } from './util.js';

export const LINKS = [
  ['spine', 'hip', 'neck', 16, 1],
  ['neck', 'neck', 'head', 14, 1],
  ['clavL', 'neck', 'shoulderL', 9, 0.9],
  ['clavR', 'neck', 'shoulderR', 9, 0.9],
  ['sideL', 'hip', 'shoulderL', 13, 0.75],
  ['sideR', 'hip', 'shoulderR', 13, 0.75],
  ['upperArmL', 'shoulderL', 'elbowL', 8, 1],
  ['foreArmL', 'elbowL', 'handL', 6.5, 1],
  ['upperArmR', 'shoulderR', 'elbowR', 8, 1],
  ['foreArmR', 'elbowR', 'handR', 6.5, 1],
  ['thighL', 'hip', 'kneeL', 10, 1],
  ['shinL', 'kneeL', 'footL', 7.5, 1],
  ['thighR', 'hip', 'kneeR', 10, 1],
  ['shinR', 'kneeR', 'footR', 7.5, 1],
];

// Which physical link disappears when a hit severs a body part.
export const SEVER_LINKS = {
  head: ['neck'],
  armL: ['upperArmL'],
  armR: ['upperArmR'],
  handL: ['foreArmL'],
  handR: ['foreArmR'],
  legL: ['thighL'],
  legR: ['thighR'],
  shinL: ['shinL'],
  shinR: ['shinR'],
};

export const RADII = {
  hip: 10, neck: 9, head: 15, shoulderL: 8, shoulderR: 8,
  elbowL: 6, elbowR: 6, handL: 5.5, handR: 5.5,
  kneeL: 7, kneeR: 7, footL: 6, footR: 6,
};

export class Ragdoll {
  constructor(pose, opts = {}) {
    this.worldW = opts.worldW || 4000;
    this.groundY = opts.groundY ?? 700;
    this.points = {};
    for (const name of Object.keys(pose)) {
      const p = pose[name];
      this.points[name] = {
        x: p.x, y: p.y, px: p.x - rand(1.4, -1.4), py: p.y - rand(1.4, -1.4),
        r: RADII[name] || 7, ground: 0,
      };
    }
    this.links = LINKS.map(([name, a, b, r, stiff]) => ({
      name, a, b, r, stiff, cut: false,
      rest: Math.hypot(this.points[a].x - this.points[b].x, this.points[a].y - this.points[b].y),
      hidden: false,
    }));
    this.time = 0;
    this.drag = 0.996;
  }

  pose() {
    const out = {};
    for (const name of Object.keys(this.points)) {
      const p = this.points[name];
      out[name] = { x: p.x, y: p.y };
    }
    return out;
  }

  cutBone(key) {
    const names = SEVER_LINKS[key];
    if (!names) return false;
    let did = false;
    for (const l of this.links) {
      if (names.includes(l.name) && !l.cut) { l.cut = true; did = true; }
      if (key === 'armL' && (l.name === 'clavL' || l.name === 'sideL')) l.cut = true;
      if (key === 'armR' && (l.name === 'clavR' || l.name === 'sideR')) l.cut = true;
    }
    return did;
  }

  point(name) { return this.points[name]; }

  impulse(px, py, ix, iy, falloff = 1) {
    for (const p of Object.values(this.points)) {
      const d = Math.hypot(p.x - px, p.y - py);
      const f = clamp(1 - d / 150, 0, 1) * falloff;
      p.px -= ix * f; p.py -= iy * f;
    }
  }

  update(dt) {
    this.time += dt;
    const steps = dt > 0.022 ? 2 : 1;
    const sub = dt / steps;
    for (let s = 0; s < steps; s++) this.step(sub);
  }

  step(dt) {
    const g = 2100;
    const pts = this.points;
    const gy = this.groundY;
    for (const p of Object.values(pts)) {
      const vx = (p.x - p.px) * this.drag;
      const vy = (p.y - p.py) * this.drag;
      p.px = p.x; p.py = p.y;
      p.x += vx;
      p.y += vy + g * dt * dt;
      p.ground = Math.max(0, p.ground - dt * 4);
      // ground
      if (p.y > gy - p.r) {
        p.y = gy - p.r;
        const impact = Math.max(0, p.y - p.py);
        p.py = p.y + Math.min(8, impact * 0.4);
        p.x = p.px + (p.x - p.px) * 0.62;
        p.ground = 1;
      }
      if (p.x < p.r + 4) { p.x = p.r + 4; p.px = p.x + 3; }
      if (p.x > this.worldW - p.r - 4) { p.x = this.worldW - p.r - 4; p.px = p.x - 3; }
    }

    // constraints
    for (let it = 0; it < 7; it++) {
      for (const l of this.links) {
        if (l.cut) continue;
        const a = pts[l.a], b = pts[l.b];
        let dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const diff = (d - l.rest) / d;
        const k = 0.5 * l.stiff;
        const ox = dx * diff * k, oy = dy * diff * k;
        if (a.ground > 0.5 && b.ground < 0.5) {
          b.x -= ox * 1.6; b.y -= oy * 1.6;
        } else if (b.ground > 0.5 && a.ground < 0.5) {
          a.x += ox * 1.6; a.y += oy * 1.6;
        } else {
          a.x += ox; a.y += oy; b.x -= ox; b.y -= oy;
        }
      }
    }
    // keep bodies out of floor after solve
    for (const p of Object.values(pts)) {
      if (p.y > gy - p.r) p.y = gy - p.r;
    }
  }
}
