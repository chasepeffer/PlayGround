import { clamp, lerp, noise1, TAU, pick } from './util.js';

const BLOOD = '#7c0a11';

function shade(hex, amt) {
  if (!hex) return '#444';
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = clamp(Math.round(r + 255 * amt), 0, 255);
  g = clamp(Math.round(g + 255 * amt), 0, 255);
  b = clamp(Math.round(b + 255 * amt), 0, 255);
  return `rgb(${r},${g},${b})`;
}

function limb(ctx, a, b, w, fill, outline = 'rgba(8,6,6,.62)', hi = null) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = outline; ctx.lineWidth = w + 2.6;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  ctx.strokeStyle = fill; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  if (hi) {
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    const ox = -dy / l * w * 0.2, oy = dx / l * w * 0.2;
    ctx.strokeStyle = hi; ctx.lineWidth = w * 0.26; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(a.x + ox, a.y + oy); ctx.lineTo(b.x + ox, b.y + oy); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function shadow(ctx, x, y, w, alpha = 0.42) {
  const g = ctx.createRadialGradient(x, y, 2, x, y, w);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.24, 0, 0, TAU); ctx.fill();
}

function partSegments(actor) {
  const p = actor.pose;
  if (!p) return {};
  return {
    head: [p.head, p.head],
    torso: [p.hip, p.neck],
    armL: [p.shoulderL, p.elbowL],
    armR: [p.shoulderR, p.elbowR],
    handL: [p.elbowL, p.handL],
    handR: [p.elbowR, p.handR],
    legL: [p.hip, p.kneeL],
    legR: [p.hip, p.kneeR],
    shinL: [p.kneeL, p.footL],
    shinR: [p.kneeR, p.footR],
  };
}

