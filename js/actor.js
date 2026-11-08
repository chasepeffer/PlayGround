import { clamp, rand, chance, pick, TAU, raySeg, dist, lerp } from './util.js';
import { Ragdoll, RADII } from './ragdoll.js';
import { drawActor, drawActorCorpse } from './actorDraw.js';

export const GROUND = 700;
const SKIN = ['#c99a7e', '#a9765c', '#8a5a45', '#d8ab8c', '#6f4636'];
const SHIRT = ['#3d4347', '#4a3f37', '#2e3a3a', '#52443c', '#38393f', '#5a4a3b', '#26343b'];
const SHIRT_ENEMY = ['#3a3d34', '#46352e', '#2c3134', '#44392f', '#353a31'];
const PANTS = ['#2b2c30', '#33302a', '#262a30', '#3a342c', '#212429'];

const PART_MULT = { head: 3.4, torso: 1, armL: 0.62, armR: 0.62, handL: 0.5, handR: 0.5, legL: 0.72, legR: 0.72, shinL: 0.62, shinR: 0.62 };
const PART_THRESH = { head: 62, armL: 64, armR: 64, handL: 48, handR: 48, legL: 92, legR: 92, shinL: 74, shinR: 74 };

export function buildPose(a) {
  const t = a.time;
  const f = a.facing;
  const aim = a.aim;
  const run = a.state === 'run';
  const moving = Math.abs(a.vx) > 15;
  const cyc = a.walkPhase;
  const breath = Math.sin(t * 2.1 + a.id) * 0.9;
  const bob = moving ? Math.abs(Math.sin(cyc)) * (run ? 3.4 : 1.8) : breath;
  const hipX = a.x + (moving ? Math.cos(cyc) * 1.6 : 0);
  const hipY = a.y - 88 - bob + a.crouch;
  const hip = { x: hipX, y: hipY };
  const lean = moving ? f * 4 : 0;
  const neck = { x: hipX + lean + Math.cos(aim) * 2, y: hipY - 47 + breath * 0.5 };
  const head = { x: neck.x + Math.cos(aim) * 3.5, y: neck.y - 28 + a.headDrop };

  const shoulderFront = { x: neck.x + 5 * f, y: neck.y + 7 };
  const shoulderBack = { x: neck.x - 5 * f, y: neck.y + 9 };
  const dir = { x: Math.cos(aim), y: Math.sin(aim) };
  const perp = { x: -dir.y, y: dir.x };

  let handFront, handBack, elbowFront, elbowBack, swingAngle = aim;
  const holding = a.weaponDef && (a.weaponDef.kind === 'gun' || a.weaponDef.kind === 'throw');
  let meleeP = a.meleeProgress;

  if (holding) {
    const kick = a.recoilKick || 0;
    const reach = 44 - kick * 8;
    handFront = {
      x: shoulderFront.x + dir.x * reach + perp.x * 3,
      y: shoulderFront.y + dir.y * reach + perp.y * 3,
    };
    handBack = {
      x: handFront.x - dir.x * 17 + perp.x * 5,
      y: handFront.y - dir.y * 17 + perp.y * 5,
    };
    elbowFront = {
      x: shoulderFront.x + dir.x * reach * 0.48 + perp.x * 9,
      y: shoulderFront.y + dir.y * reach * 0.48 + perp.y * 9,
    };
    elbowBack = {
      x: shoulderBack.x + dir.x * reach * 0.4 - perp.x * 4,
      y: shoulderBack.y + dir.y * reach * 0.4 - perp.y * 4,
    };
  } else {
    const isSaw = a.weaponDef && a.weaponDef.kind === 'saw';
    if (meleeP >= 0) {
      const eased = 1 - Math.pow(1 - meleeP, 2);
      swingAngle = aim + (isSaw ? 0 : (eased - 0.42) * 2.5) * f;
      const reach = 46 + (isSaw ? 4 : Math.sin(meleeP * Math.PI) * 10);
      const sd = { x: Math.cos(swingAngle), y: Math.sin(swingAngle) };
      handFront = { x: shoulderFront.x + sd.x * reach, y: shoulderFront.y + sd.y * reach };
      handBack = { x: handFront.x - sd.x * 15 + 6 * f, y: handFront.y - sd.y * 15 + 6 };
      elbowFront = { x: shoulderFront.x + sd.x * reach * 0.5, y: shoulderFront.y + sd.y * reach * 0.5 - 2 };
      elbowBack = { x: shoulderBack.x + sd.x * reach * 0.3, y: shoulderBack.y + sd.y * reach * 0.3 };
    } else {
      const hang = Math.sin(t * 1.6 + a.id) * 1.5;
      handFront = { x: shoulderFront.x + 4 * f + hang, y: shoulderFront.y + 42 };
      handBack = { x: shoulderBack.x - 2 * f, y: shoulderBack.y + 44 };
      elbowFront = { x: shoulderFront.x + 3 * f, y: shoulderFront.y + 22 };
      elbowBack = { x: shoulderBack.x - 3 * f, y: shoulderBack.y + 23 };
    }
  }

  // legs
  const stride = moving ? (run ? 24 : 15) : 3;
  const lift = moving ? (run ? 12 : 7) : 0;
  const swingA = Math.sin(cyc), swingB = Math.sin(cyc + Math.PI);
  const kneeL = {
    x: hipX - 9 + swingA * stride * 0.55,
    y: hipY + 44 - Math.max(0, swingB) * lift * 0.4,
  };
  const footL = {
    x: hipX - 9 + swingA * stride,
    y: a.y - Math.max(0, swingB) * lift - 2,
  };
  const kneeR = {
    x: hipX + 9 + swingB * stride * 0.55,
    y: hipY + 44 - Math.max(0, swingA) * lift * 0.4,
  };
  const footR = {
    x: hipX + 9 + swingB * stride,
    y: a.y - Math.max(0, swingA) * lift - 2,
  };
  if (!a.onGround) {
    kneeL.y -= 10; footL.y = a.y - 16 + swingA * 4;
    kneeR.y -= 6; footR.y = a.y - 10 + swingB * 4;
  }

  return {
    hip, neck, head,
    shoulderL: shoulderBack, shoulderR: shoulderFront,
    elbowL: elbowBack, elbowR: elbowFront,
    handL: handBack, handR: handFront,
    kneeL, kneeR, footL, footR,
    aim, swingAngle, dir, perp,
  };
}

