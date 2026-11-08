export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
export const smoothstep = (a, b, v) => { const t = invLerp(a, b, v); return t * t * (3 - 2 * t); };
export const rand = (a = 1, b = 0) => b + Math.random() * (a - b);
export const randInt = (a, b) => Math.floor(rand(b + 1, a));
export const chance = p => Math.random() < p;
export const pick = arr => arr[(Math.random() * arr.length) | 0];
export const dist2 = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; };
export const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
export const angleLerp = (a, b, t) => {
  let d = ((b - a + Math.PI * 3) % TAU) - Math.PI;
  return a + d * t;
};
export const norm = (x, y) => { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; };

export function pointSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = clamp(t, 0, 1);
  const x = ax + dx * t, y = ay + dy * t;
  return { dist: Math.hypot(px - x, py - y), t, x, y };
}

// Ray (origin + dir * maxDist) vs capsule segment. Returns nearest t or null.
export function raySeg(ox, oy, dx, dy, ax, ay, bx, by, radius = 0) {
  // Solve for step along ray at which distance to segment <= radius.
  const sx = bx - ax, sy = by - ay;
  const denom = dx * sy - dy * sx;
  let best = null;
  if (Math.abs(denom) > 1e-6) {
    const t = ((ax - ox) * sy - (ay - oy) * sx) / denom;
    const u = ((ax - ox) * dy - (ay - oy) * dx) / denom;
    if (t >= 0 && u >= 0 && u <= 1) best = t;
  }
  if (radius > 0) {
    // Ray vs circles at endpoints (approximation of capsule caps).
    for (const [cx, cy] of [[ax, ay], [bx, by]]) {
      const ex = cx - ox, ey = cy - oy;
      const b = ex * dx + ey * dy;
      const c = ex * ex + ey * ey - radius * radius;
      const disc = b * b - c;
      if (disc >= 0) {
        const t = b - Math.sqrt(disc);
        if (t >= 0 && (best === null || t < best)) best = t;
      }
    }
  }
  return best;
}

export function makeNoiseBuffer(ctx, seconds = 2) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.04 * white) / 1.04;
    data[i] = last * 3.2 + white * 0.28;
  }
  return buffer;
}

// Deterministic-ish detail noise for drawing
export function noise1(x) {
  const s = Math.sin(x * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function formatKills(n) { return n.toLocaleString('en-US'); }

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
