import * as THREE from 'three';
import { lit } from './quality.js';

export const WEAPON_DEFS = {
  fist: {
    name: 'FISTS', damage: 11, range: 0.92, cooldown: 0.34, knockback: 1.5, speed: 'FAST', arc: 1.5,
    throwDamage: 0
  },
  pickaxe: {
    name: 'PICKAXE', damage: 32, range: 1.18, cooldown: 0.66, knockback: 3.4, speed: 'HEAVY', arc: 1.25,
    throwDamage: 42
  },
  hatchet: {
    name: 'HATCHET', damage: 20, range: 1.02, cooldown: 0.4, knockback: 2.1, speed: 'QUICK', arc: 1.45,
    throwDamage: 30
  }
};

const steel = lit(0x9aa6ae);
const steelDark = lit(0x59636b);
const edgeMat = lit(0xd6e6ef, { emissive: 0x2a3d48, emissiveIntensity: 0.6 });
const wood = lit(0x6f4728);
const woodDark = lit(0x4a2d18);
const wrap = lit(0x211a17);
const accent = lit(0x9c1b1b);

function handle(length, radius, bandCount, bandYs) {
  const g = new THREE.Group();
  const h = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.82, radius, length, 5), wood);
  h.position.y = length / 2 - 0.18;
  h.castShadow = false;
  g.add(h);
  for (let i = 0; i < bandCount; i++) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.12, radius * 1.12, 0.026, 5), i === 0 ? accent : wrap);
    band.position.y = bandYs[i];
    band.castShadow = false;
    g.add(band);
  }
  return g;
}

function buildHatchet() {
  const g = new THREE.Group();
  g.add(handle(0.56, 0.031, 3, [-0.08, 0.0, 0.08]));

  const head = new THREE.Group();
  head.position.set(0, 0.4, 0);
  g.add(head);

  const shape = new THREE.Shape();
  shape.moveTo(-0.015, -0.075);
  shape.lineTo(0.105, -0.095);
  shape.lineTo(0.205, -0.045);
  shape.lineTo(0.235, 0.045);
  shape.lineTo(0.155, 0.11);
  shape.lineTo(0.02, 0.09);
  shape.lineTo(-0.015, 0.045);
  shape.closePath();
  const bladeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.055, bevelEnabled: false, steps: 1 });
  bladeGeo.translate(0, 0, -0.0275);
  const blade = new THREE.Mesh(bladeGeo, steel);
  blade.castShadow = false;
  head.add(blade);

  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.16, 0.062), edgeMat);
  edge.position.set(0.222, 0.005, 0);
  edge.rotation.z = -0.2;
  edge.castShadow = false;
  head.add(edge);

  const poll = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.075), steelDark);
  poll.position.set(-0.04, 0.0, 0);
  poll.castShadow = false;
  head.add(poll);

  const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.075, 5), steelDark);
  eye.rotation.x = Math.PI / 2;
  eye.position.set(0.0, 0.0, 0);
  head.add(eye);

  return g;
}

function buildPickaxe() {
  const g = new THREE.Group();
  g.add(handle(0.8, 0.036, 3, [-0.11, 0.02, 0.15]));

  const head = new THREE.Group();
  head.position.set(0, 0.6, 0);
  g.add(head);

  const center = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.1), steelDark);
  center.castShadow = false;
  head.add(center);

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.032, 0.3, 3), steel);
    arm.rotation.z = Math.PI / 2;
    arm.rotation.y = Math.PI / 4;
    arm.rotation.x = side * -0.18;
    arm.position.set(side * 0.2, side * -0.03, 0);
    arm.castShadow = false;
    head.add(arm);

    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.04, 0.22, 3), steel);
    tip.rotation.z = Math.PI / 2;
    tip.rotation.y = Math.PI / 4;
    tip.rotation.x = side * -0.32;
    tip.position.set(side * 0.42, side * -0.08, 0);
    tip.castShadow = false;
    head.add(tip);

    const glint = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.008, 0.03), edgeMat);
    glint.position.set(side * 0.4, side * -0.085, 0);
    glint.rotation.z = side * -0.32;
    head.add(glint);
  }

  return g;
}

export function buildWeaponMesh(kind) {
  return kind === 'pickaxe' ? buildPickaxe() : buildHatchet();
}

const ringGeo = new THREE.RingGeometry(0.34, 0.44, 12);
const ringMat = new THREE.MeshBasicMaterial({ color: 0xffa347, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });

export class WeaponDrop {
  constructor(kind, scene, fx, x, z) {
    this.kind = kind;
    this.def = WEAPON_DEFS[kind];
    this.scene = scene;
    this.fx = fx;
    this.group = buildWeaponMesh(kind);
    this.group.position.set(x, 0.185, z);
    this.group.rotation.y = Math.random() * Math.PI * 2;
    this.group.traverse(o => { if (o.isMesh) o.castShadow = false; });

    this.ring = new THREE.Mesh(ringGeo, ringMat.clone());
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = -0.17;
    this.ring.visible = true;
    this.group.add(this.ring);

    this.state = 'ground';
    this.vel = new THREE.Vector3();
    this.spin = new THREE.Vector3();
    this.hitCooldown = 0;
    this.baseY = 0.185;
    this.idle = Math.random() * 10;
    scene.add(this.group);
  }

