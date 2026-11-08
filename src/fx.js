import * as THREE from 'three';

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();

function rand(a, b) { return a + Math.random() * (b - a); }

// Pooled blood, gibs, decals and impact rings. All procedural geometry.
export class FX {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.chunkPool = [];
    this.decals = [];
    this.rings = [];
    this.slashes = [];

    this.dropGeo = new THREE.IcosahedronGeometry(0.035, 0);
    this.chunkGeo = new THREE.BoxGeometry(1, 1, 1);
    this.decalGeo = new THREE.CircleGeometry(1, 14);
    this.ringGeo = new THREE.RingGeometry(0.72, 1, 40);

    this.matBlood = new THREE.MeshStandardMaterial({ color: 0x7c1014, roughness: 0.42, metalness: 0.05 });
    this.matBloodDark = new THREE.MeshStandardMaterial({ color: 0x4d090c, roughness: 0.55 });
    this.matBone = new THREE.MeshStandardMaterial({ color: 0xd9cfb8, roughness: 0.7 });
    this.matFlesh = new THREE.MeshStandardMaterial({ color: 0x9c5347, roughness: 0.62 });
    this.matDecal = new THREE.MeshBasicMaterial({ color: 0x3f0709, transparent: true, opacity: 0.78, depthWrite: false });

    this.maxDecals = 64;
    this.decalIndex = 0;

