export const WEAPONS = [
  {
    id: 'pistol', slot: 1, name: 'M1911', sub: 'SEMI-AUTO · .45 ACP', kind: 'gun', style: 'pistol',
    mag: 12, reserve: 120, rpm: 340, damage: 36, pellets: 1, spread: 0.014, adsSpread: 0.005,
    reload: 1.35, recoil: 1.0, shake: 2.2, sound: 'pistol', tracer: 'pale', range: 2400,
    muzzle: 34, color: '#b9b6ac', accent: '#6b5a45', energy: 0.9,
  },
  {
    id: 'shotgun', slot: 2, name: 'M870', sub: 'PUMP · 12 GAUGE', kind: 'gun', style: 'shotgun',
    mag: 6, reserve: 48, rpm: 78, damage: 20, pellets: 9, spread: 0.105, adsSpread: 0.075,
    reload: 2.5, recoil: 3.4, shake: 6.5, sound: 'shotgun', tracer: 'pale', range: 1500,
    muzzle: 58, color: '#5b4a36', accent: '#2f2821', energy: 1,
  },
  {
    id: 'smg', slot: 3, name: 'VECTOR', sub: 'AUTO · .45 ACP', kind: 'gun', style: 'smg',
    mag: 30, reserve: 240, rpm: 880, damage: 15, pellets: 1, spread: 0.026, adsSpread: 0.012,
    reload: 1.75, recoil: 0.55, shake: 1.4, sound: 'smg', tracer: 'pale', range: 2200,
    muzzle: 40, color: '#3b3f42', accent: '#202326', energy: 0.8,
  },
  {
    id: 'rifle', slot: 4, name: 'AR-15', sub: 'AUTO · 5.56 NATO', kind: 'gun', style: 'rifle',
    mag: 30, reserve: 300, rpm: 600, damage: 29, pellets: 1, spread: 0.017, adsSpread: 0.006,
    reload: 2.15, recoil: 1.35, shake: 2.6, sound: 'rifle', tracer: 'amber', range: 3000,
    muzzle: 54, color: '#26292a', accent: '#141617', energy: 1,
  },
  {
    id: 'katana', slot: 5, name: 'KATANA', sub: 'MELEE · HAND-FORGED', kind: 'melee', style: 'katana',
    damage: 58, range: 104, arc: 2.0, swing: 0.34, cooldown: 0.46, sever: 2.6, knock: 280,
    sound: 'swing', shake: 2.4,
  },
  {
    id: 'sledge', slot: 6, name: 'SLEDGE', sub: 'MELEE · 8 LB HEAD', kind: 'melee', style: 'sledge',
    damage: 105, range: 92, arc: 1.6, swing: 0.52, cooldown: 0.78, sever: 3.4, knock: 820,
    sound: 'swing', shake: 7,
  },
  {
    id: 'chainsaw', slot: 7, name: 'CHAINSAW', sub: 'MELEE · 2-STROKE', kind: 'saw', style: 'chainsaw',
    damage: 30, range: 78, arc: 1.5, swing: 0.14, cooldown: 0.14, sever: 1.1, knock: 70,
    sound: 'chainsaw', shake: 1.8,
  },
  {
    id: 'grenade', slot: 8, name: 'M67', sub: 'THROWABLE · FRAG', kind: 'throw', style: 'grenade',
    mag: 4, reserve: 12, damage: 150, cooldown: 1.1, reload: 0, radius: 190, sound: 'throw',
  },
];

export class Arsenal {
  constructor() {
    this.index = 0;
    this.states = {};
    for (const d of WEAPONS) {
      this.states[d.id] = {
        mag: d.mag || 0, reserve: d.reserve || 0, cooldown: 0,
        reloading: 0, reloadTime: 0, swing: 0, hitDone: false,
        bloom: 0, pump: 0,
      };
    }
    this.lastIndex = 0;
  }

  reset() {
    for (const d of WEAPONS) {
      const s = this.states[d.id];
      s.mag = d.mag || 0; s.reserve = d.reserve || 0;
      s.cooldown = 0; s.reloading = 0; s.reloadTime = 0; s.swing = 0; s.hitDone = false; s.bloom = 0;
    }
    this.index = 0; this.lastIndex = 0;
  }

  get def() { return WEAPONS[this.index]; }
  get state() { return this.states[this.def.id]; }

