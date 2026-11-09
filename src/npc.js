import * as THREE from 'three';
import { lit } from './quality.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

function rand(a, b) { return a + Math.random() * (b - a); }

export class GoreNPC {
  constructor(scene, fx, audio, x, z, opts = {}) {
    this.scene = scene;
    this.fx = fx;
    this.audio = audio;
    this.maxHealth = 72;
    this.health = this.maxHealth;
    this.state = 'chase';
    this.attackCooldown = rand(0.9, 1.7);
    this.attackWindup = 0;
    this.staggerT = 0;
    this.deathT = 0;
    this.removed = false;
    this.walkPhase = rand(0, 10);
    this.flash = 0;
    this.vel = new THREE.Vector3();
    this.spin = new THREE.Vector3();
    this.hitCount = 0;
    this.throwT = 0;
    this.grabT = 0;
    this.baseScale = opts.scale || 1;
    this.bounds = opts.bounds || 1.66;
    this.center = opts.center || { x: 0, z: 0 };

    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    this.group.scale.setScalar(this.baseScale);
    this.root = new THREE.Group();
    this.group.add(this.root);
    scene.add(this.group);

    this.build();
    this.buildBar();
    this.group.rotation.y = Math.random() * Math.PI * 2;
  }

  build() {
    const M = (color, opts = {}) => {
      const m = lit(color, opts);
      this.materials.push(m);
      return m;
    };
    this.materials = [];
    const skin = M(0xa9665a);
    const skinDark = M(0x7c443d);
    const shorts = M(0x24201f, { roughness: 0.9 });
    const bone = M(0xd8ccb0, { roughness: 0.55 });
    const blood = M(0x4d0b0e, { roughness: 0.4 });
    const bloodBright = M(0x7d1116, { roughness: 0.38 });
    const eye = M(0xff2b18, { emissive: 0xff1a0a, emissiveIntensity: 2.4, roughness: 0.3 });
    const mouth = M(0x1a0a0b, { roughness: 0.8 });

    const add = (parent, geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = false;
      m.receiveShadow = false;
      parent.add(m);
      return m;
    };

    // torso + hips
    const hips = add(this.root, new THREE.BoxGeometry(0.3, 0.2, 0.22), shorts, 0, 0.72, 0);
    hips.geometry.translate(0, 0, 0);
    const torso = add(this.root, new THREE.CapsuleGeometry(0.185, 0.34, 2, 5), skin, 0, 1.04, 0);
    torso.scale.set(1.1, 1, 0.72);

    // exposed rib cage (gore)
    const wound = add(this.root, new THREE.SphereGeometry(0.13, 7, 5), bloodBright, 0, 1.08, 0.135);
    wound.scale.set(1.25, 1.35, 0.32);
    for (let i = 0; i < 2; i++) {
      const rib = add(this.root, new THREE.BoxGeometry(0.19 - i * 0.025, 0.017, 0.02), bone, 0, 1.15 - i * 0.07, 0.163);
      rib.rotation.z = (i % 2 ? 1 : -1) * 0.12;
    }
    // splatter patches
    for (let i = 0; i < 3; i++) {
      const p = add(this.root, new THREE.SphereGeometry(rand(0.02, 0.05), 7, 5), i % 2 ? blood : bloodBright,
        rand(-0.16, 0.16), rand(0.75, 1.3), rand(0.1, 0.15));
      p.scale.set(rand(0.7, 1.6), rand(0.7, 1.5), 0.28);
    }

    // head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.47, 0.01);
    this.root.add(headGroup);
    this.head = headGroup;
    const skull = add(headGroup, new THREE.SphereGeometry(0.155, 8, 6), skin, 0, 0, 0);
    skull.scale.set(0.94, 1.06, 0.96);
    add(headGroup, new THREE.BoxGeometry(0.2, 0.07, 0.11), skinDark, 0, 0.055, 0.09);
    add(headGroup, new THREE.BoxGeometry(0.13, 0.05, 0.09), mouth, 0, -0.075, 0.125);
    for (let i = 0; i < 4; i++) {
      add(headGroup, new THREE.BoxGeometry(0.018, 0.03, 0.02), bone, -0.045 + i * 0.03, -0.062, 0.16);
    }
    for (const side of [-1, 1]) {
      const e = add(headGroup, new THREE.SphereGeometry(0.024, 8, 6), eye, side * 0.06, 0.02, 0.135);
      e.scale.set(1.2, 0.7, 0.6);
    }
    // head wounds
    for (let i = 0; i < 1; i++) {
      const p = add(headGroup, new THREE.SphereGeometry(rand(0.025, 0.045), 5, 4), blood, rand(-0.1, 0.1), rand(0.02, 0.11), rand(0.1, 0.14));
      p.scale.set(1, 0.6, 0.25);
    }

    // arms
    const makeArm = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.27, 1.22, 0);
      this.root.add(pivot);
      const upper = add(pivot, new THREE.CapsuleGeometry(0.055, 0.2, 2, 4), skin, 0, -0.14, 0);
      upper.scale.set(1, 1, 0.9);
      const fore = add(pivot, new THREE.CapsuleGeometry(0.05, 0.19, 2, 4), skinDark, 0, -0.38, 0);
      fore.rotation.z = side * 0.05;
      const hand = add(pivot, new THREE.SphereGeometry(0.068, 6, 4), bloodBright, 0, -0.53, 0.02);
      hand.scale.set(0.85, 1, 0.9);
      // arm blood
      const smear = add(pivot, new THREE.SphereGeometry(0.04, 6, 5), blood, side * 0.03, -0.26, 0.02);
      smear.scale.set(0.8, 1.7, 0.25);
      return pivot;
    };
    this.armL = makeArm(-1);
    this.armR = makeArm(1);

    // legs
    const makeLeg = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.11, 0.68, 0);
      this.root.add(pivot);
      add(pivot, new THREE.CapsuleGeometry(0.07, 0.22, 2, 4), skinDark, 0, -0.16, 0);
      add(pivot, new THREE.CapsuleGeometry(0.058, 0.2, 2, 4), skin, 0, -0.42, 0);
      add(pivot, new THREE.BoxGeometry(0.11, 0.07, 0.2), shorts, 0, -0.6, 0.035);
      return pivot;
    };
    this.legL = makeLeg(-1);
    this.legR = makeLeg(1);

    // Wrist chains are omitted in the low-cost phone profile.
  }

  buildBar() {
    const g = new THREE.Group();
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.085), new THREE.MeshBasicMaterial({ color: 0x08080a, transparent: true, opacity: 0.72, depthWrite: false }));
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.045), new THREE.MeshBasicMaterial({ color: 0xd41f28, depthWrite: false }));
    fill.position.z = 0.002;
    g.add(back, fill);
    g.position.y = 1.86;
    g.visible = false;
    this.scene.add(g);
    this.bar = g;
    this.barFill = fill;
  }

  get position() { return this.group.position; }
  get alive() { return this.state !== 'dead'; }

  setGrabbed(player) {
    if (this.state !== 'grabbed') {
      this.state = 'grabbed';
      this.grabT = 0;
      this.attackWindup = 0;
      this.vel.set(0, 0, 0);
      this.root.rotation.set(0, 0, 0);
    }
    this.grabT += 1 / 60;
    const p = player.group.position;
    const f = player.forward;
    this.group.position.set(
      p.x + f.x * 0.62,
      1.06 + Math.sin(this.grabT * 9) * 0.025,
      p.z + f.z * 0.62
    );
    this.group.rotation.y = player.facingYaw;
    this.root.rotation.z = Math.sin(this.grabT * 7) * 0.16;
    this.root.rotation.x = -0.14 + Math.sin(this.grabT * 5) * 0.08;
  }

  release() {
    if (this.state === 'grabbed') {
      this.state = 'stagger';
      this.staggerT = 0.22;
      this.root.rotation.set(0, 0, 0);
      this.group.position.y = 0;
      this.vel.set(0, 0, 0);
    }
  }

  throwIt(dir) {
    this.state = 'thrown';
    this.throwT = 0;
    this.root.rotation.set(0, 0, 0);
    this.group.position.y = 1.0;
    this.vel.set(dir.x * 6.4, 3.6, dir.z * 6.4);
    this.spin.set(rand(-9, 9), rand(-5, 5), rand(-9, 9));
    this.attackWindup = 0;
  }

  update(dt, game) {
    if (this.removed) return;
    const player = game.player;

    // flash decay
    if (this.flash > 0) {
      this.flash -= dt;
      const e = clamp(this.flash / 0.12, 0, 1);
      for (const m of this.materials) {
        m.emissive.setRGB(e * 0.9, e * 0.06, e * 0.03);
      }
    }

    // health bar
    const alive = this.alive;
    const distToPlayer = Math.hypot(this.group.position.x - player.group.position.x, this.group.position.z - player.group.position.z);
    this.bar.visible = alive && (this.health < this.maxHealth || distToPlayer < 3.2) && this.state !== 'grabbed';
    if (this.bar.visible) {
      this.bar.position.set(this.group.position.x, this.group.position.y + 1.86 * this.baseScale, this.group.position.z);
      this.bar.quaternion.copy(game.camera.quaternion);
      const ratio = clamp(this.health / this.maxHealth, 0, 1);
      this.barFill.scale.x = Math.max(0.001, ratio);
      this.barFill.position.x = -(1 - ratio) * 0.25;
    }

    if (this.state === 'dead') {
      this.updateDeath(dt);
      return;
    }

    if (this.state === 'grabbed') {
      this.animateGrabbed(dt);
      return;
    }

    if (this.state === 'thrown') {
      this.updateThrown(dt, game);
      return;
    }

    if (this.state === 'stagger') {
      this.staggerT -= dt;
      this.group.position.x += this.vel.x * dt;
      this.group.position.z += this.vel.z * dt;
      this.vel.multiplyScalar(Math.max(0, 1 - dt * 7));
      this.root.rotation.x = lerp(this.root.rotation.x, 0.25, dt * 10);
      this.group.position.y = 0;
      this.animateWalk(dt, 0.4);
      if (this.staggerT <= 0) {
        this.state = 'chase';
        this.root.rotation.x = 0;
      }
      this.clampArena();
      return;
    }

    // chase / attack
    this.group.position.y = 0;
    this.attackCooldown -= dt;

    const dx = player.group.position.x - this.group.position.x;
    const dz = player.group.position.z - this.group.position.z;
    const dist = Math.hypot(dx, dz) || 0.001;
    const nx = dx / dist;
    const nz = dz / dist;

    // face player
    const targetYaw = Math.atan2(nx, nz);
    this.group.rotation.y = angleLerp(this.group.rotation.y, targetYaw, dt * 7);

    if (this.attackWindup > 0) {
      this.attackWindup -= dt;
      this.root.rotation.x = -0.12;
      const t = 1 - clamp(this.attackWindup / 0.34, 0, 1);
      this.armR.rotation.x = lerp(-0.2, -2.5, Math.min(1, t * 1.6));
      this.armR.rotation.z = lerp(0, 0.35, t);
      this.armL.rotation.x = lerp(0, 0.5, t);
      if (this.attackWindup <= 0) {
        this.armR.rotation.x = 0.55;
        this.armR.rotation.z = -0.1;
        this.attackCooldown = rand(1.45, 2.0);
        if (dist < 1.05 && player.alive) {
          player.takeDamage(6, this);
          game.onPlayerHurt(this);
          this.fx.bloodBurst(player.group.position.clone().setY(1.05), new THREE.Vector3(nx, 0.2, nz), 8, 0.8);
        }
        this.fx.slash(this.group.position.clone().setY(0.9), this.group.rotation.y, 0xff5a3d);
      }
      this.animateWalk(dt, 0);
      return;
    }

    if (!player.alive) {
      this.animateWalk(dt, 0);
      this.root.position.y = Math.sin(game.time * 1.5 + this.walkPhase) * 0.01;
      return;
    }

    if (dist > 0.78) {
      const speed = (this.health < this.maxHealth * 0.4 ? 1.42 : 1.02);
      let sx = nx * speed;
      let sz = nz * speed;

      // separation
      for (const other of game.npcs) {
        if (other === this || !other.alive) continue;
        const ox = this.group.position.x - other.group.position.x;
        const oz = this.group.position.z - other.group.position.z;
        const od = Math.hypot(ox, oz);
        if (od < 0.62 && od > 0.0001) {
          sx += (ox / od) * (0.62 - od) * 4;
          sz += (oz / od) * (0.62 - od) * 4;
        }
      }

      this.group.position.x += sx * dt;
      this.group.position.z += sz * dt;
      this.animateWalk(dt, 1);
    } else {
      this.animateWalk(dt, 0.25);
      if (this.attackCooldown <= 0) {
        this.attackWindup = 0.34;
        this.audio.swing();
      }
    }

    this.clampArena();
  }

  updateThrown(dt, game) {
    this.throwT += dt;
    this.vel.y -= 17 * dt;
    this.group.position.addScaledVector(this.vel, dt);
    this.root.rotation.x += this.spin.x * dt;
    this.root.rotation.y += this.spin.y * dt;
    this.root.rotation.z += this.spin.z * dt;

    // hit other NPCs while flying
    for (const other of game.npcs) {
      if (other === this || !other.alive || other.state === 'grabbed') continue;
      const d = other.group.position.distanceTo(this.group.position);
      if (d < 0.62) {
        const dir = this.vel.clone().normalize();
        game.hitNPC(other, 16, dir, { thrownBody: true });
        this.vel.multiplyScalar(0.35);
        game.shake(0.14);
        break;
      }
    }

    const p = this.group.position;
    if (p.y < 0.35) {
      p.y = 0.35;
      if (Math.abs(this.vel.y) > 1.6) {
        this.vel.y *= -0.32;
        this.vel.x *= 0.6;
        this.vel.z *= 0.6;
        this.spin.multiplyScalar(0.65);
        this.fx.bloodBurst(p, new THREE.Vector3(0, 1, 0), 7, 0.7);
        game.shake(0.08);
      } else {
        this.group.position.y = 0;
        this.root.rotation.set(0, this.root.rotation.y, 0);
        this.fx.bloodPool(p, 0.7);
        this.state = 'stagger';
        this.staggerT = 0.65;
        this.takeDamage(14, new THREE.Vector3(0, 0, 0), { fall: true, silent: false });
        if (this.state !== 'dead') {
          this.audio.hurt();
        }
      }
    }

    this.clampArena(true);
  }

  animateWalk(dt, amount) {
    if (amount > 0) this.walkPhase += dt * (6 + amount * 5);
    const swing = Math.sin(this.walkPhase) * 0.55 * amount;
    const swing2 = Math.sin(this.walkPhase + Math.PI) * 0.55 * amount;
    if (this.attackWindup <= 0) {
      this.armL.rotation.x = lerp(this.armL.rotation.x, swing, dt * 12);
      this.armR.rotation.x = lerp(this.armR.rotation.x, swing2, dt * 12);
      this.armL.rotation.z = 0.08;
      this.armR.rotation.z = -0.08;
    }
    this.legL.rotation.x = lerp(this.legL.rotation.x, -swing, dt * 14);
    this.legR.rotation.x = lerp(this.legR.rotation.x, -swing2, dt * 14);
    this.head.rotation.z = Math.sin(this.walkPhase * 0.5) * 0.06;
    this.head.rotation.x = Math.sin(this.walkPhase * 0.33) * 0.04;
    this.root.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.025 * amount;
  }

  animateGrabbed(dt) {
    const t = this.grabT;
    this.armL.rotation.x = -1.6 + Math.sin(t * 11) * 0.7;
    this.armR.rotation.x = -1.5 + Math.cos(t * 10) * 0.7;
    this.armL.rotation.z = 0.6 + Math.sin(t * 8) * 0.2;
    this.armR.rotation.z = -0.6 - Math.cos(t * 8) * 0.2;
    this.legL.rotation.x = Math.sin(t * 12) * 0.8;
    this.legR.rotation.x = -Math.sin(t * 12) * 0.8;
    this.head.rotation.z = Math.sin(t * 6) * 0.2;
  }

  updateDeath(dt) {
    this.deathT += dt;
    const t = Math.min(1, this.deathT / 0.42);
    this.root.rotation.x = lerp(0, -Math.PI / 2, easeOut(t));
    this.root.position.y = lerp(0, 0.17, t);
    if (this.deathT > 2.2) {
      const fade = clamp(1 - (this.deathT - 2.2) / 1.2, 0, 1);
      for (const m of this.materials) {
        m.transparent = true;
        m.opacity = fade;
      }
      this.group.position.y = -0.1 * (1 - fade);
    }
    if (this.deathT > 3.5) {
      this.removed = true;
      this.dispose();
    }
  }

  clampArena(thrown = false) {
    const lim = this.bounds;
    const p = this.group.position;
    if (p.x > lim) { p.x = lim; if (thrown) this.vel.x *= -0.4; }
    if (p.x < -lim) { p.x = -lim; if (thrown) this.vel.x *= -0.4; }
    if (p.z > lim) { p.z = lim; if (thrown) this.vel.z *= -0.4; }
    if (p.z < -lim) { p.z = -lim; if (thrown) this.vel.z *= -0.4; }
  }

  takeDamage(amount, dir, opts = {}) {
    if (this.state === 'dead') return;
    this.health -= amount;
    this.flash = 0.13;
    this.hitCount++;

    const chest = this.group.position.clone().setY(this.state === 'grabbed' ? 1.2 : 1.1);
    this.fx.bloodBurst(chest, dir, Math.round(8 + amount * 0.45), 0.9 + amount * 0.02);
    this.fx.bloodPool(this.group.position, 0.25 + Math.min(0.5, amount * 0.008));

    if (this.health <= 0) {
      this.die(dir);
      return;
    }

    if (!opts.silent) this.audio.hit();
    if (this.state !== 'grabbed') {
      this.state = 'stagger';
      this.staggerT = 0.16 + amount * 0.004;
      this.vel.set(dir.x * (opts.knockback ?? 2.2), 0, dir.z * (opts.knockback ?? 2.2));
      this.root.rotation.x = 0.2;
      this.attackWindup = 0;
    }
  }

  die(dir) {
    if (this.state === 'dead') return;
    this.state = 'dead';
    this.deathT = 0;
    this.health = 0;
    this.bar.visible = false;
    this.audio.gib();
    const p = this.group.position;
    this.fx.bloodBurst(p.clone().setY(1.1), dir, 34, 2.2);
    this.fx.chunks(p, 10);
    this.fx.bloodPool(p, 0.85);
    this.fx.ring(p, 0x9c1014, 0.7, 0.6);
    this.root.rotation.x = 0;
    this.root.rotation.z = rand(-0.4, 0.4);
    this.armL.rotation.x = -2.4;
    this.armR.rotation.x = -2.2;
  }

  dispose() {
    this.scene.remove(this.group);
    this.scene.remove(this.bar);
    this.group.traverse(o => {
      if (o.isMesh) {
        o.geometry?.dispose?.();
      }
    });
    for (const m of this.materials) m.dispose?.();
    this.bar.children.forEach(c => { c.geometry?.dispose?.(); c.material?.dispose?.(); });
  }
}

function angleLerp(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, t);
}
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