export class Actor {
  constructor(opts = {}) {
    this.id = Math.random() * 1000;
    this.x = opts.x ?? 600;
    this.y = opts.y ?? GROUND;
    this.vx = 0; this.vy = 0;
    this.type = opts.type || 'dummy';
    this.isPlayer = this.type === 'player';
    this.facing = opts.facing || 1;
    this.aim = opts.aim ?? (this.facing > 0 ? 0 : Math.PI);
    this.alive = true;
    this.maxHp = opts.hp || (this.isPlayer ? 100 : this.type === 'enemy' ? 100 : 120);
    this.hp = this.maxHp;
    this.time = rand(10);
    this.walkPhase = rand(TAU);
    this.state = 'idle';
    this.onGround = true;
    this.crouch = 0;
    this.headDrop = 0;
    this.recoilKick = 0;
    this.meleeProgress = -1;
    this.hitFlash = 0;
    this.deadTime = 0;
    this.ragdoll = null;
    this.pose = null;
    this.totalDamage = 0;
    this.limbsLost = 0;
    this.partDamage = {};
    this.wounds = [];
    this.bleeders = [];
    this.skin = opts.skin || pick(SKIN);
    this.shirt = opts.shirt || (this.type === 'enemy' ? pick(SHIRT_ENEMY) : pick(SHIRT));
    this.pants = opts.pants || pick(PANTS);
    this.hair = pick(['#1f1a17', '#2c211a', '#3a2a1e', '#141110', '#4b3826']);
    this.helmet = opts.helmet ?? (this.type === 'enemy' && chance(0.35));
    this.mask = opts.mask ?? (this.type === 'enemy' && chance(0.4));
    this.weaponDef = opts.weapon || null;
    this.weaponLevel = opts.weaponLevel || 0;
    this.enemyType = opts.enemyType || 'grunt';
    this.bleed = 1;
    this.gore = opts.gore || null;
    this.audio = opts.audio || null;
    this.worldW = opts.worldW || 4000;
    this.groundY = opts.groundY ?? GROUND;
    this.onDeath = null;
    this.onKillFeed = null;
    this.stun = 0;
    this.attackCd = 0;
    this.aimTarget = opts.aim ?? this.aim;
    this.walkSpeed = 0;
    this.dropped = false;
    this.pose = buildPose(this);
  }