  get worldPosition() {
    return this.group.getWorldPosition(new THREE.Vector3());
  }

  attach(anchor) {
    this.state = 'held';
    this.group.visible = false;
    this.ring.visible = false;
    this.group.rotation.set(0, 0, 0);
    this.group.position.set(0.02, 0, 0.04);
    anchor.add(this.group);
  }

  dropToGround(pos, yaw = 0) {
    this.state = 'ground';
    this.scene.attach(this.group);
    this.group.visible = true;
    this.group.position.copy(pos);
    this.group.position.y = this.baseY;
    this.group.rotation.set(0, yaw, 0);
    this.ring.visible = true;
    this.hitCooldown = 0;
    this.fx.ring(this.group.position, 0xffa347, 0.32, 0.35);
  }

  throwFrom(pos, dir) {
    this.state = 'thrown';
    this.group.visible = true;
    this.ring.visible = false;
    this.scene.attach(this.group);
    this.group.position.copy(pos);
    this.group.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
    this.vel.set(dir.x * 8.2, 3.4, dir.z * 8.2);
    this.spin.set(rand(-10, 10), rand(-10, 10), rand(-10, 10));
    this.hitCooldown = 0.08;
  }

  update(dt, time, game) {
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    if (this.state === 'ground') {
      this.idle += dt;
      this.group.position.y = this.baseY + Math.sin(this.idle * 2.2) * 0.012;
      this.group.rotation.y += dt * 0.55;
      this.ring.material.opacity = 0.38 + Math.sin(this.idle * 2.6) * 0.16;
      this.ring.scale.setScalar(1 + Math.sin(this.idle * 2.6) * 0.06);
    } else if (this.state === 'thrown') {
      this.vel.y -= 17 * dt;
      this.group.position.addScaledVector(this.vel, dt);
      this.group.rotation.x += this.spin.x * dt;
      this.group.rotation.y += this.spin.y * dt;
      this.group.rotation.z += this.spin.z * dt;

      const p = this.group.position;
      if (p.y < this.baseY) {
        p.y = this.baseY;
        if (Math.abs(this.vel.y) > 1.2) {
          this.vel.y *= -0.42;
          this.vel.x *= 0.72;
          this.vel.z *= 0.72;
          this.spin.multiplyScalar(0.72);
          if (Math.random() < 0.5) this.fx.bloodBurst(p, new THREE.Vector3(0, 1, 0), 3, 0.4);
        } else {
          this.state = 'ground';
          this.idle = 0;
          this.group.rotation.set(0, this.group.rotation.y, 0);
          this.group.position.y = this.baseY;
          this.ring.visible = true;
          this.fx.ring(p, 0xffa347, 0.35, 0.4);
        }
      }

      // clamp inside the pit (soft bounce)
      if (p.x > 1.9) { p.x = 1.9; this.vel.x *= -0.4; }
      if (p.x < -1.9) { p.x = -1.9; this.vel.x *= -0.4; }
      if (p.z > 1.9) { p.z = 1.9; this.vel.z *= -0.4; }
      if (p.z < -1.9) { p.z = -1.9; this.vel.z *= -0.4; }

      if (this.hitCooldown <= 0 && this.vel.lengthSq() > 5) {
        for (const npc of game.npcs) {
          if (!npc.alive || npc.state === 'grabbed' || npc.state === 'dead') continue;
          const d = npc.group.position.distanceTo(p);
          if (d < 0.48) {
            const dir = this.vel.clone().normalize();
            game.hitNPC(npc, this.def.throwDamage, dir, { weapon: this.kind, thrown: true });
            this.hitCooldown = 0.35;
            this.vel.multiplyScalar(-0.25);
            this.vel.y = 2;
            this.fx.bloodBurst(p, dir, 12, 1.2);
            game.shake(0.16);
            break;
          }
        }
      }
    }
  }
}

function rand(a, b) { return a + Math.random() * (b - a); }

export const WEAPON_ICONS = {
  fist: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20V13a2.5 2.5 0 0 1 5 0v6"/><path d="M16 19V11a2.5 2.5 0 0 1 5 0v8"/><path d="M21 19v-7a2.5 2.5 0 0 1 5 0v8"/><path d="M26 20v-4a2.5 2.5 0 0 1 5 0v8c0 5-4 9-9 9h-3c-3 0-5-1-7-3l-4-4c-1.4-1.4-1-3.2.4-4 1.3-.7 2.8-.3 3.8.9l2 2.1"/><path d="M10 14 8 12"/></svg>`,
  hatchet: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M16 34 26 8"/><path d="M22 12c3-3 8-3 11 0-3 1-5 4-5 7-2-1-4-2-6-2 1-2 1-4 0-5Z"/><path d="M14 28l4 2"/><path d="M19 13l3 1"/></svg>`,
  pickaxe: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M20 36 22 15"/><path d="M7 10c8-4 18-4 26 0-4 1-7 3-8 6-2-2-8-2-10 0-1-3-4-5-8-6Z"/><path d="M8 9c1 2 1 4 0 6M32 9c-1 2-1 4 0 6"/></svg>`
};