  select(i) {
    i = (i + WEAPONS.length) % WEAPONS.length;
    if (i === this.index) return false;
    const d = WEAPONS[i];
    if (d.kind === 'throw' && this.states[d.id].reserve <= 0) return false;
    this.lastIndex = this.index;
    this.index = i;
    const s = this.state;
    s.reloading = 0; s.reloadTime = 0; s.swing = 0; s.cooldown = Math.max(s.cooldown, 0.12);
    return true;
  }

  cycle(dir = 1) {
    for (let k = 1; k <= WEAPONS.length; k++) {
      const i = (this.index + dir * k + WEAPONS.length * 2) % WEAPONS.length;
      if (this.select(i)) return true;
    }
    return false;
  }

  update(dt) {
    for (const s of Object.values(this.states)) {
      s.cooldown = Math.max(0, s.cooldown - dt);
      s.bloom = Math.max(0, s.bloom - dt * 2.6);
      s.pump = Math.max(0, s.pump - dt);
      if (s.reloading > 0) {
        s.reloading -= dt;
        if (s.reloading <= 0) {
          s.reloading = 0;
          const d = this.def;
          const st = this.state;
          if (d.kind === 'gun') {
            const need = d.mag - st.mag;
            const take = Math.min(need, st.reserve);
            st.mag += take; st.reserve -= take;
          }
        }
      }
      if (s.swing > 0) s.swing += dt;
    }
  }

  currentSpread(ads) {
    const d = this.def;
    const s = this.state;
    let sp = (ads ? d.adsSpread : d.spread) || 0;
    return sp + s.bloom * 0.018;
  }

  canShoot(ads) {
    const d = this.def, s = this.state;
    if (s.reloading > 0 || s.cooldown > 0) return false;
    if (d.kind === 'gun' && s.mag <= 0) return false;
    if (d.kind === 'throw' && s.reserve <= 0) return false;
    return true;
  }

  shoot(ads) {
    const d = this.def, s = this.state;
    if (!this.canShoot(ads)) return null;
    if (d.kind === 'gun') {
      s.mag--;
      s.cooldown = 60 / d.rpm;
      s.bloom = Math.min(1.4, s.bloom + (d.id === 'shotgun' ? 1 : 0.35));
      if (d.style === 'shotgun') s.pump = 0.5;
      return {
        def: d, angle: 0, spread: this.currentSpread(ads), pellets: d.pellets,
        damage: d.damage, range: d.range, recoil: d.recoil, shake: d.shake,
      };
    }
    if (d.kind === 'throw') {
      s.reserve--;
      s.cooldown = d.cooldown;
      return { def: d, thrown: true };
    }
    return null;
  }

  startMelee() {
    const d = this.def, s = this.state;
    if (d.kind !== 'melee' && d.kind !== 'saw') return null;
    if (s.cooldown > 0 || s.reloading > 0) return null;
    s.swing = 0.001; s.hitDone = false;
    s.cooldown = d.cooldown;
    if (d.kind === 'saw') return { def: d, swingId: ++s.swingId };
    return { def: d, swingId: ++s.swingId };
  }

  // Returns true exactly once during the damage window of a swing.
  consumeMeleeHit() {
    const d = this.def, s = this.state;
    if ((d.kind !== 'melee' && d.kind !== 'saw') || s.swing <= 0 || s.hitDone) return false;
    const p = s.swing / d.swing;
    const from = d.kind === 'saw' ? 0 : 0.22;
    const to = d.kind === 'saw' ? 1 : 0.62;
    if (p >= from && p <= to) { s.hitDone = true; return true; }
    return false;
  }

  meleeProgress() {
    const d = this.def, s = this.state;
    if (!(d.kind === 'melee' || d.kind === 'saw') || s.swing <= 0) return -1;
    return Math.min(1, s.swing / d.swing);
  }

  reload() {
    const d = this.def, s = this.state;
    if (d.kind !== 'gun') return false;
    if (s.reloading > 0 || s.mag >= d.mag) return false;
    if (s.reserve <= 0) return false;
    s.reloading = d.reload;
    s.reloadTime = d.reload;
    return true;
  }

  reloadProgress() {
    const s = this.state;
    if (!s.reloadTime) return 0;
    return 1 - s.reloading / s.reloadTime;
  }

  addAmmo(amount = 1) {
    for (const d of WEAPONS) {
      const s = this.states[d.id];
      if (d.kind === 'throw') s.reserve = Math.min(99, s.reserve + 2);
      else s.reserve = Math.min(d.reserve * 2, s.reserve + Math.ceil(d.reserve * 0.4 * amount));
    }
  }
}