  get height() { return 178; }

  update(dt) {
    this.time += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 5);
    this.recoilKick = Math.max(0, this.recoilKick - dt * 9);
    this.stun = Math.max(0, this.stun - dt);
    this.attackCd = Math.max(0, this.attackCd - dt);

    if (this.alive) {
      const speed = Math.abs(this.vx);
      this.state = speed > 25 ? 'run' : 'idle';
      this.walkPhase += dt * (4.6 + speed * 0.022) * (this.vx < 0 ? -1 : 1) * (speed > 25 ? 1 : 0.25);
      if (this.walkPhase > TAU * 10) this.walkPhase -= TAU * 10;
      this.crouch = lerp(this.crouch, 0, dt * 8);
      this.headDrop = lerp(this.headDrop, 0, dt * 8);
      this.facing = Math.cos(this.aim) >= 0 ? 1 : -1;
      this.pose = buildPose(this);

      // alive bleeding from wounds
      if (this.hp < this.maxHp * 0.55 && chance(dt * 2.4) && this.gore) {
        const w = this.wounds.length ? pick(this.wounds) : null;
        const p = w ? this.partPos(w.part) : this.pose.hip;
        this.gore.bloodDrip(p.x, p.y, 1, 0.7, 50, { size: 1.6 });
      }
    } else {
      this.deadTime += dt;
      if (this.ragdoll) {
        this.ragdoll.update(dt);
        this.pose = this.ragdoll.pose();
        this.pose.aim = this.aim;
        this.pose.dir = { x: Math.cos(this.aim), y: Math.sin(this.aim) };
        this.pose.perp = { x: -Math.sin(this.aim), y: Math.cos(this.aim) };
        // arterial fountains from stumps
        for (const b of this.bleeders) {
          b.ttl -= dt;
          b.acc += dt;
          if (b.ttl > 0 && b.acc > b.rate && this.gore) {
            b.acc = 0;
            const p = this.pose[b.point];
            if (p) {
              const a = -Math.PI / 2 + rand(1.2, -1.2);
              this.gore.arterial(p.x, p.y, a, clamp(b.ttl / b.maxTtl, 0.2, 1) * b.power);
              if (chance(0.35)) this.gore.bloodDrip(p.x, p.y, 1, 1.4, 60, { size: 2 });
            }
          }
        }
        // slow pool growth under corpse
        if (this.deadTime < 12 && this.gore) {
          this.poolAcc = (this.poolAcc || 0) + dt;
          if (this.poolAcc > 0.55) {
            this.poolAcc = 0;
            const hip = this.pose.hip;
            const size = 16 + Math.min(30, this.deadTime * 2.4);
            if (chance(0.5)) this.gore.pool(hip.x, this.groundY - 3, size);
          }
        }
      }
    }

