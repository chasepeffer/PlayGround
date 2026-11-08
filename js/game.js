import { clamp, lerp, rand, randInt, chance, pick, TAU, dist, angleLerp, pointSeg } from './util.js';
import { AudioEngine } from './audio.js';
import { GoreSystem } from './particles.js';
import { ScreenFX } from './fx.js';
import { HUD } from './hud.js';
import { World, WORLD_W, GROUND_Y } from './world.js';
import { Actor, GROUND } from './actor.js';
import { Ragdoll } from './ragdoll.js';
import { Arsenal, WEAPONS } from './weapons.js';

const clampX = x => clamp(x, 70, WORLD_W - 70);

export class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.fx = new ScreenFX(document.getElementById('fx'));
    this.world = new World();
    this.gore = new GoreSystem(WORLD_W, 980, GROUND_Y);
    this.hud = new HUD();
    this.audio = new AudioEngine();
    this.arsenal = new Arsenal();
    this.actors = [];
    this.barrels = [];
    this.tracers = [];
    this.grenades = [];
    this.pendingBooms = [];
    this.spawnQueue = [];
    this.player = null;
    this.mode = 'survive';
    this.state = 'menu';
    this.paused = false;
    this.panelOpen = false;
    this.slowmo = false;
    this.time = 0;
    this.simTime = 0;
    this.timeScale = 1;
    this.hitstop = 0;
    this.wave = 1;
    this.kills = 0;
    this.limbs = 0;
    this.waveClock = 0;
    this.betweenWaves = false;
    this.waveCooldown = 0;
    this.spawnClock = 0;
    this.deathTimer = 0;
    this.slowTimer = 0;
    this.damageTimer = 0;
    this.bloodRain = 0;
    this.rollCd = 0;
    this.invuln = 0;
    this.quickThrowCd = 0;
    this.lastWeapon = null;
    this.touchMode = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    this.camera = { x: 0, y: 0, w: 1200, h: 720, scale: 1, shake: 0, shakeX: 0, shakeY: 0 };
    this.camX = 900;
    this.camY = 0;
    this.w = 1; this.h = 1; this.dpr = 1;
    this.input = {
      keys: new Set(), mouse: { x: 0, y: 0, tx: 0, ty: 0 },
      attackHeld: false, attackPressed: false, aim: false,
      touchMove: 0, touchAim: null, touchAimT: 0,
    };
    this.best = this.loadBest();
    this.last = performance.now();
    this.fpsSamples = [];
    this.msg = null;
    this.touchFireHeld = false;
    this.buildMenuScene();
    this.bindInput();
    this.bindUI();
    this.resize();
    this.updateBestUI();
    window.addEventListener('resize', () => this.resize());
    requestAnimationFrame(this.frame);
  }

  // ---------- scenes ----------
  clearWorld() {
    this.actors.length = 0;
    this.tracers.length = 0;
    this.grenades.length = 0;
    this.pendingBooms.length = 0;
    this.spawnQueue.length = 0;
    this.gore.clear();
    this.player = null;
    this.barrels = this.makeBarrels();
    this.wave = 1; this.kills = 0; this.limbs = 0;
    this.waveClock = 0; this.betweenWaves = false; this.waveCooldown = 0;
    this.bloodRain = 0; this.slowmo = false; this.timeScale = 1; this.hitstop = 0;
    this.deathTimer = 0; this.slowTimer = 0; this.damageTimer = 0;
    this.arsenal.reset();
  }

  makeBarrels() {
    return [560, 1160, 1610, 2320, 2640, 3120, 3660].map((x, i) => ({
      x, y: GROUND_Y, hp: 45, alive: true, radius: 24, seed: i, burn: 0,
    }));
  }

  buildMenuScene() {
    this.actors.length = 0;
    this.gore.clear();
    this.barrels = this.makeBarrels();
    this.tracers.length = 0;
    this.grenades.length = 0;
    const p1 = 640, p2 = 900, p3 = 1210, p4 = 1490;
    const make = (x, opts = {}) => {
      const a = new Actor({
        x, type: 'dummy', gore: this.gore, audio: this.audio,
        worldW: WORLD_W, groundY: GROUND, hp: 120,
        ...opts,
      });
      a.onDeath = () => {};
      return a;
    };
    const corpses = [
      [make(p1), { severed: 'armL', force: 300, dirAngle: 2.6 }],
      [make(p2, { shirt: '#3c342e' }), { severed: 'head', force: 500, dirAngle: -0.4, headExplode: true }],
      [make(p3, { shirt: '#2f3a38', pants: '#24262b' }), { severed: 'legR', force: 340, dirAngle: 2.2 }],
      [make(p4, { shirt: '#453b31' }), {}],
    ];
    for (const [a, info] of corpses) {
      this.actors.push(a);
      a.die({ x: a.x + rand(20, -20), y: a.y - 110, dirAngle: info.dirAngle ?? rand(TAU), force: info.force ?? 400, severed: info.severed, part: info.severed, headExplode: info.headExplode });
    }
    // extra wounds / piles
    this.gore.pool(p2 + 30, GROUND - 3, 46);
    this.gore.pool(p3 - 20, GROUND - 3, 36);
    this.gore.pool(p1 + 10, GROUND - 3, 30);
    for (let i = 0; i < 16; i++) {
      this.gore.splat(rand(1500, 500), GROUND - 2 + rand(3, -2), rand(22, 5), rand(TAU), rand(0.8, 0.3));
    }
    for (let i = 0; i < 5; i++) {
      this.gore.gib(rand(1500, 550), rand(GROUND - 10, GROUND - 60), rand(10, -10), 0, rand(7, 3), pick(['#8a5a44', '#7a4030']), { bone: i === 0 });
    }
    // a survivor standing in the middle of it
    const stand = make(1030, { weapon: WEAPONS[3], helmet: false, mask: false, shirt: '#31383a' });
    stand.aim = Math.PI * 0.85;
    stand.facing = -1;
    stand.state = 'idle';
    this.actors.push(stand);
    this.standActor = stand;
    for (let i = 0; i < 90; i++) {
      const a = this.actors[i % this.actors.length];
      if (a && !a.alive) this.gore.bloodDrip(a.x + rand(40, -40), GROUND - rand(140, 4), 1, 0.9, 80, { size: 1.6 });
    }
    this.camX = 960;
    this.state = 'menu';
    this.paused = false;
  }

  startGame(mode = 'survive') {
    this.audio.init();
    this.mode = mode;
    this.clearWorld();
    this.audio.ui();
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('pause').classList.add('hidden');
    document.getElementById('death').classList.add('hidden');
    this.closePanel();
    this.hud.show(true);
    this.hud.setMode(mode);
    this.state = 'playing';
    this.paused = false;
    const p = new Actor({
      x: 820, type: 'player', gore: this.gore, audio: this.audio,
      worldW: WORLD_W, groundY: GROUND, hp: 100,
      shirt: '#2c3336', pants: '#22262a', skin: '#c99a7e', helmet: false, mask: false,
      weapon: WEAPONS[0],
    });
    p.onDeath = (a, info) => this.playerDied(a, info);
    p.aim = 0;
    this.player = p;
    this.actors.push(p);
    this.camX = p.x - this.camera.w * 0.35;
    this.camY = GROUND - this.camera.h * 0.78;
    if (mode === 'sandbox') {
      this.hud.banner('FREE PLAY', 'THE FLOOR IS YOURS', '');
      for (const dx of [-320, 190, 420]) {
        this.spawnDummy(p.x + dx);
      }
      this.spawnEnemy('thug', p.x + 520);
      this.wave = 1;
    } else {
      this.startWave(1);
    }
  }

  toMenu() {
    this.state = 'menu';
    this.paused = false;
    this.closePanel();
    document.getElementById('pause').classList.add('hidden');
    document.getElementById('death').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
    this.hud.show(false);
    this.buildMenuScene();
    this.updateBestUI();
  }

  updateBestUI() {
    const bw = document.getElementById('bestWave');
    const bk = document.getElementById('bestKills');
    if (bw) bw.textContent = this.best.wave ? String(this.best.wave) : '—';
    if (bk) bk.textContent = this.best.kills ? String(this.best.kills) : '—';
  }

  loadBest() {
    try {
      const raw = localStorage.getItem('carnage.best');
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return { wave: 0, kills: 0 };
  }

  saveBest() {
    let changed = false;
    if (this.wave > (this.best.wave || 0)) { this.best.wave = this.wave; changed = true; }
    if (this.kills > (this.best.kills || 0)) { this.best.kills = this.kills; changed = true; }
    if (changed) {
      try { localStorage.setItem('carnage.best', JSON.stringify(this.best)); } catch (e) { /* ignore */ }
      this.updateBestUI();
    }
  }

  // ---------- ui binding ----------
  bindUI() {
    const $ = id => document.getElementById(id);
    $('startBtn').addEventListener('click', () => this.startGame('survive'));
    $('sandboxBtn').addEventListener('click', () => this.startGame('sandbox'));
    $('resumeBtn').addEventListener('click', () => this.resume());
    $('restartBtn').addEventListener('click', () => this.startGame(this.mode));
    $('menuBtn').addEventListener('click', () => this.toMenu());
    $('retryBtn').addEventListener('click', () => this.startGame(this.mode));
    $('deathSandboxBtn').addEventListener('click', () => this.startGame('sandbox'));
    $('deathMenuBtn').addEventListener('click', () => this.toMenu());
    $('panelClose').addEventListener('click', () => this.closePanel());
    document.querySelectorAll('#sandboxPanel [data-action]').forEach(btn => {
      btn.addEventListener('click', () => this.sandboxAction(btn.dataset.action));
    });
    const panel = $('sandboxPanel');
    panel.addEventListener('pointerdown', e => e.stopPropagation());

    // touch
    if (this.touchMode) {
      $('touchUI').classList.remove('hidden');
      const stick = $('stick'), knob = $('stickKnob');
      let stickId = null;
      const setStick = (dx, dy) => {
        const max = 40;
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / max);
        const nx = dx / d * k * max, ny = dy / d * k * max;
        knob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
        this.input.touchMove = Math.abs(dx) > 10 ? clamp(dx / 38, -1, 1) : 0;
      };
      stick.addEventListener('pointerdown', e => { stickId = e.pointerId; stick.setPointerCapture(e.pointerId); setStick(0, 0); });
      stick.addEventListener('pointermove', e => { if (e.pointerId === stickId) setStick(e.clientX - (stick.getBoundingClientRect().left + stick.clientWidth / 2), e.clientY - (stick.getBoundingClientRect().top + stick.clientHeight / 2)); });
      const endStick = e => { if (e.pointerId !== stickId) return; stickId = null; knob.style.transform = 'translate(-50%,-50%)'; this.input.touchMove = 0; };
      stick.addEventListener('pointerup', endStick);
      stick.addEventListener('pointercancel', endStick);

      const fire = $('tFire');
      const startFire = e => { e.preventDefault(); this.input.attackHeld = true; this.input.attackPressed = true; this.audio.init(); };
      const endFire = () => { this.input.attackHeld = false; };
      fire.addEventListener('pointerdown', startFire);
      fire.addEventListener('pointerup', endFire);
      fire.addEventListener('pointercancel', endFire);
      fire.addEventListener('pointerleave', endFire);
      $('tReload').addEventListener('pointerdown', e => { e.preventDefault(); this.reload(); });
      $('tJump').addEventListener('pointerdown', e => { e.preventDefault(); this.jump(); });
      $('tSwap').addEventListener('pointerdown', e => { e.preventDefault(); this.swapWeapon(1); });
      this.canvas.addEventListener('pointerdown', e => {
        if (e.pointerType === 'touch') {
          this.input.touchAim = this.screenToWorld(e.clientX, e.clientY);
          this.input.touchAimT = 2.5;
          this.audio.init();
        }
      });
      this.canvas.addEventListener('pointermove', e => {
        if (e.pointerType === 'touch' && e.buttons) {
          this.input.touchAim = this.screenToWorld(e.clientX, e.clientY);
          this.input.touchAimT = 2.5;
        }
      });
      window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
    }
    $('rotateHint').classList.toggle('hidden', !(this.touchMode && window.innerHeight > window.innerWidth));
    window.addEventListener('orientationchange', () => {
      $('rotateHint').classList.toggle('hidden', !(this.touchMode && window.innerHeight > window.innerWidth));
    });
  }

  bindInput() {
    const el = this.canvas;
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (['tab', ' ', 'arrowup', 'arrowdown'].includes(k)) e.preventDefault();
      if (this.input.keys.has(k) && k !== 'escape') return;
      this.input.keys.add(k);
      this.audio.init();
      if (k === 'escape') {
        if (this.panelOpen) this.closePanel();
        else if (this.state === 'playing' && this.deathTimer <= 0) this.togglePause();
      } else if (k === 'tab') {
        if (this.state === 'playing') this.togglePanel();
      } else if (this.state === 'playing' && this.deathTimer <= 0) {
        if (/^[1-8]$/.test(k)) this.selectWeapon(Number(k) - 1);
        else if (k === 'q') this.swapWeapon(1);
        else if (k === 'r') this.reload();
        else if (k === 't') this.toggleSlowmo();
        else if (k === 'g') this.throwGrenade(false);
        else if (k === 'w' || k === 'arrowup') this.jump();
        else if (k === ' ') this.roll();
        else if (k === 'm') { this.audio.setMuted(!this.audio.muted); }
        else if (this.mode === 'sandbox') this.sandboxKey(k);
      }
    });
    window.addEventListener('keyup', e => this.input.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => {
      this.input.keys.clear();
      this.input.attackHeld = false; this.input.aim = false;
      if (this.state === 'playing' && !this.panelOpen && this.deathTimer <= 0 && !this.paused) this.togglePause();
    });
    el.addEventListener('mousemove', e => {
      this.input.mouse.x = e.clientX; this.input.mouse.y = e.clientY;
    });
    el.addEventListener('mousedown', e => {
      this.audio.init();
      if (e.button === 0) { this.input.attackHeld = true; this.input.attackPressed = true; }
      if (e.button === 2) this.input.aim = true;
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) this.input.attackHeld = false;
      if (e.button === 2) this.input.aim = false;
    });
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('wheel', e => {
      if (this.state === 'playing') { e.preventDefault(); this.swapWeapon(e.deltaY > 0 ? 1 : -1); }
    }, { passive: false });
    el.addEventListener('touchstart', e => { if (e.touches[0]) { this.input.mouse.x = e.touches[0].clientX; this.input.mouse.y = e.touches[0].clientY; } }, { passive: true });
  }

  togglePause() {
    if (this.state !== 'playing') return;
    this.paused = !this.paused;
    document.getElementById('pause').classList.toggle('hidden', !this.paused);
    if (this.paused) this.closePanel();
    this.audio.ui();
  }

  resume() {
    this.paused = false;
    document.getElementById('pause').classList.add('hidden');
    this.audio.ui();
  }

  togglePanel() {
    this.panelOpen = !this.panelOpen;
    document.getElementById('sandboxPanel').classList.toggle('hidden', !this.panelOpen);
    if (this.panelOpen) { this.paused = true; document.getElementById('pause').classList.add('hidden'); }
    else this.paused = false;
    this.audio.ui();
  }

  closePanel() {
    if (!this.panelOpen) return;
    this.panelOpen = false;
    document.getElementById('sandboxPanel').classList.add('hidden');
    this.paused = false;
  }

  sandboxKey(k) {
    if (k === 'j') this.sandboxAction('dummy');
    else if (k === 'k') this.sandboxAction('hostile');
    else if (k === 'h') this.sandboxAction('heal');
    else if (k === 'u') this.sandboxAction('ammo');
    else if (k === 'c') this.sandboxAction('clear');
    else if (k === 'b') this.sandboxAction('rain');
  }

  sandboxAction(action) {
    if (!this.player || !this.player.alive) return;
    this.audio.init();
    const p = this.player;
    if (action === 'dummy') {
      this.spawnDummy(clampX(p.x + (chance(0.5) ? 1 : -1) * rand(320, 140)));
      this.hud.killFeed('SUBJECT <b>DEPLOYED</b>', false);
    } else if (action === 'hostile') {
      this.spawnEnemy(pick(['thug', 'gunner', 'brute']), clampX(p.x + (chance(0.5) ? 1 : -1) * rand(300, 120)));
      this.hud.killFeed('HOSTILE <b>RELEASED</b>', true);
    } else if (action === 'heal') {
      p.hp = p.maxHp; p.wounds.length = 0;
      this.hud.killFeed('VITALS <b>RESTORED</b>', false);
    } else if (action === 'ammo') {
      this.arsenal.addAmmo(2);
      this.hud.killFeed('AMMUNITION <b>RESTOCKED</b>', false);
    } else if (action === 'clear') {
      this.actors = this.actors.filter(a => a === this.player || a.alive);
      if (this.standActor) this.standActor = null;
      this.gore.clear();
      this.grenades.length = 0;
      this.barrels = this.makeBarrels();
      this.hud.killFeed('FLOOR <b>BLEACHED</b>', false);
    } else if (action === 'slowmo') {
      this.toggleSlowmo();
    } else if (action === 'gore') {
      const m = this.mouseWorld();
      this.explode(m.x, clamp(m.y, -100, GROUND - 10), 260, 300, 'GORE BOMB');
    } else if (action === 'rain') {
      this.bloodRain = 4.5;
      this.hud.banner('BLOOD RAIN', 'LOOK UP', 'danger');
    }
    this.audio.ui();
  }

  // ---------- dimensions & camera ----------
  resize() {
    const w = Math.max(320, window.innerWidth);
    const h = Math.max(320, window.innerHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.fx.resize(w, h, dpr);
    const aspect = w / h;
    let viewW = 1300;
    let viewH = viewW / aspect;
    if (viewH < 700) { viewH = 700; viewW = viewH * aspect; }
    if (viewH > 1400) { viewH = 1400; viewW = viewH * aspect; }
    this.viewW = viewW; this.viewH = viewH;
    this.camera.w = viewW; this.camera.h = viewH;
    this.camera.scale = w / viewW;
    const anchor = viewH > 1150 ? 0.7 : 0.78;
    this.groundAnchor = anchor;
    this.camY = GROUND_Y - viewH * anchor;
    this.camX = clamp(this.camX, 0, WORLD_W - viewW);
  }

  screenToWorld(cx, cy) {
    const c = this.camera;
    return { x: c.x + cx / c.scale, y: c.y + cy / c.scale };
  }

  mouseWorld() {
    if (this.touchMode && this.input.touchAim && this.input.touchAimT > 0) return this.input.touchAim;
    return this.screenToWorld(this.input.mouse.x, this.input.mouse.y);
  }

  updateCamera(dt) {
    const c = this.camera;
    let targetX, targetY;
    if (this.state === 'menu') {
      targetX = 1050 + Math.sin(this.time * 0.09) * 210 + Math.sin(this.time * 0.023) * 120;
      targetY = GROUND_Y - this.viewH * 0.76;
      this.camX = targetX;
      this.camY = targetY;
    } else if (this.player) {
      const p = this.player;
      const chest = p.alive ? { x: p.x, y: p.y - 110 } : (p.pose?.hip || { x: p.x, y: p.y - 60 });
      targetX = chest.x + (p.alive ? clamp(Math.cos(p.aim) * 130, -130, 130) : 0);
      targetY = GROUND_Y - this.viewH * this.groundAnchor;
      if (!p.alive) {
        const hip = p.pose?.hip;
        if (hip) targetY = hip.y - this.viewH * 0.46;
      }
      const follow = this.state === 'dying' || this.state === 'dead' ? 3 : 7;
      this.camX = lerp(this.camX, targetX - this.viewW / 2, 1 - Math.exp(-dt * follow));
      this.camY = lerp(this.camY, targetY, 1 - Math.exp(-dt * (follow * 0.7)));
    }
    this.camX = clamp(this.camX, 0, Math.max(0, WORLD_W - this.viewW));
    if (this.state !== 'menu') this.camY = clamp(this.camY, -600, 980 - this.viewH);

    c.shake = Math.max(0, c.shake - dt * 38);
    const amp = c.shake * 0.6;
    c.shakeX = rand(amp, -amp);
    c.shakeY = rand(amp, -amp);
    c.x = this.camX + c.shakeX;
    c.y = this.camY + c.shakeY;
  }

  addShake(n) { this.camera.shake = Math.min(30, this.camera.shake + n); }

  addTracer(x1, y1, x2, y2, color = 'pale') {
    this.tracers.push({ x1, y1, x2, y2, life: 0.085, max: 0.085, color });
  }

  // ---------- main loop ----------
  frame = (now) => {
    const raw = clamp((now - this.last) / 1000, 0.0001, 0.05);
    this.last = now;
    this.fpsSamples.push(raw);
    if (this.fpsSamples.length > 30) this.fpsSamples.shift();
    if (this.state === 'menu') {
      const dt = Math.min(raw, 0.033);
      this.time += dt;
      for (const a of this.actors) a.update(dt);
      this.gore.update(dt * 0.85);
      this.fx.update(raw, 1);
      this.updateCamera(dt);
      if (this.standActor) {
        this.standActor.aim = Math.PI * 0.82 + Math.sin(this.time * 0.4) * 0.05;
      }
    } else if (!this.paused) {
      let scale = this.slowmo ? 0.34 : 1;
      if (this.slowTimer > 0) { scale = Math.min(scale, 0.38); this.slowTimer -= raw; }
      if (this.deathTimer > 0) scale = Math.min(scale, 0.5);
      if (this.hitstop > 0) { this.hitstop -= raw; scale = Math.min(scale, 0.08); }
      const dt = raw * Math.max(0.04, scale);
      this.timeScale = scale;
      this.time += dt;
      this.update(dt, raw);
      this.updateCamera(dt);
    }
    this.render(raw);
    this.hud.update(this);
    requestAnimationFrame(this.frame);
  };

  update(dt, raw) {
    const p = this.player;
    this.rollCd = Math.max(0, this.rollCd - raw);
    this.invuln = Math.max(0, this.invuln - raw);
    this.quickThrowCd = Math.max(0, this.quickThrowCd - raw);
    this.damageTimer += raw;

    if (p && p.alive) {
      this.updatePlayer(p, dt, raw);
    } else if (p) {
      p.weaponDef = this.arsenal.def;
    }

    for (const a of this.actors) {
      a.muzzleFlash = Math.max(0, (a.muzzleFlash || 0) - dt * 16);
      a.pumpAnim = Math.max(0, (a.pumpAnim || 0) - dt * 4);
      if (a !== p) {
        if (a.alive && a.type === 'enemy') this.updateEnemy(a, dt, raw);
        a.update(dt);
      }
    }
    if (p) p.update(dt);

    for (const b of this.barrels) if (b.burn > 0) { b.burn -= dt; }

    // grenades
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.fuse -= dt;
      g.vy += 2000 * dt;
      g.x += g.vx * dt; g.y += g.vy * dt;
      g.rot += g.vr * dt;
      if (g.y > GROUND - 6) {
        g.y = GROUND - 6;
        if (Math.abs(g.vy) > 60) { g.vy *= -0.42; g.vx *= 0.7; g.vr *= 0.6; this.audio.impact('metal'); }
        else { g.vy = 0; g.vx *= 0.82; g.vr *= 0.85; }
      }
      if (g.x < 60 || g.x > WORLD_W - 60) { g.x = clamp(g.x, 60, WORLD_W - 60); g.vx *= -0.5; }
      if (g.fuse <= 0) {
        this.grenades.splice(i, 1);
        this.explode(g.x, g.y, 200, 170, 'M67');
      }
    }
    // delayed explosions (barrel chains)
    for (let i = this.pendingBooms.length - 1; i >= 0; i--) {
      const b = this.pendingBooms[i];
      b.t -= dt;
      if (b.t <= 0) { this.pendingBooms.splice(i, 1); this.explode(b.x, b.y, b.radius, b.damage, b.label || 'BARREL'); }
    }
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      this.tracers[i].life -= dt;
      if (this.tracers[i].life <= 0) this.tracers.splice(i, 1);
    }

    this.gore.update(dt);

    // player is out of combat -> recover
    if (p && p.alive) {
      if (this.damageTimer > 6 && p.hp < p.maxHp && p.hp > 0) {
        p.hp = Math.min(p.maxHp, p.hp + dt * 7);
      }
    }

    if (this.bloodRain > 0) {
      this.bloodRain -= dt;
      for (let i = 0; i < 3; i++) {
        this.gore.bloodDrip(rand(this.camX + this.viewW, this.camX), this.camY - 20, 1, 1.2, 40, { size: 2.5 });
      }
    }

    if (this.mode === 'survive') this.updateWaves(dt);
    this.fx.update(raw, p ? clamp(p.hp / p.maxHp, 0, 1) : 1);

    if (this.deathTimer > 0) {
      this.deathTimer -= raw;
      if (this.deathTimer <= 0) this.showDeathScreen();
    }
  }

  updatePlayer(p, dt, raw) {
    this.arsenal.update(dt);
    p.weaponDef = this.arsenal.def;
    this.lastWeapon = this.arsenal.def;

    // aim
    let aimTarget = null;
    if (this.touchMode) {
      this.input.touchAimT = Math.max(0, this.input.touchAimT - raw);
      if (this.input.touchAim && this.input.touchAimT > 0) {
        aimTarget = Math.atan2(this.input.touchAim.y - (p.y - 118), this.input.touchAim.x - p.x);
      } else {
        const e = this.nearestEnemy();
        if (e) {
          const pose = e.pose;
          aimTarget = Math.atan2((pose ? pose.neck.y : e.y - 120) - (p.y - 118), e.x - p.x);
        }
      }
    }
    if (aimTarget === null) {
      const m = this.mouseWorld();
      if (Math.hypot(m.x - p.x, m.y - (p.y - 118)) > 12) {
        aimTarget = Math.atan2(m.y - (p.y - 118), m.x - p.x);
      }
    }
    if (aimTarget !== null) p.aim = angleLerp(p.aim, aimTarget, 1 - Math.exp(-dt * 26));

    const keys = this.input.keys;
    let move = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    if (this.touchMode) move = clamp(this.input.touchMove + move * 0.8, -1, 1);
    const sprint = keys.has('shift');
    const speed = (sprint ? 505 : 330) * (this.invuln > 0 ? 1.35 : 1);
    const accel = p.onGround ? 16 : 4.5;
    const targetVx = move * speed;
    p.vx = lerp(p.vx, targetVx, 1 - Math.exp(-dt * accel));

    p.vy += 2150 * dt;
    p.y += p.vy * dt;
    p.x += p.vx * dt;
    if (p.y >= GROUND) {
      if (!p.onGround && p.vy > 300) { this.audio.footstep(); this.gore.dust(p.x, p.y, 2, 5); }
      p.y = GROUND; p.vy = 0; p.onGround = true;
    } else p.onGround = false;
    if (p.x < 55) { p.x = 55; p.vx = Math.max(0, p.vx); }
    if (p.x > WORLD_W - 55) { p.x = WORLD_W - 55; p.vx = Math.min(0, p.vx); }

    p.meleeProgress = this.arsenal.meleeProgress();
    p.pumpAnim = this.arsenal.state.pump > 0 ? 1 : 0;

    // footsteps
    if (Math.abs(p.vx) > 60 && p.onGround) {
      this.stepAcc = (this.stepAcc || 0) + raw;
      if (this.stepAcc > (sprint ? 0.3 : 0.42)) { this.stepAcc = 0; this.audio.footstep(); if (chance(0.4)) this.gore.dust(p.x, p.y, 1, 3); }
    }

    // attacks
    const d = this.arsenal.def;
    const pressed = this.input.attackPressed;
    if (d.kind === 'melee' || d.kind === 'saw') {
      if (this.input.attackHeld || pressed) {
        const swing = this.arsenal.startMelee();
        if (swing) {
          this.audio.swing();
          p.vx += Math.cos(p.aim) * (d.kind === 'saw' ? 12 : 40);
          this.addShake(d.shake * 0.35);
        }
      }
      if (this.arsenal.consumeMeleeHit()) this.resolveMelee();
      if (d.kind === 'saw' && this.input.attackHeld && chance(0.6)) {
        const pose = p.pose;
        const hx = pose.handR.x, hy = pose.handR.y;
        this.gore.sprayCone(hx, hy, p.aim, 0.9, 2, 220, 1.8);
      }
    } else if (d.kind === 'throw') {
      if (pressed) this.throwGrenade(false);
    } else if (d.kind === 'gun') {
      const auto = d.id === 'smg' || d.id === 'rifle';
      if (pressed || (auto && this.input.attackHeld)) this.playerShoot();
    }

    // reload hint
    if (d.kind === 'gun' && this.arsenal.state.mag === 0 && this.arsenal.state.reloading === 0 && this.arsenal.state.reserve > 0 && pressed) {
      this.reload();
    }
    if (pressed) this.input.attackPressed = false;
  }

  playerShoot() {
    const p = this.player;
    if (!p || !p.alive) return;
    const a = this.arsenal;
    const d = a.def, s = a.state;
    if (s.reloading > 0) return;
    if (s.mag <= 0) {
      this.audio.dryFire();
      if (s.reserve > 0) this.reload();
      return;
    }
    const shot = a.shoot(this.input.aim);
    if (!shot) return;
    const pose = p.pose;
    const hand = pose.handR;
    const m = {
      x: hand.x + Math.cos(p.aim) * (d.muzzle * 0.85),
      y: hand.y + Math.sin(p.aim) * (d.muzzle * 0.85),
    };
    p.recoilKick = 1;
    p.muzzleFlash = 1;
    this.addShake(d.shake);
    this.audio.shot(d.sound, 1);
    this.gore.casing(hand.x, hand.y, p.facing * 0.7, p.aim);
    this.gore.dust(m.x, m.y, 3, 7, 'rgba(190,190,180,');
    this.gore.spark(m.x, m.y, Math.cos(p.aim), Math.sin(p.aim), 3, '#ffd9a0');

    const pellets = shot.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const spreadAngle = p.aim + (Math.random() + Math.random() - 1) * shot.spread;
      this.resolveBullet(m.x, m.y, spreadAngle, shot, p, 'player');
    }
    p.vx -= Math.cos(p.aim) * d.recoil * 20;
    p.vy -= Math.sin(p.aim) * d.recoil * 8;
    // fire penalty to accuracy via recoil, handled in arsenal bloom
  }

  resolveBullet(ox, oy, angle, def, owner, tag) {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const range = def.range || 1800;
    let bestT = range;
    let bestHit = null;
    let hitBarrel = null;

    for (const a of this.actors) {
      if (a === owner) continue;
      const hit = a.rayHit(ox, oy, dx, dy, bestT, true);
      if (hit && hit.t < bestT) { bestT = hit.t; bestHit = hit; hitBarrel = null; }
    }
    for (const b of this.barrels) {
      if (!b.alive) continue;
      const bx = b.x, by = b.y - 34;
      const ex = bx - ox, ey = by - oy;
      const proj = ex * dx + ey * dy;
      if (proj < 0 || proj > bestT) continue;
      const px = ox + dx * proj - bx, py = oy + dy * proj - by;
      if (px * px + py * py < (b.radius + 3) * (b.radius + 3)) {
        bestT = proj; bestHit = null; hitBarrel = b;
      }
    }

    let endX = ox + dx * bestT, endY = oy + dy * bestT;
    if (bestHit) {
      const target = bestHit.actor;
      const wasAlive = target.alive;
      if (target.alive) {
        const res = target.takeDamage(def.damage, bestHit.part, bestHit.x, bestHit.y, angle, (def.damage || 20) * 22, {
          sever: def.sever || 0, weapon: def.name || 'BULLET', headshot: bestHit.part === 'head',
        });
        if (target !== this.player) {
          this.hud.hitmarker(res.dead);
          this.audio.hitmarker(res.dead);
        }
        if (res.severed) this.gore.bloodBurst(bestHit.x, bestHit.y, 320, 14);
        if (res.dead && res.part === 'head' && chance(0.6)) {
          this.gore.bloodMist(bestHit.x, bestHit.y, 46);
        }
        if (target === this.player) this.onPlayerHurt(def.damage, bestHit.x, bestHit.y);
        this.gore.sprayCone(bestHit.x, bestHit.y, angle, 0.5, 5, 260, 2.4);
      } else {
        target.hitCorpse(bestHit.x, bestHit.y, angle, def.damage * 16, def.damage);
        if (def.id === 'shotgun') {
          const rd = target.ragdoll;
          if (rd && chance(0.35)) {
            const links = rd.links.filter(l => !l.cut && ['upperArmL', 'upperArmR', 'thighL', 'thighR', 'foreArmL', 'foreArmR'].includes(l.name));
            if (links.length) {
              const l = pick(links);
              rd.cutBone(l.name);
              const pt = rd.points[l.b];
              if (pt) {
                this.limbs++;
                this.gore.bloodBurst(pt.x, pt.y, 200, 8);
                this.gore.gib(pt.x, pt.y, rand(180, -180), rand(-100, -300), 6, '#8a5a44');
              }
            }
          }
        }
      }
    } else if (hitBarrel) {
      this.damageBarrel(hitBarrel, def.damage);
    } else {
      // background wall / debris impact
      this.wallImpact(endX, endY, angle);
    }

    this.addTracer(ox, oy, endX, endY, def.tracer || 'pale');
    return { x: endX, y: endY, hit: bestHit, barrel: hitBarrel };
  }

  wallImpact(x, y, angle) {
    this.gore.spark(x, y, -Math.cos(angle), -Math.sin(angle), 5 + (Math.random() * 5 | 0), '#ffcf90');
    this.gore.dust(x, y, 2, 5);
    this.audio.impact(chance(0.25) ? 'metal' : 'concrete');
    const c = this.gore.dctx;
    c.save();
    c.fillStyle = 'rgba(10,8,7,.55)';
    c.beginPath(); c.arc(x, y, rand(3.2, 1.4), 0, TAU); c.fill();
    c.strokeStyle = 'rgba(35,30,26,.35)'; c.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const a = rand(TAU);
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * rand(12, 4), y + Math.sin(a) * rand(12, 4)); c.stroke();
    }
    c.restore();
  }

  reload() {
    const p = this.player;
    if (!p || !p.alive) return;
    if (this.arsenal.reload()) {
      this.audio.reloadClick(false);
      this.reloadTimer = 0;
    } else if (this.arsenal.def.kind === 'gun' && this.arsenal.state.mag === 0) {
      this.audio.dryFire();
    }
  }

  selectWeapon(i) {
    if (this.state !== 'playing' || !this.player || !this.player.alive) return;
    if (this.arsenal.select(i)) {
      this.audio.equip();
      this.player.weaponDef = this.arsenal.def;
      this.player.recoilKick = 0.7;
      this.arsenal.state.pump = 0;
    }
  }

  swapWeapon(dir = 1) {
    if (this.state !== 'playing' || !this.player || !this.player.alive) return;
    if (this.arsenal.cycle(dir)) {
      this.audio.equip();
      this.player.weaponDef = this.arsenal.def;
    }
  }

  toggleSlowmo() {
    this.slowmo = !this.slowmo;
    if (this.slowmo) this.slowTimer = 0.6;
    this.audio.ui();
  }

  jump() {
    const p = this.player;
    if (!p || !p.alive || !p.onGround || this.paused || this.deathTimer > 0) return;
    p.vy = -860;
    p.onGround = false;
    this.audio.footstep();
    this.gore.dust(p.x, p.y, 3, 6);
  }

  roll() {
    const p = this.player;
    if (!p || !p.alive || this.rollCd > 0 || this.paused || this.deathTimer > 0) return;
    this.rollCd = 0.85;
    this.invuln = 0.32;
    const dir = (this.input.keys.has('d') ? 1 : 0) - (this.input.keys.has('a') ? 1 : 0) || (Math.cos(p.aim) >= 0 ? 1 : -1);
    p.vx = dir * 760;
    p.vy = -150;
    p.crouch = 20;
    this.addShake(2);
    this.audio.swing();
  }

  nearestEnemy() {
    let best = null, bd = 1e9;
    const p = this.player;
    for (const a of this.actors) {
      if (!a.alive || a === p || a.type === 'dummy') continue;
      const d = Math.abs(a.x - p.x);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }

  resolveMelee() {
    const p = this.player;
    const d = this.arsenal.def;
    const chest = { x: p.x + Math.cos(p.aim) * 18, y: p.y - 108 + Math.sin(p.aim) * 12 };
    let hitAny = false;
    let hitAlive = false;
    let hitPoint = null;
    const range = d.range;

    for (const a of this.actors) {
      if (a === p) continue;
      let best = null;
      for (const s of a.hitSegments()) {
        if (!a.alive && s.part === 'head' && a.ragdoll?.links.find(x => x.name === 'neck')?.cut) continue;
        const q = pointSeg(chest.x, chest.y, s.ax, s.ay, s.bx, s.by);
        if (q.dist > range + s.r) continue;
        const ang = Math.atan2(q.y - chest.y, q.x - chest.x);
        let diff = Math.abs(((ang - p.aim + Math.PI * 3) % TAU) - Math.PI);
        if (diff > d.arc / 2) continue;
        if (!best || q.dist < best.dist) best = { q, s, part: s.part };
      }
      if (!best) continue;
      hitPoint = best.q;
      if (a.alive) {
        hitAlive = true;
        const dmg = d.damage;
        const res = a.takeDamage(dmg, best.part, best.q.x, best.q.y, p.aim, d.knock * (d.kind === 'saw' ? 0.2 : 1), {
          sever: d.sever, weapon: d.name, melee: true,
        });
        const kx = Math.cos(p.aim) * d.knock * 0.05;
        a.x = clampX(a.x + kx);
        a.stun = d.kind === 'sledge' ? 0.5 : 0.18;
        this.audio.flesh(true);
        this.hud.hitmarker(res.dead);
        this.audio.hitmarker(res.dead);
        if (res.severed) this.gore.bloodBurst(best.q.x, best.q.y, 380, 16);
        this.gore.sprayCone(best.q.x, best.q.y, p.aim, 0.8, 12, 380, 3.2);
      } else {
        this.chopCorpse(a, best);
      }
      hitAny = true;
      if (d.kind === 'saw') break;
    }

    // barrels
    for (const b of this.barrels) {
      if (!b.alive) continue;
      const q = pointSeg(chest.x, chest.y, b.x - 24, b.y - 60, b.x + 24, b.y - 6);
      const ang = Math.atan2(q.y - chest.y, q.x - chest.x);
      const diff = Math.abs(((ang - p.aim + Math.PI * 3) % TAU) - Math.PI);
      if (q.dist < range + 10 && diff < d.arc / 2) { this.damageBarrel(b, 60); hitAny = true; }
    }

    if (hitAny) {
      this.addShake(d.shake);
      this.hitstop = d.kind === 'sledge' ? 0.055 : 0.025;
      if (hitAlive) this.fx.flash(0.08, '255,240,220');
      if (hitPoint) {
        this.gore.bloodDrip(hitPoint.x, hitPoint.y, 4, 1.2, 220, { size: 3 });
      }
    } else {
      const ex = chest.x + Math.cos(p.aim) * (range + 10);
      const ey = chest.y + Math.sin(p.aim) * (range + 10);
      this.gore.dust(ex, ey, 2, 4);
      if (chance(0.5)) this.gore.spark(ex, ey, -Math.cos(p.aim), -Math.sin(p.aim), 2, '#cfc0a0');
    }
  }

  chopCorpse(a, best) {
    const rd = a.ragdoll;
    if (!rd) return;
    const links = rd.links.filter(l => !l.cut && ['upperArmL', 'upperArmR', 'thighL', 'thighR', 'foreArmL', 'foreArmR', 'neck'].includes(l.name));
    if (links.length && chance(0.72)) {
      const l = pick(links);
      rd.cutBone(l.name);
      a.limbsLost++;
      this.limbs++;
      const pt = rd.points[l.b];
      if (pt) {
        this.gore.bloodBurst(pt.x, pt.y, 340, 18);
        this.gore.bloodMist(pt.x, pt.y, 36);
        for (let i = 0; i < 3; i++) this.gore.gib(pt.x, pt.y, rand(300, -300), rand(-120, -360), rand(8, 3), pick(['#8a5a44', '#7a4030']), { bone: i === 0 });
        this.audio.squelch();
        if (l.name === 'neck') this.hud.killFeed('<b>DECAPITATED</b> · CORPSE', true);
      }
    } else {
      this.gore.bloodDrip(best.q.x, best.q.y, 6, 1.2, 200, { size: 3 });
      if (chance(0.5)) this.gore.gib(best.q.x, best.q.y, rand(180, -180), rand(-80, -260), rand(6, 3), '#8a5a44');
    }
    const aim = this.player ? this.player.aim : 0;
    a.ragdoll?.impulse(best.q.x, best.q.y, Math.cos(aim) * 2, -2, 0.8);
  }

  // ---------- enemies & waves ----------
  spawnDummy(x) {
    const a = new Actor({
      x: clampX(x), type: 'dummy', gore: this.gore, audio: this.audio,
      worldW: WORLD_W, groundY: GROUND, hp: 130,
      aim: Math.random() < 0.5 ? 0 : Math.PI,
    });
    a.onDeath = (act, info) => this.onActorDeath(act, info);
    this.actors.push(a);
    this.gore.dust(a.x, GROUND, 4, 8);
    return a;
  }

  spawnEnemy(type = 'thug', x = null) {
    const p = this.player;
    const cfg = {
      thug: { hp: 92, weapon: WEAPONS[4], speed: 155, w: 'MACHETE' },
      gunner: { hp: 88, weapon: this.wave > 4 && chance(0.5) ? WEAPONS[2] : WEAPONS[0], speed: 118, w: 'CARBINE' },
      brute: { hp: 235, weapon: WEAPONS[5], speed: 88, w: 'SLEDGE' },
    }[type] || { hp: 90, weapon: WEAPONS[4], speed: 150 };
    let sx = x;
    if (sx === null) {
      const left = p ? p.x - (this.viewW * 0.62 + rand(140, 20)) : rand(200, 100);
      const right = p ? p.x + (this.viewW * 0.62 + rand(140, 20)) : WORLD_W - 200;
      sx = chance(0.5) ? left : right;
      if (sx < 60) sx = right;
      if (sx > WORLD_W - 60) sx = left;
    }
    const a = new Actor({
      x: clampX(sx), type: 'enemy', enemyType: type, gore: this.gore, audio: this.audio,
      worldW: WORLD_W, groundY: GROUND, hp: cfg.hp + (this.mode === 'survive' ? this.wave * 6 : 0),
      weapon: cfg.weapon, aim: p ? Math.atan2((p.y - 118) - (GROUND - 130), p.x - sx) : 0,
      shirt: type === 'brute' ? '#3b3128' : undefined,
    });
    a.onDeath = (act, info) => this.onActorDeath(act, info);
    a.speed = cfg.speed;
    a.attackCd = rand(1.4, 0.4);
    a.swingHit = false;
    a.meleeProgress = -1;
    a.enemyType = type;
    this.actors.push(a);
    if (p) a.aim = Math.atan2((p.y - 118) - (a.y - 130), p.x - a.x);
    return a;
  }

  updateEnemy(a, dt, raw) {
    const p = this.player;
    if (!p || !p.alive) {
      a.vx = lerp(a.vx, 0, 1 - Math.exp(-dt * 4));
      a.x += a.vx * dt;
      return;
    }
    const dx = p.x - a.x;
    const adx = Math.abs(dx);
    const dy = (p.y - 118) - (a.y - 130);
    let aim = Math.atan2(dy, dx);
    const inaccuracy = 0.04 + Math.min(0.1, adx / 12000);
    a.aim = angleLerp(a.aim, aim + (chance(0.02) ? rand(inaccuracy, -inaccuracy) : 0), 1 - Math.exp(-dt * 5.5));

    let desired, speed;
    if (a.enemyType === 'gunner') { desired = 340; speed = a.speed; }
    else if (a.enemyType === 'brute') { desired = 72; speed = a.speed; }
    else { desired = 58; speed = a.speed; }
    let moveDir = 0;
    if (adx > desired + 45) moveDir = dx > 0 ? 1 : -1;
    else if (adx < desired - 55) moveDir = dx > 0 ? -1 : 1;
    else if (a.enemyType === 'gunner') moveDir = Math.sin(this.time * 0.9 + a.id) * 0.65;

    // flanking / separation
    let sep = 0;
    for (const o of this.actors) {
      if (o === a || !o.alive || o.type !== 'enemy') continue;
      const d = o.x - a.x;
      if (Math.abs(d) < 55) sep -= Math.sign(d) * (1 - Math.abs(d) / 55);
    }
    a.vx = lerp(a.vx, moveDir * speed + sep * 90, 1 - Math.exp(-dt * 6));
    a.x = clampX(a.x + a.vx * dt);
    a.y = GROUND; a.onGround = true;
    a.pose = null;

    // melee animation
    if (a.meleeProgress >= 0) {
      a.meleeProgress += dt / (a.enemyType === 'brute' ? 0.46 : 0.3);
      if (a.meleeProgress > 0.52 && !a.swingHit) {
        a.swingHit = true;
        if (adx < (a.enemyType === 'brute' ? 105 : 86) && Math.abs(p.y - a.y) < 90) {
          this.hurtPlayer(a.enemyType === 'brute' ? 26 : 13, p.x, p.y - 110, a.aim);
          this.audio.flesh(true);
        } else {
          this.gore.dust(a.x + Math.cos(a.aim) * 60, a.y - 100, 2, 4);
        }
      }
      if (a.meleeProgress >= 1) a.meleeProgress = -1;
    }

    // attack decisions
    if (a.attackCd <= 0) {
      if (a.enemyType === 'gunner') {
        if (adx < 950 && adx > 70 && Math.abs(dy) < 500) {
          this.enemyShoot(a);
          a.attackCd = rand(1.5, 0.75) * (this.wave > 6 ? 0.75 : 1);
        }
      } else {
        const reach = a.enemyType === 'brute' ? 94 : 74;
        if (adx < reach) {
          a.meleeProgress = 0.001;
          a.swingHit = false;
          a.attackCd = a.enemyType === 'brute' ? 1.6 : 1.05;
          this.audio.swing();
          a.vx += dx > 0 ? 60 : -60;
        } else {
          a.attackCd = 0.2;
        }
      }
    }
    if (a.attackCd > 0) a.attackCd -= dt;
    if (a.meleeProgress < 0) a.meleeProgress = -1;
  }

  enemyShoot(a) {
    const p = this.player;
    const pose = a.pose;
    if (!pose) return;
    const hand = pose.handR;
    const isSmg = a.weaponDef && a.weaponDef.id === 'smg';
    const spread = isSmg ? 0.1 : 0.055;
    const angle = Math.atan2((p.y - 112) - hand.y, p.x - hand.x) + (Math.random() + Math.random() - 1) * spread;
    const muzzle = {
      x: hand.x + Math.cos(angle) * 18, y: hand.y + Math.sin(angle) * 18,
    };
    a.muzzleFlash = 1;
    a.recoilKick = 1;
    this.audio.shot('enemy', 0.85);
    this.gore.casing(hand.x, hand.y, a.facing * 0.6, angle);
    this.gore.dust(muzzle.x, muzzle.y, 2, 5, 'rgba(180,180,170,');
    const def = {
      damage: isSmg ? 6 : 9, range: 1200, tracer: 'pale',
      name: a.enemyType === 'gunner' ? 'HOSTILE' : 'HOSTILE', id: 'enemy',
    };
    this.resolveBullet(muzzle.x, muzzle.y, angle, def, a, 'enemy');
  }

  hurtPlayer(amount, x, y, angle) {
    const p = this.player;
    if (!p || !p.alive || this.invuln > 0) return;
    this.onPlayerHurt(amount, x, y);
    p.takeDamage(amount, 'torso', x, y, angle, 220, { weapon: 'HOSTILE' });
    if (p.alive) this.audio.grunt();
  }

  onPlayerHurt(amount, x, y) {
    this.damageTimer = 0;
    this.fx.splatter(clamp(amount / 16, 0.4, 2.4));
    this.hud.flashDamage();
    this.addShake(Math.min(12, amount * 0.45));
    this.audio.flesh(true);
  }

  playerDied(a, info) {
    this.state = 'dying';
    this.deathTimer = 2.2;
    this.slowTimer = 1.5;
    this.saveBest();
    this.fx.splatter(3, true);
    this.hud.banner('SUBJECT EXPIRED', 'VITALS FLATLINED', 'danger');
    this.audio.death();
  }

  showDeathScreen() {
    if (this.state === 'dead') return;
    this.state = 'dead';
    document.getElementById('deathWave').textContent = this.mode === 'sandbox' ? '∞' : String(this.wave);
    document.getElementById('deathKills').textContent = String(this.kills);
    document.getElementById('deathLimbs').textContent = String(this.limbs);
    document.getElementById('death').classList.remove('hidden');
    this.hud.show(false);
    this.saveBest();
  }

  onActorDeath(a, info) {
    if (a === this.player) return;
    this.kills++;
    const severed = info.severed || (info.headExplode ? 'head' : null);
    if (severed) this.limbs++;
    const weapon = info.weapon || this.arsenal.def.name;
    let verb = 'ELIMINATED';
    if (a.type === 'dummy') verb = 'TARGET DOWN';
    if (weapon === 'GORE BOMB' || weapon === 'BARREL' || weapon === 'M67') verb = 'PULVERIZED';
    else if (severed === 'head' || info.headExplode) verb = 'DECAPITATED';
    else if (severed && (severed.startsWith('arm') || severed.startsWith('hand'))) verb = 'DISARMED';
    else if (severed && (severed.startsWith('leg') || severed.startsWith('shin'))) verb = 'DISLEGGED';
    else if (info.part === 'head') verb = 'HEADSHOT';
    else if (info.melee) verb = 'MELEED';
    const crit = verb === 'DECAPITATED' || verb === 'HEADSHOT' || verb === 'PULVERIZED' || verb === 'DISARMED';
    this.hud.killFeed(`<b>${verb}</b> · ${weapon}`, crit);
    this.audio.hitmarker(true);
    this.saveBest();
  }

  startWave(n) {
    this.wave = n;
    this.spawnClock = 0;
    this.spawnQueue.length = 0;
    this.betweenWaves = false;
    this.waveCooldown = 0;
    const count = Math.min(16, 3 + Math.floor(n * 1.85));
    let at = 0.2;
    for (let i = 0; i < count; i++) {
      at += rand(1.15, 0.35);
      let type = 'thug';
      const r = Math.random();
      if (n >= 3 && r < 0.18) type = 'brute';
      else if (r < 0.55) type = 'gunner';
      this.spawnQueue.push({ at, type, side: chance(0.5) ? 'left' : 'right' });
    }
    this.hud.banner(`WAVE ${String(n).padStart(2, '0')}`, `${count} HOSTILES INBOUND`, 'danger');
    this.audio.waveStart();
    this.audio.setMuted(this.audio.muted);
  }

  updateWaves(dt) {
    this.spawnClock += dt;
    while (this.spawnQueue.length && this.spawnQueue[0].at <= this.spawnClock) {
      const q = this.spawnQueue.shift();
      let x;
      if (q.side === 'left') {
        x = this.camX - rand(80, 180);
        if (x < 60) x = this.camX + this.viewW + rand(80, 180);
      } else {
        x = this.camX + this.viewW + rand(80, 180);
        if (x > WORLD_W - 60) x = this.camX - rand(80, 180);
      }
      this.spawnEnemy(q.type, clampX(x));
    }
    const alive = this.aliveEnemyCount();
    if (alive === 0 && this.spawnQueue.length === 0) {
      if (!this.betweenWaves) {
        this.betweenWaves = true;
        this.waveCooldown = 5;
        this.hud.banner('AREA CLEAR', 'REGROUP · ' + (this.wave + 1) + ' INBOUND');
        this.audio.waveStart();
        this.arsenal.addAmmo(1);
        this.saveBest();
      } else {
        this.waveCooldown -= dt;
        if (this.waveCooldown <= 0) this.startWave(this.wave + 1);
      }
    }
  }

  aliveEnemyCount() {
    let n = 0;
    for (const a of this.actors) if (a.alive && a.type === 'enemy') n++;
    return n;
  }

  // ---------- throwables & explosions ----------
  throwGrenade(quick = false) {
    const p = this.player;
    if (!p || !p.alive) return;
    const gs = this.arsenal.states.grenade;
    if (gs.reserve <= 0 || gs.cooldown > 0) { this.audio.dryFire(); return; }
    gs.reserve--;
    gs.cooldown = 1.15;
    const pose = p.pose;
    const hand = pose.handR;
    const angle = p.aim;
    this.grenades.push({
      x: hand.x + Math.cos(angle) * 16, y: hand.y + Math.sin(angle) * 16,
      vx: Math.cos(angle) * 760 + p.vx * 0.45,
      vy: Math.sin(angle) * 760 - 210,
      rot: 0, vr: rand(18, -18), fuse: 1.65,
    });
    p.recoilKick = 0.7;
    this.addShake(1.2);
    this.audio.swing();
    this.hud.killFeed('<b>FRAG OUT</b>', false);
  }

  damageBarrel(b, dmg) {
    if (!b.alive) return;
    b.hp -= dmg;
    this.gore.spark(b.x, b.y - 40, 0, -1, 5, '#ffc070');
    if (b.hp <= 0) {
      b.alive = false;
      this.explode(b.x, b.y - 30, 200, 140, 'BARREL');
    }
  }

  explode(x, y, radius = 200, damage = 150, label = 'EXPLOSION') {
    this.audio.explosion();
    this.addShake(17);
    this.fx.flash(clamp(1 - dist(x, y, this.camX + this.viewW / 2, this.camY + this.viewH / 2) / 1400, 0.08, 0.7), '255,210,150');
    this.gore.shockwave(x, y, radius * 1.45);
    this.gore.bloodMist(x, y, radius * 0.5);
    this.gore.dust(x, y, 18, 20, 'rgba(80,70,60,');
    this.gore.spark(x, y, 0, -0.4, 34, '#ffb060');
    for (let i = 0; i < 12; i++) {
      this.gore.gib(x + rand(radius * 0.3, -radius * 0.3), y + rand(60, -60), rand(540, -540), rand(-200, -700), rand(9, 3), pick(['#6d5140', '#8a5a44', '#5a3a2c']), { bone: i < 3 });
    }
    const c = this.gore.dctx;
    c.save();
    c.fillStyle = 'rgba(8,6,5,.6)';
    c.beginPath(); c.ellipse(x, GROUND - 2, radius * 0.8, radius * 0.13, 0, 0, TAU); c.fill();
    c.restore();

    for (const a of this.actors) {
      const chest = a.alive ? { x: a.x, y: a.y - 100 } : (a.pose?.hip || { x: a.x, y: a.y - 50 });
      const d = dist(x, y, chest.x, chest.y);
      if (d > radius + 60) continue;
      const fall = clamp(1 - d / (radius + 60), 0, 1);
      if (a === this.player && this.invuln > 0) continue;
      const ang = Math.atan2(chest.y - y, chest.x - x);
      if (a.alive) {
        const res = a.takeDamage(damage * (0.45 + fall * 0.9), 'torso', chest.x, chest.y, ang, 900 * fall + 200, {
          sever: 5, weapon: label, explodeHead: fall > 0.6 && chance(0.5),
        });
        if (a === this.player) this.onPlayerHurt(damage * fall, chest.x, chest.y);
        else if (res.dead) this.limbs += chance(0.8) ? 1 : 0;
      } else if (a.ragdoll) {
        a.ragdoll.impulse(chest.x, chest.y, Math.cos(ang) * fall * 18, Math.sin(ang) * fall * 18, 1.5);
        a.hitCorpse(chest.x, chest.y, ang, 500 * fall, 60);
      }
    }
    for (const b of this.barrels) {
      if (!b.alive) continue;
      if (dist(x, y, b.x, b.y - 30) < radius * 1.15) {
        b.alive = false;
        this.pendingBooms.push({ x: b.x, y: b.y - 30, radius: 190, damage: 130, label: 'BARREL', t: rand(0.22, 0.05) });
      }
    }
    // trigger death feedback for player caught in blast
    if (this.player && this.player.alive && dist(x, y, this.player.x, this.player.y - 100) < radius + 60) {
      this.fx.splatter(1.2);
    }
  }

  // ---------- rendering ----------
  render(raw) {
    const ctx = this.ctx;
    const c = this.camera;
    const dpr = this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#070606';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const k = c.scale * dpr;
    ctx.setTransform(k, 0, 0, k, -c.x * k, -c.y * k);
    const viewL = c.x - 60, viewR = c.x + c.w + 60;

    this.world.draw(ctx, this.time, c.x + c.w / 2);
    this.gore.drawDecals(ctx);
    this.gore.drawBehind(ctx);

    // barrels (behind actors)
    for (const b of this.barrels) {
      if (!b.alive) continue;
      if (b.x < viewL - 100 || b.x > viewR + 100) continue;
      this.drawBarrel(ctx, b);
    }

    // grenades on the floor / air
    for (const g of this.grenades) this.drawGrenade(ctx, g);

    // corpses first, then living fighters
    const dead = [], alive = [];
    for (const a of this.actors) {
      if (a.x < viewL || a.x > viewR) continue;
      (a.alive ? alive : dead).push(a);
    }
    dead.sort((a, b) => a.x - b.x);
    alive.sort((a, b) => (a === this.player ? 1 : 0) - (b === this.player ? 1 : 0) || a.x - b.x);
    for (const a of dead) a.draw(ctx);
    for (const a of alive) a.draw(ctx);

    this.gore.draw(ctx);

    // tracers
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const t of this.tracers) {
      const a = clamp(t.life / t.max, 0, 1);
      const col = t.color === 'amber' ? '255,196,110' : '255,225,185';
      ctx.strokeStyle = `rgba(${col},${(a * 0.45).toFixed(3)})`;
      ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke();
      ctx.strokeStyle = `rgba(255,250,240,${(a * 0.9).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke();
      ctx.fillStyle = `rgba(${col},${(a * 0.6).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(t.x2, t.y2, 2.6 * a, 0, TAU); ctx.fill();
    }
    // weapon lights
    for (const a of this.actors) {
      if (!a.muzzleFlash || !a.weaponDef) continue;
      const p = a.pose;
      if (!p) continue;
      const m = a.weaponDef.style === 'shotgun' ? 62 : a.weaponDef.style === 'rifle' ? 58 : a.weaponDef.style === 'smg' ? 42 : 30;
      const mx = p.handR.x + Math.cos(a.aim) * m;
      const my = p.handR.y + Math.sin(a.aim) * m;
      const r = 50 + a.muzzleFlash * 40;
      const g = ctx.createRadialGradient(mx, my, 2, mx, my, r);
      g.addColorStop(0, `rgba(255,220,150,${0.22 * a.muzzleFlash})`);
      g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(mx, my, r, 0, TAU); ctx.fill();
    }
    ctx.restore();

    this.world.drawForeground(ctx, this.time);

    // reset & screen effects
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.fx.draw();

    // subtle letterbox tint at top / bottom in menu mode
    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(4,3,4,.1)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  drawBarrel(ctx, b) {
    const x = b.x, y = b.y;
    ctx.save();
    const g = ctx.createRadialGradient(x, y + 4, 2, x, y + 4, 54);
    g.addColorStop(0, 'rgba(0,0,0,.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y + 4, 44, 10, 0, 0, TAU); ctx.fill();

    const body = ctx.createLinearGradient(x - 26, 0, x + 26, 0);
    body.addColorStop(0, '#2a100c');
    body.addColorStop(0.28, '#7d2416');
    body.addColorStop(0.5, '#a1321e');
    body.addColorStop(0.72, '#6d1f14');
    body.addColorStop(1, '#2a0e0a');
    ctx.fillStyle = body;
    ctx.fillRect(x - 25, y - 68, 50, 66);
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2;
    ctx.strokeRect(x - 25, y - 68, 50, 66);
    // bands
    ctx.fillStyle = 'rgba(20,14,12,.6)';
    ctx.fillRect(x - 26, y - 54, 52, 5);
    ctx.fillRect(x - 26, y - 20, 52, 5);
    // rim
    ctx.fillStyle = '#3b2c24';
    ctx.beginPath(); ctx.ellipse(x, y - 68, 25, 6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,180,120,.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y - 68, 20, 4.5, 0, 0, TAU); ctx.stroke();
    // hazard label
    ctx.fillStyle = 'rgba(210,180,90,.55)';
    ctx.beginPath();
    ctx.moveTo(x, y - 46); ctx.lineTo(x + 10, y - 30); ctx.lineTo(x - 10, y - 30);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(30,20,10,.8)';
    ctx.font = '700 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('!', x, y - 33);
    // rust
    ctx.fillStyle = 'rgba(60,30,18,.35)';
    ctx.fillRect(x + 14, y - 62, 6, 40);
    ctx.restore();
  }

  drawGrenade(ctx, g) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.rot);
    const blink = Math.sin(this.time * 24) > 0;
    if (blink) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gl = ctx.createRadialGradient(0, 0, 1, 0, 0, 22);
      gl.addColorStop(0, 'rgba(255,60,40,.5)');
      gl.addColorStop(1, 'rgba(255,20,10,0)');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#44502d';
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#222a16'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.stroke();
      ctx.rotate(0.4);
    }
    ctx.fillStyle = '#8d8f7a'; ctx.fillRect(-2, -10, 4, 4);
    if (blink) { ctx.fillStyle = '#ff3a28'; ctx.beginPath(); ctx.arc(0, -11, 1.8, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
}

// ---------- boot ----------
const game = new Game();
window.__game = game;
window.addEventListener('pointerdown', () => game.audio.init(), { once: true });
window.addEventListener('keydown', e => {
  if (e.key === 'Enter' && game.state === 'menu') game.startGame('survive');
  if (e.key === 'Enter' && game.state === 'dead') game.startGame(game.mode);
});
