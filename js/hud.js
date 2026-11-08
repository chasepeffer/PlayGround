import { WEAPONS } from './weapons.js';
import { clamp } from './util.js';

export class HUD {
  constructor() {
    const $ = id => document.getElementById(id);
    this.root = $('hud');
    this.hpNum = $('hpNum');
    this.hpFill = $('healthFill');
    this.hpGhost = $('healthGhost');
    this.healthBar = $('healthBar');
    this.ammoMag = $('ammoMag');
    this.ammoReserve = $('ammoReserve');
    this.weaponName = $('weaponName');
    this.weaponType = $('weaponType');
    this.weaponBar = $('weaponBar');
    this.crosshair = $('crosshair');
    this.hitmarkerEl = $('hitmarker');
    this.killFeedEl = $('killFeed');
    this.reloadRing = $('reloadRing');
    this.reloadArc = $('reloadArc');
    this.waveNum = $('waveNum');
    this.modeLabel = $('modeLabel');
    this.enemyCount = $('enemyCount');
    this.killNum = $('killNum');
    this.statusTxt = $('statusTxt');
    this.slowmoDot = $('slowmoDot');
    this.crossParts = [...this.crosshair.querySelectorAll('.ch')];
    this.weaponSlots = [];
    this.bannerEl = document.createElement('div');
    this.bannerEl.className = 'wave-banner';
    this.root.appendChild(this.bannerEl);
    this.buildWeaponBar();
    this.lastAmmo = '';
    this.hitTimer = 0;
  }

  buildWeaponBar() {
    this.weaponBar.innerHTML = '';
    for (const d of WEAPONS) {
      const el = document.createElement('div');
      el.className = 'wslot';
      el.innerHTML = `<b>${d.slot}</b>${d.name.slice(0, 4)}`;
      el.title = d.name;
      this.weaponBar.appendChild(el);
      this.weaponSlots.push(el);
    }
  }

  show(v) {
    this.root.classList.toggle('hidden', !v);
  }

  setMode(mode) {
    this.modeLabel.textContent = mode === 'sandbox' ? 'FREE PLAY' : 'SURVIVAL';
  }

  banner(text, sub = '', cls = '') {
    this.bannerEl.className = 'wave-banner ' + cls;
    this.bannerEl.innerHTML = `<div class="wb-text">${text}</div><div class="wb-sub">${sub}</div>`;
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.add('show');
    clearTimeout(this._bt);
    this._bt = setTimeout(() => this.bannerEl.classList.remove('show'), 2600);
  }

  killFeed(text, crit = false) {
    const el = document.createElement('div');
    el.className = 'kf' + (crit ? ' crit' : '');
    el.innerHTML = text;
    this.killFeedEl.prepend(el);
    while (this.killFeedEl.children.length > 5) this.killFeedEl.lastChild.remove();
    setTimeout(() => el.remove(), 5200);
  }

  hitmarker(kill = false) {
    this.hitmarkerEl.classList.remove('show', 'kill');
    void this.hitmarkerEl.offsetWidth;
    if (kill) this.hitmarkerEl.classList.add('kill');
    this.hitmarkerEl.classList.add('show');
  }

  flashDamage() {
    const el = document.getElementById('damageFlash');
    el.classList.add('on');
    clearTimeout(this._dt);
    this._dt = setTimeout(() => el.classList.remove('on'), 180);
  }

  update(g) {
    const p = g.player;
    if (!p) return;
    const hpFrac = clamp(p.hp / p.maxHp, 0, 1);
    const hp = Math.max(0, Math.ceil(p.hp));
    this.hpNum.textContent = hp;
    this.hpFill.style.width = (hpFrac * 100) + '%';
    this.hpGhost.style.width = (hpFrac * 100) + '%';
    this.healthBar.classList.toggle('low', hpFrac < 0.3);
    this.statusTxt.textContent = hpFrac > 0.65 ? 'STABLE' : hpFrac > 0.3 ? 'BLEEDING' : 'CRITICAL';
    this.slowmoDot.classList.toggle('hidden', !g.slowmo);

    const d = g.arsenal.def, s = g.arsenal.state;
    this.weaponName.textContent = d.name;
    this.weaponType.textContent = d.sub;
    this.ammoMag.textContent = d.kind === 'gun' ? s.mag : d.kind === 'throw' ? s.reserve : '∞';
    this.ammoReserve.textContent = d.kind === 'gun' ? s.reserve : d.kind === 'throw' ? 'THROWABLES' : d.kind === 'melee' || d.kind === 'saw' ? '' : '';
    if (d.kind === 'gun' || d.kind === 'throw') {
      this.ammoReserve.textContent = d.kind === 'gun' ? s.reserve : 'FRAG';
    }
    this.ammoMag.classList.toggle('empty', d.kind === 'gun' && s.mag === 0);
    const ammoKey = `${d.id}:${s.mag}:${s.reserve}`;
    if (ammoKey !== this.lastAmmo) {
      this.lastAmmo = ammoKey;
      this.ammoMag.animate?.([
        { transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)' },
      ], { duration: 120, easing: 'ease-out' });
    }

    const spread = g.arsenal.currentSpread(g.input.aim);
    const gap = 7 + spread * 520 + clamp(Math.abs(p.vx) / 26, 0, 10);
    this.crossParts[0].style.transform = `translateY(${-gap}px)`;
    this.crossParts[1].style.transform = `translateY(${gap}px)`;
    this.crossParts[2].style.transform = `translateX(${-gap}px)`;
    this.crossParts[3].style.transform = `translateX(${gap}px)`;
    this.crosshair.classList.toggle('melee', d.kind === 'melee' || d.kind === 'saw');
    this.crosshair.style.opacity = g.state === 'menu' ? 0 : 1;

    const reloading = s.reloading > 0;
    this.reloadRing.classList.toggle('show', reloading);
    if (reloading) {
      const pct = g.arsenal.reloadProgress();
      this.reloadArc.style.strokeDashoffset = String(94.2 * (1 - pct));
    }

    this.waveNum.textContent = g.mode === 'sandbox' ? '∞' : String(g.wave).padStart(2, '0');
    this.enemyCount.textContent = g.aliveEnemyCount();
    this.killNum.textContent = g.kills;

    for (let i = 0; i < this.weaponSlots.length; i++) {
      this.weaponSlots[i].classList.toggle('active', i === g.arsenal.index);
    }
  }
}