    // wounds fade
    for (let i = this.wounds.length - 1; i >= 0; i--) {
      this.wounds[i].life -= dt;
      if (this.wounds[i].life <= 0) this.wounds.splice(i, 1);
    }
  }

  partPos(part) {
    const p = this.pose;
    if (!p) return { x: this.x, y: this.y - 100 };
    switch (part) {
      case 'head': return p.head;
      case 'torso': return { x: (p.hip.x + p.neck.x) / 2, y: (p.hip.y + p.neck.y) / 2 };
      case 'armL': return p.elbowL;
      case 'armR': return p.elbowR;
      case 'handL': return p.handL;
      case 'handR': return p.handR;
      case 'legL': return p.kneeL;
      case 'legR': return p.kneeR;
      case 'shinL': return p.footL;
      case 'shinR': return p.footR;
      default: return p.hip;
    }
  }

  // Capsule segments used for hit detection
  hitSegments() {
    const p = this.pose || buildPose(this);
    const list = [
      { part: 'torso', ax: p.hip.x, ay: p.hip.y, bx: p.neck.x, by: p.neck.y, r: 16 },
      { part: 'torso', ax: p.hip.x, ay: p.hip.y, bx: p.shoulderL.x, by: p.shoulderL.y, r: 11 },
      { part: 'torso', ax: p.hip.x, ay: p.hip.y, bx: p.shoulderR.x, by: p.shoulderR.y, r: 11 },
      { part: 'head', ax: p.head.x, ay: p.head.y - 2, bx: p.head.x, by: p.head.y, r: 16 },
      { part: 'armL', ax: p.shoulderL.x, ay: p.shoulderL.y, bx: p.elbowL.x, by: p.elbowL.y, r: 6.5 },
      { part: 'armR', ax: p.shoulderR.x, ay: p.shoulderR.y, bx: p.elbowR.x, by: p.elbowR.y, r: 6.5 },
      { part: 'handL', ax: p.elbowL.x, ay: p.elbowL.y, bx: p.handL.x, by: p.handL.y, r: 5.5 },
      { part: 'handR', ax: p.elbowR.x, ay: p.elbowR.y, bx: p.handR.x, by: p.handR.y, r: 5.5 },
      { part: 'legL', ax: p.hip.x, ay: p.hip.y, bx: p.kneeL.x, by: p.kneeL.y, r: 9 },
      { part: 'legR', ax: p.hip.x, ay: p.hip.y, bx: p.kneeR.x, by: p.kneeR.y, r: 9 },
      { part: 'shinL', ax: p.kneeL.x, ay: p.kneeL.y, bx: p.footL.x, by: p.footL.y, r: 7.5 },
      { part: 'shinR', ax: p.kneeR.x, ay: p.kneeR.y, bx: p.footR.x, by: p.footR.y, r: 7.5 },
    ];
    if (!this.alive) {
      for (const l of list) {
        if (l.part === 'head' && this.ragdoll?.links.find(x => x.name === 'neck')?.cut) l.dead = true;
      }
    }
    return list;
  }

  rayHit(ox, oy, dx, dy, maxDist = 3000, allowDead = true) {
    if (!this.alive && !allowDead) return null;
    let best = null;
    for (const s of this.hitSegments()) {
      if (s.dead) continue;
      const t = raySeg(ox, oy, dx, dy, s.ax, s.ay, s.bx, s.by, s.r);
      if (t !== null && t <= maxDist && (!best || t < best.t)) {
        best = { t, x: ox + dx * t, y: oy + dy * t, part: s.part, actor: this };
      }
    }
    return best;
  }

  takeDamage(amount, part, x, y, dirAngle, force = 500, opts = {}) {
    if (!this.alive) {
      this.hitCorpse(x, y, dirAngle, force * 0.55, amount);
      return { dead: true, corpse: true };
    }
    const mult = PART_MULT[part] || 1;
    const dmg = amount * mult;
    this.hp -= dmg;
    this.totalDamage += dmg;
    this.hitFlash = 1;
    this.partDamage[part] = (this.partDamage[part] || 0) + dmg;
    this.stun = Math.max(this.stun, opts.stun || 0.12);
    this.recoilKick = Math.min(1, (this.recoilKick || 0) + 0.3);

    // spray blood out the far side
    if (this.gore) {
      const outAngle = dirAngle + (chance(0.5) ? 0 : Math.PI);
      this.gore.sprayCone(x, y, outAngle, 0.5, 4 + Math.min(14, dmg * 0.25 | 0), 180 + dmg * 4, 2.2);
      if (chance(0.5)) this.gore.bloodDrip(x, y, 2, 1.1, 120, { size: 2.2 });
      if (dmg > 8) this.gore.decalWound(x, this.groundY - 1, rand(3, 1.5) + dmg * 0.03);
    }
    this.wounds.push({
      part, u: rand(0.7, 0.3), side: rand(1, -1),
      off: rand(5, -5), size: 2 + clamp(dmg * 0.08, 0, 7), life: 25,
    });

    const isHead = part === 'head';
    const canSever = ['head', 'armL', 'armR', 'handL', 'handR', 'legL', 'legR', 'shinL', 'shinR'].includes(part);
    const severPower = opts.sever || 0;
    const acc = this.partDamage[part];
    const threshold = PART_THRESH[part] || 999;
    const shouldSever = canSever && this.hp > -this.maxHp * 1.4 && (
      (isHead && dmg > 70) ||
      (severPower > 0 && acc > threshold * (0.65 + rand(0.3))) ||
      (dmg > 55 && chance(0.18))
    );

    let severed = null;
    if (shouldSever) severed = part;

    this.bleed = clamp(1 - this.hp / this.maxHp, 0, 1);

    if (this.hp <= 0) {
      this.die({ x, y, dirAngle, force, severed, part, weapon: opts.weapon, melee: opts.melee, headExplode: isHead && (dmg > 85 || opts.explodeHead) });
      return { dead: true, severed, part };
    }
    if (severed) {
      this.die({ x, y, dirAngle, force: force * 0.7, severed, part, weapon: opts.weapon, melee: opts.melee, survivable: true });
      return { dead: true, severed, part };
    }
    if (this.audio) {
      if (isHead) this.audio.flesh(true);
      else if (chance(0.5)) this.audio.flesh(dmg > 30);
    }
    return { dead: false, severed, part };
  }

  die(info = {}) {
    if (!this.alive) return;
    this.alive = false;
    this.deadTime = 0;
    this.hp = Math.min(0, this.hp);
    this.state = 'dead';
    const pose = buildPose(this);
    this.ragdoll = new Ragdoll(pose, { worldW: this.worldW, groundY: this.groundY });
    if (info.severed) {
      const key = info.severed;
      this.ragdoll.cutBone(key);
      this.limbsLost++;
      const p = this.ragdoll.points[this.stumpPoint(key)];
      if (p) {
        this.bleeders.push({ point: this.stumpPoint(key), ttl: rand(9, 4), maxTtl: 9, acc: 0, rate: rand(0.035, 0.012), power: rand(1.4, 0.7) });
        if (this.gore) {
          this.gore.arterial(p.x, p.y, -Math.PI / 2 + rand(0.9, -0.9), 1.6);
          this.gore.bloodMist(p.x, p.y, 34);
        }
        if (this.audio) this.audio.squelch();
      }
    } else {
      this.bleeders.push({ point: 'neck', ttl: rand(4, 1.5), maxTtl: 4, acc: 0, rate: rand(0.1, 0.05), power: 0.5 });
    }
    if (info.headExplode) {
      const hp = this.ragdoll.points.head;
      this.ragdoll.cutBone('head');
      if (this.gore && hp) {
        this.gore.bloodBurst(hp.x, hp.y, 520, 40);
        this.gore.bloodMist(hp.x, hp.y, 60);
        for (let i = 0; i < 12; i++) {
          this.gore.gib(hp.x, hp.y, rand(520, -520), rand(-220, -620), rand(9, 3), pick(['#7a4030', '#8e5a44', '#a2654a']), { bone: i < 3 });
        }
        this.gore.boneShard(hp.x, hp.y, rand(300, -300), rand(-300, -600), 8);
      }
      if (this.audio) this.audio.headPop();
    } else if (this.audio) {
      this.audio.death();
    }
    // death impulse
    if (this.ragdoll && info.force) {
      const ix = Math.cos(info.dirAngle) * info.force * 0.014;
      const iy = Math.sin(info.dirAngle) * info.force * 0.014 - 3;
      this.ragdoll.impulse(info.x || this.x, info.y || this.y - 100, ix, iy, 1.4);
    }
    if (this.gore) {
      this.gore.pool(this.x, this.groundY - 3, rand(26, 16));
      this.gore.bloodBurst(this.x, this.y - 95, 260, 12);
    }
    if (this.audio) this.audio.grunt();
    if (this.onDeath) this.onDeath(this, info);
  }

  stumpPoint(key) {
    return { head: 'neck', armL: 'shoulderL', armR: 'shoulderR', handL: 'elbowL', handR: 'elbowR', legL: 'kneeL', legR: 'kneeR', shinL: 'kneeL', shinR: 'kneeR' }[key] || 'neck';
  }

  hitCorpse(x, y, dirAngle, force, amount = 0) {
    if (this.gore) {
      this.gore.sprayCone(x, y, dirAngle, 0.7, 3 + Math.min(8, amount * 0.1 | 0), 130, 2.4);
      this.gore.bloodDrip(x, y, 2, 1.4, 100, { size: 2 });
    }
    if (this.ragdoll) {
      this.ragdoll.impulse(x, y, Math.cos(dirAngle) * force * 0.012, Math.sin(dirAngle) * force * 0.012, 1.1);
    }
    if (amount > 60 && this.gore && chance(0.5)) {
      this.gore.gib(x, y, Math.cos(dirAngle) * 200, -rand(200, 60), rand(7, 3), '#8a5a44', { bone: chance(0.2) });
    }
  }

  draw(ctx) {
    if (this.alive) drawActor(ctx, this);
    else drawActorCorpse(ctx, this);
  }
}