    this.dust = this.makeDust();
    scene.add(this.dust);
  }

  makeDust() {
    const count = 140;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = rand(-6, 6);
      positions[i * 3 + 1] = rand(0.1, 5);
      positions[i * 3 + 2] = rand(-6, 6);
      seeds[i] = rand(0, Math.PI * 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xc9b9a3, size: 0.018, transparent: true, opacity: 0.36,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    const points = new THREE.Points(geo, mat);
    points.userData.seeds = seeds;
    return points;
  }

  spawnDrop(pos, dir, opts = {}) {
    const { count = 12, power = 1, color = 'blood', up = 0.6, spread = 1.3, size = 1 } = opts;
    for (let i = 0; i < count; i++) {
      let p = this.particles.find(x => !x.active);
      if (!p) {
        const mesh = new THREE.Mesh(this.dropGeo, this.matBlood);
        mesh.castShadow = false;
        this.scene.add(mesh);
        p = { mesh, active: false, vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0, max: 1, gravity: 16 };
        this.particles.push(p);
      }
      p.active = true;
      p.mesh.visible = true;
      p.mesh.material = color === 'bone' ? this.matBone : color === 'flesh' ? this.matFlesh : (Math.random() < 0.35 ? this.matBloodDark : this.matBlood);
      p.mesh.position.copy(pos);
      p.mesh.position.x += rand(-0.08, 0.08);
      p.mesh.position.y += rand(-0.05, 0.12);
      p.mesh.position.z += rand(-0.08, 0.08);
      p.mesh.scale.setScalar(rand(0.5, 1.5) * size);
      p.vel.set(
        dir.x * power * rand(0.5, 1.4) + rand(-spread, spread),
        rand(0.3, 1.1) * up * power + rand(0, 0.5),
        dir.z * power * rand(0.5, 1.4) + rand(-spread, spread)
      );
      p.spin.set(rand(-12, 12), rand(-12, 12), rand(-12, 12));
      p.life = 0;
      p.max = rand(0.5, 1.1);
      p.gravity = rand(13, 20);
    }
  }

  bloodBurst(pos, dir, count = 14, power = 1) {
    this.spawnDrop(pos, dir, { count, power, up: 1, spread: 1.1 });
  }

  spark(pos, dir) {
    this.spawnDrop(pos, dir, { count: 5, power: 0.5, color: 'bone', up: 0.7, spread: 0.9, size: 0.7 });
  }

  chunks(pos, count = 8) {
    for (let i = 0; i < count; i++) {
      let c = this.chunkPool.find(x => !x.active);
      if (!c) {
        const mesh = new THREE.Mesh(this.chunkGeo, this.matFlesh);
        mesh.castShadow = true;
        this.scene.add(mesh);
        c = { mesh, active: false, vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0, max: 1 };
        this.chunkPool.push(c);
      }
      c.active = true;
      c.mesh.visible = true;
      c.mesh.material = Math.random() < 0.3 ? this.matBone : Math.random() < 0.5 ? this.matBloodDark : this.matFlesh;
      c.mesh.position.copy(pos);
      c.mesh.position.y += rand(0.2, 0.9);
      c.mesh.scale.set(rand(0.04, 0.14), rand(0.03, 0.1), rand(0.04, 0.12));
      c.vel.set(rand(-2.6, 2.6), rand(1.5, 4.6), rand(-2.6, 2.6));
      c.spin.set(rand(-14, 14), rand(-14, 14), rand(-14, 14));
      c.life = 0;
      c.max = rand(2.2, 4);
      c.mesh.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
    }
  }

  bloodPool(pos, size = 0.5) {
    const patches = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < patches; i++) {
      let d = this.decals.find(x => !x.active);
      if (!d) {
        if (this.decals.length >= this.maxDecals) d = this.decals[this.decalIndex++ % this.maxDecals];
        else {
          const mesh = new THREE.Mesh(this.decalGeo, this.matDecal.clone());
          mesh.rotation.x = -Math.PI / 2;
          mesh.renderOrder = 1;
          this.scene.add(mesh);
          d = { mesh, active: false, life: 0, max: 999 };
          this.decals.push(d);
        }
      }
      d.active = true;
      d.mesh.visible = true;
      d.mesh.position.set(pos.x + rand(-size * 0.55, size * 0.55), 0.012 + Math.random() * 0.002, pos.z + rand(-size * 0.55, size * 0.55));
      const s = rand(0.12, 0.42) * size * 2.2;
      d.mesh.scale.set(s * rand(0.7, 1.6), s, 1);
      d.mesh.rotation.z = rand(0, Math.PI * 2);
      d.mesh.material.opacity = rand(0.5, 0.85);
      d.life = 0;
      d.max = 999;
    }
  }

  ring(pos, color = 0xff3326, size = 0.55, dur = 0.5) {
    let r = this.rings.find(x => !x.active);
    if (!r) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
      const mesh = new THREE.Mesh(this.ringGeo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = 2;
      this.scene.add(mesh);
      r = { mesh, active: false, life: 0, max: dur, size };
      this.rings.push(r);
    }
    r.active = true;
    r.mesh.visible = true;
    r.mesh.position.copy(pos);
    r.mesh.position.y = Math.max(0.02, pos.y);
    r.mesh.material.color.setHex(color);
    r.mesh.material.opacity = 0.9;
    r.mesh.scale.setScalar(size);
    r.life = 0;
    r.max = dur;
    r.size = size;
  }

  slash(pos, yaw, color = 0xcfe6ff) {
    let s = this.slashes.find(x => !x.active);
    if (!s) {
      const geo = new THREE.TorusGeometry(0.62, 0.022, 4, 28, Math.PI * 1.15);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
      const mesh = new THREE.Mesh(geo, mat);
      this.scene.add(mesh);
      s = { mesh, active: false, life: 0, max: 0.2 };
      this.slashes.push(s);
    }
    s.active = true;
    s.mesh.visible = true;
    s.mesh.position.copy(pos);
    s.mesh.position.y = 1.05;
    s.mesh.rotation.set(Math.PI / 2, 0, 0);
    s.mesh.rotation.z = -yaw + Math.PI * 0.5;
    s.mesh.material.color.setHex(color);
    s.mesh.material.opacity = 0.8;
    s.mesh.scale.setScalar(0.85);
    s.life = 0;
    s.max = 0.2;
  }

  update(dt, time) {
    // particles
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.max) { p.active = false; p.mesh.visible = false; continue; }
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < 0.03) {
        p.mesh.position.y = 0.03;
        p.vel.y *= -0.25;
        p.vel.x *= 0.55;
        p.vel.z *= 0.55;
      }
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
      const t = p.life / p.max;
      p.mesh.scale.multiplyScalar(1 - dt * 0.35);
      if (t > 0.72) p.mesh.visible = Math.random() > 0.4;
    }

    // chunks
    for (const c of this.chunkPool) {
      if (!c.active) continue;
      c.life += dt;
      if (c.life >= c.max) { c.active = false; c.mesh.visible = false; continue; }
      c.vel.y -= 15 * dt;
      c.mesh.position.addScaledVector(c.vel, dt);
      if (c.mesh.position.y < 0.05) {
        c.mesh.position.y = 0.05;
        c.vel.y *= -0.32;
        c.vel.x *= 0.7;
        c.vel.z *= 0.7;
        c.spin.multiplyScalar(0.7);
      }
      c.mesh.rotation.x += c.spin.x * dt;
      c.mesh.rotation.y += c.spin.y * dt;
      c.mesh.rotation.z += c.spin.z * dt;
      if (c.life > c.max - 0.6) {
        c.mesh.scale.multiplyScalar(1 - dt * 2.5);
      }
    }

    // rings
    for (const r of this.rings) {
      if (!r.active) continue;
      r.life += dt;
      if (r.life >= r.max) { r.active = false; r.mesh.visible = false; continue; }
      const t = r.life / r.max;
      r.mesh.scale.setScalar(r.size * (0.35 + t * 1.5));
      r.mesh.material.opacity = (1 - t) * 0.9;
    }

    // slashes
    for (const s of this.slashes) {
      if (!s.active) continue;
      s.life += dt;
      if (s.life >= s.max) { s.active = false; s.mesh.visible = false; continue; }
      const t = s.life / s.max;
      s.mesh.material.opacity = (1 - t) * 0.8;
      s.mesh.scale.setScalar(0.85 + t * 0.35);
    }

    // dust
    const pos = this.dust.geometry.attributes.position;
    const seeds = this.dust.userData.seeds;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + Math.sin(time * 0.25 + seeds[i]) * dt * 0.06;
      let x = pos.getX(i) + Math.cos(time * 0.18 + seeds[i] * 1.7) * dt * 0.04;
      if (y > 5) y = 0.1;
      pos.setY(i, y);
      pos.setX(i, x);
    }
    pos.needsUpdate = true;
  }

  clear() {
    for (const p of this.particles) { p.active = false; p.mesh.visible = false; }
    for (const c of this.chunkPool) { c.active = false; c.mesh.visible = false; }
    for (const d of this.decals) { d.active = false; d.mesh.visible = false; }
    for (const r of this.rings) { r.active = false; r.mesh.visible = false; }
    for (const s of this.slashes) { s.active = false; s.mesh.visible = false; }
  }
}