function drawWounds(ctx, a) {
  const segs = partSegments(a);
  for (const w of a.wounds) {
    const seg = segs[w.part];
    if (!seg) continue;
    const [p1, p2] = seg;
    const x = lerp(p1.x, p2.x, w.u) + w.side * 3;
    const y = lerp(p1.y, p2.y, w.u) + w.off * 0.4;
    const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(42,3,5,.75)';
    ctx.beginPath(); ctx.ellipse(0, 0, w.size * 0.65, w.size * 0.95, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(160,22,28,.55)';
    ctx.beginPath(); ctx.ellipse(-w.size * 0.15, -w.size * 0.1, w.size * 0.4, w.size * 0.55, 0, 0, TAU); ctx.fill();
    ctx.restore();
    if (w.size > 4 && Math.sin(a.time * 2 + w.u * 20) > 0.2) {
      ctx.strokeStyle = 'rgba(110,8,14,.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x, y + w.size * 0.5); ctx.lineTo(x + 1, y + w.size * 2.1); ctx.stroke();
    }
  }
}

function drawBloodSpatter(ctx, a) {
  const blood = clamp(1 - a.hp / a.maxHp, 0, 1);
  if (blood < 0.08) return;
  const n = Math.floor(blood * 22);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const s = noise1(a.id * 7 + i * 3.1);
    const t = noise1(a.id * 3 + i * 1.7);
    const p = a.pose;
    const ax = lerp(p.hip.x, p.neck.x, s), ay = lerp(p.hip.y, p.neck.y, s);
    const x = ax + (t - 0.5) * 26, y = ay + (s - 0.3) * 30;
    ctx.fillStyle = `rgba(${96 + t * 50 | 0},${6 + t * 12 | 0},${10 + t * 6 | 0},${0.25 + blood * 0.5})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 1.5 + t * 3.2, 1 + s * 3.4, s * 3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawHead(ctx, a, hx, hy, angle, dead = false) {
  const skin = a.skin;
  const f = a.facing;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);
  // skull / jaw
  ctx.beginPath();
  ctx.ellipse(0, 0, 12.5, 15.5, 0, 0, TAU);
  ctx.fillStyle = dead ? '#b08a72' : skin;
  ctx.fill();
  ctx.strokeStyle = 'rgba(10,7,6,.55)'; ctx.lineWidth = 1.6; ctx.stroke();
  // ear
  ctx.fillStyle = shade(skin, -0.1);
  ctx.beginPath(); ctx.ellipse(-f * 10, 1, 3.2, 5, 0, 0, TAU); ctx.fill();
  // hair / helmet
  if (a.helmet) {
    ctx.beginPath();
    ctx.ellipse(0, -5, 15, 12, 0, Math.PI, TAU);
    ctx.fillStyle = '#363b37'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.09)';
    ctx.beginPath(); ctx.ellipse(-3, -9, 8, 3.5, -0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#20241f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-14, -3); ctx.quadraticCurveTo(0, 2, 14, -3); ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, -3, 13.5, Math.PI * 1.05, Math.PI * 2.0);
    ctx.fillStyle = a.hair; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.beginPath(); ctx.arc(-4, -7, 7, Math.PI, Math.PI * 1.7); ctx.fill();
  }
  if (a.mask) {
    ctx.beginPath();
    ctx.ellipse(f * 1.5, 7, 11, 8.5, 0, 0, TAU);
    ctx.fillStyle = '#22221f'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    ctx.beginPath(); ctx.ellipse(f * 1.5, 5, 8, 3, 0, 0, TAU); ctx.fill();
  }
  // face details
  ctx.fillStyle = dead ? 'rgba(30,10,10,.8)' : 'rgba(24,14,12,.9)';
  ctx.beginPath(); ctx.ellipse(f * 3.5, -1.5, 1.9, 1.2, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(f * 8.5, -1, 1.2, 1, 0, 0, TAU); ctx.fill();
  // nose
  ctx.strokeStyle = shade(skin, -0.18); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(f * 9, 1); ctx.lineTo(f * 12.5, 5); ctx.lineTo(f * 10, 6); ctx.stroke();
  // mouth / blood
  ctx.strokeStyle = dead ? 'rgba(70,4,8,.9)' : 'rgba(80,30,26,.55)';
  ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(f * 8, 10); ctx.lineTo(f * 12, 10); ctx.stroke();
  if (a.hp < a.maxHp * 0.5 && !dead) {
    ctx.strokeStyle = 'rgba(130,10,16,.6)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(f * 9, 6); ctx.lineTo(f * 10, 13); ctx.stroke();
  }
  ctx.restore();
}

function drawTorso(ctx, a, p) {
  const hip = p.hip, neck = p.neck;
  const dx = neck.x - hip.x, dy = neck.y - hip.y;
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l, ny = dx / l;
  const wh = 16, wn = 23;
  const shirt = a.shirt;
  ctx.beginPath();
  ctx.moveTo(hip.x + nx * wh, hip.y + ny * wh);
  ctx.quadraticCurveTo(
    (hip.x + neck.x) / 2 + nx * (wn + 5) - dx * 0.05,
    (hip.y + neck.y) / 2 + ny * (wn + 5) - dy * 0.05,
    neck.x + nx * wn, neck.y + ny * wn,
  );
  ctx.lineTo(neck.x - nx * wn, neck.y - ny * wn);
  ctx.quadraticCurveTo(
    (hip.x + neck.x) / 2 - nx * (wn + 4), (hip.y + neck.y) / 2 - ny * (wn + 4),
    hip.x - nx * wh, hip.y - ny * wh,
  );
  ctx.closePath();
  const g = ctx.createLinearGradient(hip.x + nx * 20, hip.y, hip.x - nx * 20, hip.y);
  g.addColorStop(0, shade(shirt, 0.11));
  g.addColorStop(0.45, shirt);
  g.addColorStop(1, shade(shirt, -0.18));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(8,6,6,.6)'; ctx.lineWidth = 2.2; ctx.stroke();

  // vest / straps
  if (a.type === 'enemy' && !a.mask) {
    ctx.fillStyle = 'rgba(20,20,18,.35)';
    ctx.beginPath();
    ctx.ellipse((hip.x + neck.x) / 2, (hip.y + neck.y) / 2, 13, 20, Math.atan2(dy, dx) + Math.PI / 2, 0, TAU);
    ctx.fill();
  }
  // belt
  ctx.strokeStyle = '#1c1917'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hip.x + nx * wh, hip.y + ny * wh); ctx.lineTo(hip.x - nx * wh, hip.y - ny * wh); ctx.stroke();
  ctx.strokeStyle = '#8c7550'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(hip.x + nx * 4, hip.y + ny * 4); ctx.lineTo(hip.x + nx * 4, hip.y + ny * 4 + 3); ctx.stroke();
  // folds
  ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = 1.1;
  for (let i = 0; i < 3; i++) {
    const t = 0.3 + i * 0.17;
    const x = lerp(hip.x, neck.x, t), y = lerp(hip.y, neck.y, t);
    ctx.beginPath(); ctx.moveTo(x - nx * 8, y - ny * 8); ctx.lineTo(x + nx * 7, y + ny * 7); ctx.stroke();
  }
  // player armband
  if (a.isPlayer) {
    ctx.fillStyle = 'rgba(160,20,26,.8)';
    ctx.beginPath(); ctx.ellipse(neck.x + nx * 20, neck.y + ny * 5, 4, 8, Math.atan2(dy, dx) + Math.PI / 2, 0, TAU); ctx.fill();
  }
}

export function weaponMuzzle(def, hand, angle) {
  const len = def.style === 'shotgun' ? 62 : def.style === 'rifle' ? 58 : def.style === 'smg' ? 42 : def.style === 'pistol' ? 30 : 0;
  return { x: hand.x + Math.cos(angle) * len, y: hand.y + Math.sin(angle) * len };
}

export function drawWeapon(ctx, def, hand, angle, opts = {}) {
  if (!def) return;
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(angle + (opts.tilt || 0));
  const recoil = opts.recoil || 0;
  ctx.translate(-recoil * 5, 0);
  const g = 1;
  const dark = '#17191a';
  const metal = '#5e6668';
  const metalHi = '#9aa4a6';
  if (def.style === 'pistol') {
    ctx.fillStyle = '#2a2c2c'; ctx.strokeStyle = '#0c0d0e'; ctx.lineWidth = 1;
    ctx.fillRect(2, -3, 27, 6); ctx.strokeRect(2, -3, 27, 6);
    ctx.fillStyle = metal; ctx.fillRect(20, -2.5, 9, 3);
    ctx.fillStyle = def.color; ctx.fillRect(4, -4, 15, 3);
    ctx.save(); ctx.translate(4, 3); ctx.rotate(0.32);
    ctx.fillStyle = '#392a20'; ctx.fillRect(-3, -1, 8, 13); ctx.strokeRect(-3, -1, 8, 13);
    ctx.fillStyle = '#191410'; ctx.fillRect(-2, 8, 6, 2);
    ctx.restore();
    ctx.fillStyle = '#141516'; ctx.fillRect(9, 5, 3, 6);
    ctx.fillStyle = '#d4cba9'; ctx.fillRect(24, -4, 2, 2);
  } else if (def.style === 'shotgun') {
    ctx.fillStyle = '#4a3a29'; ctx.fillRect(-15, -2, 22, 9);
    ctx.fillStyle = '#5f482f'; ctx.fillRect(-16, 1, 10, 7);
    ctx.fillStyle = '#2c2f30'; ctx.fillRect(5, -3.5, 56, 6);
    ctx.fillStyle = '#3d4142'; ctx.fillRect(14, 1, 28, 4);
    ctx.fillStyle = '#1d1f20'; ctx.fillRect(56, -4, 7, 5);
    ctx.fillStyle = '#8a7454'; ctx.fillRect(34, 1, 9, 5);
    ctx.fillStyle = '#191b1c'; ctx.fillRect(4, 2, 4, 9);
    if (opts.pump) {
      ctx.fillStyle = '#7d6444'; ctx.fillRect(14 - opts.pump * 8, 2, 14, 5);
    }
  } else if (def.style === 'smg' || def.style === 'rifle') {
    const len = def.style === 'rifle' ? 52 : 38;
    ctx.fillStyle = '#1a1d1e'; ctx.fillRect(-8, -4, 14, 10);
    ctx.fillStyle = def.color; ctx.fillRect(-2, -4, len, 7);
    ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(-2, -4, len, 2);
    ctx.fillStyle = '#101213'; ctx.fillRect(len * 0.45, 2, 9, 11);
    ctx.fillStyle = '#2c3031'; ctx.fillRect(len * 0.45, 2, 9, 3);
    if (def.style === 'rifle') {
      ctx.fillStyle = '#202324'; ctx.fillRect(8, -7, 14, 4);
      ctx.fillStyle = '#0f1112'; ctx.fillRect(12, -10, 5, 4);
      ctx.fillStyle = '#3a3f40'; ctx.fillRect(-8, 2, 10, 4);
    } else {
      ctx.fillStyle = '#2d3132'; ctx.fillRect(5, -7, 6, 3);
      ctx.fillStyle = '#101213'; ctx.fillRect(7, -9, 2, 2);
    }
    ctx.fillStyle = '#282b2c'; ctx.fillRect(len - 6, -2.5, 12, 4);
    ctx.fillStyle = '#0d0f10'; ctx.fillRect(len + 5, -3.5, 4, 4);
  } else if (def.style === 'katana') {
    ctx.save();
    ctx.rotate(opts.swing || 0);
    // handle
    ctx.fillStyle = '#1a1a1c';
    ctx.fillRect(-16, -2.5, 20, 5);
    ctx.fillStyle = 'rgba(180,40,40,.55)';
    for (let i = -14; i < 2; i += 4) ctx.fillRect(i, -2.5, 2, 5);
    ctx.fillStyle = '#8f8267'; ctx.fillRect(3, -5, 4, 10);
    // blade
    const grad = ctx.createLinearGradient(6, 0, 90, 0);
    grad.addColorStop(0, '#b9c4c6'); grad.addColorStop(0.5, '#f4f2ea'); grad.addColorStop(1, '#8d9a9e');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(7, -3);
    ctx.quadraticCurveTo(52, -5.5, 91, -1.5);
    ctx.lineTo(90, 2.4);
    ctx.quadraticCurveTo(50, 0.5, 7, 3);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(10, -1); ctx.quadraticCurveTo(55, -2.6, 88, 0); ctx.stroke();
    ctx.restore();
  } else if (def.style === 'sledge') {
    ctx.save();
    ctx.rotate(opts.swing || 0);
    ctx.fillStyle = '#6b4f33';
    ctx.fillRect(-14, -2.5, 62, 5);
    ctx.fillStyle = '#3e2c1d';
    ctx.fillRect(-14, -2.5, 10, 5);
    ctx.fillStyle = '#4e5355';
    ctx.fillRect(42, -12, 20, 24);
    ctx.fillStyle = '#6d7476';
    ctx.fillRect(42, -12, 20, 7);
    ctx.fillStyle = '#26292a'; ctx.fillRect(43, -9, 4, 18);
    ctx.restore();
  } else if (def.style === 'chainsaw') {
    ctx.fillStyle = '#a5401c'; ctx.fillRect(-14, -8, 30, 16);
    ctx.fillStyle = '#d5813c'; ctx.fillRect(-12, -6, 10, 4);
    ctx.fillStyle = '#2e3031'; ctx.fillRect(12, -5, 38, 10);
    ctx.fillStyle = '#777d7c'; ctx.fillRect(48, -7, 6, 14);
    ctx.strokeStyle = '#9ba1a0'; ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath(); ctx.moveTo(12 + i * 3.4, -5); ctx.lineTo(14 + i * 3.4, -7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12 + i * 3.4, 5); ctx.lineTo(14 + i * 3.4, 7); ctx.stroke();
    }
    ctx.fillStyle = '#1c1d1e'; ctx.fillRect(-8, 6, 6, 8);
  } else if (def.style === 'grenade') {
    ctx.fillStyle = '#4a5136';
    ctx.beginPath(); ctx.arc(8, 0, 7, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#252a1c'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(8, -7); ctx.lineTo(8, 7); ctx.stroke(); }
    ctx.fillStyle = '#8d8f7a'; ctx.fillRect(6, -10, 4, 4);
  }
  ctx.restore();
}

export function drawMuzzleFlash(ctx, x, y, angle, intensity = 1) {
  if (intensity <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 60 * intensity);
  g.addColorStop(0, `rgba(255,240,190,${0.9 * intensity})`);
  g.addColorStop(0.25, `rgba(255,190,80,${0.55 * intensity})`);
  g.addColorStop(1, 'rgba(255,120,20,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, 60 * intensity, 0, TAU); ctx.fill();
  ctx.fillStyle = `rgba(255,238,190,${0.9 * intensity})`;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(30 * intensity, -8 * intensity);
  ctx.lineTo(20 * intensity, 0);
  ctx.lineTo(32 * intensity, 7 * intensity);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function drawActor(ctx, a) {
  const p = a.pose;
  if (!p) return;
  const hipY = Math.max(p.hip.y, p.footL.y, p.footR.y);
  shadow(ctx, a.x, a.y, 44, 0.45);

  const backArmCol = shade(a.shirt, -0.26);
  const frontArmCol = a.shirt;
  const skinBack = shade(a.skin, -0.2);

  // back limbs
  limb(ctx, p.hip, p.kneeL, 13, shade(a.pants, -0.16));
  limb(ctx, p.kneeL, p.footL, 10, shade(a.pants, -0.22));
  drawBoot(ctx, p.footL, shade(a.pants, -0.5), -a.facing);
  limb(ctx, p.shoulderL, p.elbowL, 11, backArmCol);
  limb(ctx, p.elbowL, p.handL, 8.5, skinBack);

  // front leg
  limb(ctx, p.hip, p.kneeR, 14, shade(a.pants, 0.02));
  limb(ctx, p.kneeR, p.footR, 10.5, shade(a.pants, -0.08));
  drawBoot(ctx, p.footR, shade(a.pants, -0.4), a.facing);

  drawTorso(ctx, a, p);
  // neck
  limb(ctx, p.neck, p.head, 9, a.skin, 'rgba(8,6,6,.4)');

  // weapon + front arm
  const angle = a.weaponDef && (a.weaponDef.kind === 'gun' || a.weaponDef.kind === 'throw') ? p.aim : (p.swingAngle ?? p.aim);
  const swing = 0;
  if (a.weaponDef) drawWeapon(ctx, a.weaponDef, p.handR, angle, { recoil: a.recoilKick, swing, pump: a.pumpAnim || 0 });
  limb(ctx, p.shoulderR, p.elbowR, 12, frontArmCol);
  limb(ctx, p.elbowR, p.handR, 9, a.skin);
  // hands
  ctx.fillStyle = a.skin;
  ctx.beginPath(); ctx.arc(p.handR.x, p.handR.y, 5.2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(p.handL.x, p.handL.y, 4.8, 0, TAU); ctx.fill();

  drawHead(ctx, a, p.head.x, p.head.y, Math.atan2(p.head.y - p.neck.y, p.head.x - p.neck.x) + Math.PI / 2);
  drawBloodSpatter(ctx, a);
  drawWounds(ctx, a);

  // muzzle flash
  if (a.muzzleFlash > 0 && a.weaponDef) {
    const def = a.weaponDef;
    const m = weaponMuzzle(def, p.handR, angle);
    drawMuzzleFlash(ctx, m.x, m.y, angle, clamp(a.muzzleFlash * 14, 0, 1));
  }

  if (a.hitFlash > 0.35) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (a.hitFlash - 0.35) * 0.18;
    ctx.fillStyle = '#ff3a30';
    ctx.beginPath(); ctx.arc(p.neck.x, p.neck.y + 24, 34, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

function drawBoot(ctx, foot, color, dir) {
  ctx.save();
  ctx.translate(foot.x, foot.y);
  ctx.rotate(0);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(dir * 2, 1, 10, 5.5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath(); ctx.ellipse(-dir * 3, 2, 6, 3, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

export function drawActorCorpse(ctx, a) {
  const p = a.pose;
  if (!p) return;
  const r = a.ragdoll;
  const cut = name => r ? r.links.find(l => l.name === name)?.cut : false;
  const hipY = Math.max(p.hip.y, p.footL.y, p.footR.y);
  shadow(ctx, p.hip.x, a.groundY, 54, 0.4);

  // pooled blood under corpse drawn by gore
  const pants = shade(a.pants, -0.06);
  const shirt = shade(a.shirt, -0.1);
  const skin = shade(a.skin, -0.12);

  if (!cut('thighL')) { limb(ctx, p.hip, p.kneeL, 13, shade(pants, -0.15)); if (!cut('shinL')) { limb(ctx, p.kneeL, p.footL, 10, shade(pants, -0.2)); drawBoot(ctx, p.footL, shade(pants, -0.5), -1); } else stump(ctx, p.kneeL, 6); }
  if (!cut('upperArmL')) { limb(ctx, p.shoulderL, p.elbowL, 11, shade(shirt, -0.3)); if (!cut('foreArmL')) limb(ctx, p.elbowL, p.handL, 8, shade(skin, -0.2)); else stump(ctx, p.elbowL, 5); }

  if (!cut('spine')) drawTorso(ctx, { ...a, shirt }, p);

  if (!cut('thighR')) { limb(ctx, p.hip, p.kneeR, 13.5, pants); if (!cut('shinR')) { limb(ctx, p.kneeR, p.footR, 10.5, shade(pants, -0.06)); drawBoot(ctx, p.footR, shade(pants, -0.44), 1); } else stump(ctx, p.kneeR, 6); }

  if (!cut('neck')) {
    limb(ctx, p.neck, p.head, 9, skin);
    drawHead(ctx, a, p.head.x, p.head.y, Math.atan2(p.head.y - p.neck.y, p.head.x - p.neck.x) + Math.PI / 2, true);
  } else {
    stump(ctx, p.neck, 7);
    drawHead(ctx, a, p.head.x, p.head.y, a.aim + Math.PI / 2 + a.deadTime * 0.4, true);
  }

  if (!cut('upperArmR')) {
    limb(ctx, p.shoulderR, p.elbowR, 12, shade(shirt, 0.03));
    if (!cut('foreArmR')) {
      limb(ctx, p.elbowR, p.handR, 9, skin);
      if (a.weaponDef) {
        const angle = Math.atan2(p.handR.y - p.elbowR.y, p.handR.x - p.elbowR.x);
        drawWeapon(ctx, a.weaponDef, p.handR, angle, { recoil: 0 });
      }
    } else stump(ctx, p.elbowR, 5);
  } else stump(ctx, p.shoulderR, 6);

  drawBloodSpatter(ctx, a);
  drawWounds(ctx, a);

  // cut stumps on detached piece roots
  for (const l of r ? r.links : []) {
    if (!l.cut) continue;
    const bp = p[l.b];
    if (bp) stump(ctx, bp, l.name.includes('Arm') || l.name.includes('thigh') ? 5 : 3);
  }
}

function stump(ctx, pt, size = 6) {
  if (!pt) return;
  ctx.save();
  const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, size * 1.8);
  g.addColorStop(0, 'rgba(120,12,18,.95)');
  g.addColorStop(0.55, 'rgba(84,6,11,.85)');
  g.addColorStop(1, 'rgba(60,3,8,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(pt.x, pt.y, size * 1.8, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(180,70,62,.9)';
  ctx.beginPath(); ctx.arc(pt.x, pt.y, size * 0.55, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(225,205,175,.7)';
  ctx.beginPath(); ctx.arc(pt.x - 1, pt.y - 1, size * 0.22, 0, TAU); ctx.fill();
  ctx.restore();
}
