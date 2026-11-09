import * as THREE from 'three';
import { FX } from './fx.js';
import { Sound } from './audio.js';
import { GoreNPC } from './npc.js';
import { WeaponDrop, WEAPON_DEFS, WEAPON_ICONS, buildWeaponMesh } from './weapons.js';
import { LOW, QUALITY, lit } from './quality.js';
import { buildWorld } from './world.js';
import { resolveWorldPosition } from './collision.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111116);
scene.fog = new THREE.Fog(0x111116, 8, 18);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 40);
// Low-end profile: no MSAA, low-power GPU hint, cheap precision, small buffer.
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: QUALITY.antialias,
  powerPreference: LOW ? 'low-power' : 'high-performance',
  precision: LOW ? QUALITY.precision : 'highp',
  stencil: false
});
const renderPixelRatio = () => Math.max(QUALITY.minPixelRatio, Math.min(devicePixelRatio || 1, 1) * QUALITY.pixelRatio);
renderer.setPixelRatio(renderPixelRatio());
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = QUALITY.shadows;
renderer.outputColorSpace = THREE.SRGBColorSpace;
if (!QUALITY.toneMapping) renderer.toneMapping = THREE.NoToneMapping;

// Two lights only (no shadow maps, no dynamic point light).
scene.add(new THREE.HemisphereLight(0xc4ccd6, 0x2a1a1a, 2.1));
const keyLight = new THREE.DirectionalLight(0xffdfc1, 2.1);
keyLight.position.set(-3.5, 7, 4.5);
keyLight.castShadow = QUALITY.shadows;
scene.add(keyLight);

let world = null;
let selectedMode = 'arena';
let selectedMap = 'room';
const worldBounds = () => world?.bounds || { x: 1.76, z: 1.76 };

const fx = new FX(scene);
const audio = new Sound();
const player = {
  group: new THREE.Group(), forward: new THREE.Vector3(0, 0, -1), facingYaw: 0,
  health: 100, maxHealth: 100, alive: true, speed: 3.45,
  takeDamage(amount) {
    if (!this.alive) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) this.alive = false;
  }
};
player.group.position.set(0, 0, 0.65);
scene.add(player.group);
camera.position.set(0, 1.62, 0);
player.group.add(camera);

const hands = new THREE.Group();
camera.add(hands);
const skinMat = lit(0x967064);
const sleeveMat = lit(0x28272a);
function makeForearm(side) {
  const arm = new THREE.Group();
  arm.position.set(side * 0.28, -0.34, -0.48);
  arm.rotation.z = side * -0.24;
  const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.33, 2, 5), sleeveMat);
  sleeve.rotation.x = -0.48;
  sleeve.position.set(0, -0.11, 0.08);
  arm.add(sleeve);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.16), skinMat);
  hand.position.set(0, -0.25, -0.04);
  hand.castShadow = false;
  arm.add(hand);
  hands.add(arm);
  return arm;
}
const armL = makeForearm(-1);
const armR = makeForearm(1);
let viewWeapon = null;
let swingT = 0;

const npcs = [];
let weapons = [];
let cash = 0;
let equipped = 'pistol';
let shotCooldown = 0;
const shopPrices = { pickaxe: 60, hatchet: 40 };
function configureWorld(mode, map) {
  if (world) scene.remove(world.root);
  selectedMode = mode;
  selectedMap = map;
  world = buildWorld(scene, mode, map);
  scene.background.setHex(world.sky);
  scene.fog.color.setHex(world.fog);
  scene.fog.near = mode === 'area' ? 18 : (map === 'island' ? 42 : 30);
  scene.fog.far = mode === 'area' ? 42 : (map === 'island' ? 180 : 90);
  for (const drop of weapons) drop.group.parent?.remove(drop.group);
  weapons = [];
  const placements = mode === 'area' ? [[-2.2, 0.3], [2.2, 1.8]] :
    map === 'island' ? [[-5.8, 1.8], [5.4, 2.5]] :
    map === 'tower' ? [[-7.5, 5.2], [7.2, 4.8]] : [[1.28, -0.9], [-0.7, 1.32]];
  weapons.push(new WeaponDrop('pickaxe', scene, fx, ...placements[0]));
  weapons.push(new WeaponDrop('hatchet', scene, fx, ...placements[1]));
  const start = mode === 'area' ? [0, 8.6] : map === 'island' ? [0, 5.4] : map === 'tower' ? [0, 8.2] : [0, 0.65];
  player.group.position.set(start[0], 0, start[1]);
  yaw = 0;
  pitch = 0;
  $('brand-sub').textContent = world.title;
  $('map-field').classList.toggle('hidden', mode !== 'sandbox');
}

function clearNPCs() {
  for (const npc of npcs) if (!npc.removed) { npc.removed = true; npc.dispose(); }
  npcs.length = 0;
}

function resetRun() {
  clearNPCs();
  if (heldNPC) heldNPC = null;
  if (heldWeapon) hands.remove(heldWeapon.group);
  heldWeapon = null;
  weapons = [];
  cash = 0;
  kills = 0;
  player.health = player.maxHealth;
  player.alive = true;
  shotCooldown = 0;
  hitCooldown = 0;
  fx.clear();
  syncViewWeapon();
  configureWorld($('mode-select').value, $('map-select').value);
  $('cash-count').textContent = '$0';
  $('kill-count').textContent = '0';
  $('state-label').textContent = 'READY';
  $('death').classList.add('hidden');
  $('shop').classList.add('hidden');
  yaw = 0;
  pitch = 0;
  player.group.rotation.y = 0;
  camera.rotation.set(0, 0, 0);
  refreshShop();
}
function makePistol() {
  const pistol = new THREE.Group();
  const metal = lit(0x34383d, { metalness: 0.55, roughness: 0.45 });
  const grip = lit(0x211c1a);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.38), metal);
  barrel.position.set(0, 0.04, -0.14);
  pistol.add(barrel);
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.27), lit(0x6a7074));
  slide.position.set(0, 0.12, -0.1);
  pistol.add(slide);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.13), grip);
  handle.position.set(0, -0.08, 0.02); handle.rotation.x = -0.18; pistol.add(handle);
  pistol.position.set(0.23, -0.28, -0.48);
  pistol.rotation.set(-0.08, 0, -0.04);
  pistol.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  return pistol;
}
let pistolView = makePistol();
hands.add(pistolView);
let heldNPC = null;
let heldWeapon = null;
let kills = 0;
let time = 0;
let shakeT = 0;
let hitCooldown = 0;
let inputLocked = false;
let yaw = 0;
let pitch = 0;
const keys = new Set();
const moveInput = new THREE.Vector2();
const game = {
  player, camera, npcs, time,
  shake(amount = 0.1) { shakeT = Math.max(shakeT, amount); },
  onPlayerHurt() {
    $('hurt-flash').classList.add('on');
    setTimeout(() => $('hurt-flash').classList.remove('on'), 90);
    audio.hurt();
    this.shake(0.18);
  },
  hitNPC(npc, damage, dir, opts = {}) {
    if (!npc || !npc.alive) return;
    const before = npc.health;
    npc.takeDamage(damage, dir, { knockback: opts.weapon ? WEAPON_DEFS[opts.weapon].knockback : (opts.thrownBody ? 3.2 : 1.7) });
    if (npc.health < before) {
      showHit();
      this.shake(damage > 24 ? 0.16 : 0.08);
      if (npc.state === 'dead') {
        kills++;
        cash += 25;
        $('cash-count').textContent = `$${cash}`;
        addFeed(`${opts.weapon === 'pistol' ? '9MM' : (opts.weapon ? WEAPON_DEFS[opts.weapon].name : 'PUNCH')} · GORE DOWN · +$25`);
      }
    }
  }
};

function showHit() {
  const marker = $('hitmarker');
  marker.classList.remove('show');
  void marker.offsetWidth;
  marker.classList.add('show');
}
function addFeed(text) {
  const feed = $('feed');
  const row = document.createElement('div');
  row.innerHTML = `<b>✕</b> ${text}`;
  feed.prepend(row);
  while (feed.children.length > 3) feed.lastElementChild.remove();
}
function setWeapon(kind) {
  equipped = kind;
  const def = WEAPON_DEFS[kind];
  $('weapon-name').textContent = kind === 'pistol' ? '9MM SIDEARM' : def.name;
  $('weapon-dmg').textContent = kind === 'pistol' ? '34 DMG' : `${def.damage} DMG`;
  $('weapon-spd').textContent = kind === 'pistol' ? 'SEMI-AUTO' : def.speed;
  $('weapon-icon').innerHTML = kind === 'pistol' ? '<span class="pistol-icon">▰</span>' : WEAPON_ICONS[kind];
  $('weapon-bar-fill').style.width = `${kind === 'pistol' ? 64 : Math.min(100, 25 + def.damage * 1.9)}%`;
}
function syncViewWeapon() {
  if (viewWeapon) { hands.remove(viewWeapon); viewWeapon = null; }
  pistolView.visible = !heldWeapon;
  if (!heldWeapon) { setWeapon('pistol'); return; }
  viewWeapon = buildWeaponMesh(heldWeapon.kind);
  viewWeapon.scale.setScalar(0.72);
  viewWeapon.position.set(0.27, -0.32, -0.54);
  viewWeapon.rotation.set(-0.2, 0.12, -0.38);
  viewWeapon.traverse(o => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
  hands.add(viewWeapon);
}
function useWeapon(kind) {
  audio.pickup();
  if (heldWeapon) {
    heldWeapon.dropToGround(player.group.position.clone().add(new THREE.Vector3(0.35, 0, 0.2)), yaw);
  }
  if (heldNPC) releaseNPC();
  heldWeapon = kind;
  heldWeapon.attach(hands);
  syncViewWeapon();
  setWeapon(kind.kind);
  $('state-label').textContent = 'ARMED';
}
function spawnNPC() {
  if (!player.alive || npcs.filter(n => n.alive).length >= QUALITY.maxNPCs) return;
  const angle = Math.random() * Math.PI * 2;
  const radius = 1.35 + Math.random() * 0.25;
  const x = THREE.MathUtils.clamp(player.group.position.x + Math.cos(angle) * radius, -1.55, 1.55);
  const z = THREE.MathUtils.clamp(player.group.position.z + Math.sin(angle) * radius, -1.55, 1.55);
  npcs.push(new GoreNPC(scene, fx, audio, x, z, { scale: 0.92 + Math.random() * 0.16 }));
  audio.spawn();
  addFeed('GORE NPC · SPAWNED');
}

function nearestTarget(maxDist = 1.65) {
  const p = player.group.position;
  let best = null, bestScore = Infinity;
  const consider = (obj, point, type) => {
    const dx = point.x - p.x, dz = point.z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist > maxDist) return;
    const dot = (dx * player.forward.x + dz * player.forward.z) / Math.max(dist, 0.001);
    if (dot < -0.25) return;
    const score = dist + (dot < 0.15 ? 0.55 : 0);
    if (score < bestScore) { best = { obj, type, dist }; bestScore = score; }
  };
  for (const npc of npcs) if (npc.alive && npc.state !== 'grabbed') consider(npc, npc.group.position, 'npc');
  for (const weapon of weapons) if (weapon.state === 'ground') consider(weapon, weapon.group.position, 'weapon');
  return best;
}
function releaseNPC() {
  if (!heldNPC) return;
  heldNPC.release();
  heldNPC = null;
  $('state-label').textContent = heldWeapon ? 'ARMED' : 'READY';
}
function interact() {
  if (!player.alive) return;
  if (heldNPC) { releaseNPC(); audio.grab(); return; }
  const target = nearestTarget(1.7);
  if (!target) return;
  if (target.type === 'weapon') {
    useWeapon(target.obj);
  } else {
    heldNPC = target.obj;
    heldNPC.setGrabbed(player);
    audio.grab();
    $('state-label').textContent = 'GRABBING';
  }
}
function throwHeld() {
  if (heldNPC) {
    heldNPC.throwIt(player.forward.clone());
    heldNPC = null;
    audio.throw();
    $('state-label').textContent = heldWeapon ? 'ARMED' : 'READY';
  } else if (heldWeapon) {
    const def = WEAPON_DEFS[heldWeapon.kind];
    heldWeapon.throwFrom(player.group.position.clone().add(new THREE.Vector3(0, 1.15, 0)), player.forward.clone());
    heldWeapon = null;
    syncViewWeapon();
    setWeapon('fist');
    $('state-label').textContent = 'READY';
    audio.throw();
  }
}
function dropWeapon() {
  if (!heldWeapon) return;
  heldWeapon.dropToGround(player.group.position.clone().add(new THREE.Vector3(0.3, 0, 0.25)), yaw);
  heldWeapon = null;
  syncViewWeapon();
  setWeapon('fist');
  $('state-label').textContent = 'READY';
  audio.ui();
}
function attack() {
  if (!player.alive) return;
  if (!heldWeapon) {
    if (shotCooldown > 0) return;
    shotCooldown = 0.3;
    audio.pistol();
    swingT = 0.12;
    let target = null, bestAlong = Infinity;
    const origin = player.group.position;
    for (const npc of npcs) {
      if (!npc.alive || npc.state === 'grabbed') continue;
      const dx = npc.group.position.x - origin.x, dz = npc.group.position.z - origin.z;
      const along = dx * player.forward.x + dz * player.forward.z;
      const lateral = Math.abs(dx * player.forward.z - dz * player.forward.x);
      if (along < 0 || along > 24 || lateral > 0.38 + along * 0.018) continue;
      if (along < bestAlong) { target = npc; bestAlong = along; }
    }
    if (target) {
      game.hitNPC(target, 34, player.forward, { weapon: 'pistol' });
      fx.bloodBurst(target.group.position.clone().setY(1.08), player.forward, 10, 0.75);
    }
    return;
  }
  if (hitCooldown > 0) return;
  const kind = heldWeapon?.kind || 'fist';
  const def = WEAPON_DEFS[kind];
  hitCooldown = def.cooldown;
  swingT = 0.24;
  if (kind === 'fist') audio.punch(); else audio.swing();
  const origin = player.group.position;
  let target = null, best = Infinity;
  for (const npc of npcs) {
    if (!npc.alive || npc.state === 'grabbed') continue;
    const dx = npc.group.position.x - origin.x, dz = npc.group.position.z - origin.z;
    const dist = Math.hypot(dx, dz);
    if (dist > def.range + (npc.baseScale * 0.22)) continue;
    const dot = (dx * player.forward.x + dz * player.forward.z) / Math.max(dist, 0.001);
    if (dot < 0.28) continue;
    if (dist < best) { target = npc; best = dist; }
  }
  if (target) {
    game.hitNPC(target, def.damage, player.forward, { weapon: kind });
    fx.bloodBurst(target.group.position.clone().setY(1.08), player.forward, kind === 'fist' ? 8 : 13, kind === 'fist' ? 0.65 : 1.05);
    if (kind !== 'fist') fx.slash(target.group.position.clone(), yaw, kind === 'pickaxe' ? 0xffb15c : 0xe9d2bc);
    if (kind !== 'fist') audio.hit();
  } else {
    fx.slash(origin.clone().addScaledVector(player.forward, 0.62).setY(1.05), yaw, kind === 'fist' ? 0xcaa88b : 0xffb15c);
  }
}

function updatePrompt() {
  const prompt = $('prompt');
  if (heldNPC) {
    prompt.classList.add('show');
    $('prompt-text').textContent = 'RELEASE NPC';
  } else {
    const target = nearestTarget(1.7);
    prompt.classList.toggle('show', !!target);
    if (target) $('prompt-text').textContent = target.type === 'npc' ? 'GRAB GORE' : `PICK UP ${target.obj.kind.toUpperCase()}`;
  }
  $('crosshair').classList.toggle('hot', !!nearestTarget(1.7));
}

function updateHud() {
  const hp = Math.max(0, player.health);
  $('hp-number').textContent = String(Math.ceil(hp));
  $('hp-fill').style.width = `${hp}%`;
  $('threat-label').textContent = `THREAT ${npcs.filter(n => n.alive && n.state !== 'grabbed').length}`;
  $('npc-count').textContent = String(npcs.filter(n => n.alive).length);
  $('kill-count').textContent = String(kills);
  if (!player.alive && !$('death').classList.contains('hidden')) return;
  if (!player.alive) {
    $('death-stats').textContent = `KILLS ${kills} · GORE ${npcs.filter(n => n.alive).length}`;
    $('death').classList.remove('hidden');
    audio.death();
    document.exitPointerLock?.();
  }
}

function requestPointerLock() {
  if (matchMedia('(pointer: coarse)').matches || typeof canvas.requestPointerLock !== 'function') return;
  try {
    // Pointer lock is unavailable in some embedded/mobile contexts and may
    // reject asynchronously. Mouse look should never prevent the game starting.
    const request = canvas.requestPointerLock();
    request?.catch(() => {});
  } catch {}
}

function startGame() {
  audio.unlock();
  $('start').classList.add('hidden');
  $('death').classList.add('hidden');
  document.body.classList.add('playing');
  if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
  if (npcs.filter(n => n.alive).length === 0) spawnNPC();
  requestPointerLock();
}
$('start-btn').addEventListener('click', startGame);
$('respawn-btn').addEventListener('click', () => {
  player.health = player.maxHealth;
  player.alive = true;
  player.group.position.set(0, 0, 0.65);
  yaw = 0; pitch = 0;
  kills = 0;
  for (const npc of npcs) if (!npc.removed) { npc.removed = true; npc.dispose(); }
  npcs.length = 0;
  fx.clear();
  heldNPC = null;
  if (heldWeapon) { heldWeapon.dropToGround(new THREE.Vector3(0.5, 0, 0.5)); heldWeapon = null; syncViewWeapon(); }
  $('death').classList.add('hidden');
  spawnNPC();
  audio.unlock();
  requestPointerLock();
});
$('mute').addEventListener('click', () => {
  audio.setMuted(!audio.muted);
  $('mute').textContent = audio.muted ? 'SOUND OFF' : 'SOUND ON';
});

window.addEventListener('keydown', (event) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  keys.add(event.code);
  if (event.repeat || !$('start').classList.contains('hidden')) return;
  if (event.code === 'KeyE') interact();
  if (event.code === 'KeyF') throwHeld();
  if (event.code === 'KeyQ') dropWeapon();
  if (event.code === 'KeyR') spawnNPC();
  if (event.code === 'Space') attack();
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());
window.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement === canvas && player.alive) {
    yaw -= event.movementX * 0.0022;
    pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.0018, -1.2, 1.2);
  }
});
document.addEventListener('pointerlockchange', () => { inputLocked = document.pointerLockElement === canvas; });
canvas.addEventListener('click', () => {
  if (document.body.classList.contains('playing') && player.alive && !inputLocked) requestPointerLock();
});
canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('mousedown', event => {
  if (event.button === 0 && document.body.classList.contains('playing') && inputLocked) attack();
});

// Touch look uses a drag anywhere on the world, while the virtual stick handles movement.
let lookPointer = null;
let lastLookX = 0;
let lastLookY = 0;
canvas.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'touch' || !document.body.classList.contains('playing')) return;
  lookPointer = event.pointerId;
  lastLookX = event.clientX;
  lastLookY = event.clientY;
});
window.addEventListener('pointermove', event => {
  if (event.pointerId !== lookPointer) return;
  const dx = event.clientX - lastLookX;
  const dy = event.clientY - lastLookY;
  lastLookX = event.clientX;
  lastLookY = event.clientY;
  yaw -= dx * 0.006;
  pitch = THREE.MathUtils.clamp(pitch - dy * 0.0045, -1.05, 1.05);
});
window.addEventListener('pointerup', event => { if (event.pointerId === lookPointer) lookPointer = null; });
window.addEventListener('pointercancel', event => { if (event.pointerId === lookPointer) lookPointer = null; });

const stick = $('stick');
const stickKnob = $('stick-knob');
let stickPointer = null;
function updateStick(event) {
  const rect = stick.getBoundingClientRect();
  const radius = rect.width * 0.34;
  const dx = event.clientX - (rect.left + rect.width * 0.5);
  const dy = event.clientY - (rect.top + rect.height * 0.5);
  const len = Math.hypot(dx, dy);
  const scale = len > radius ? radius / len : 1;
  const x = dx * scale;
  const y = dy * scale;
  stickKnob.style.transform = `translate(${x}px, ${y}px)`;
  moveInput.set(x / radius, -y / radius);
  if (moveInput.length() > 1) moveInput.normalize();
}
stick.addEventListener('pointerdown', event => {
  event.preventDefault();
  stickPointer = event.pointerId;
  stick.setPointerCapture(event.pointerId);
  updateStick(event);
});
stick.addEventListener('pointermove', event => {
  if (event.pointerId === stickPointer) updateStick(event);
});
function releaseStick(event) {
  if (event.pointerId !== stickPointer) return;
  stickPointer = null;
  moveInput.set(0, 0);
  stickKnob.style.transform = '';
}
stick.addEventListener('pointerup', releaseStick);
stick.addEventListener('pointercancel', releaseStick);

function bindTouchButton(id, action) {
  $(id).addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();
    if (player.alive && document.body.classList.contains('playing')) action();
  });
}
bindTouchButton('btn-spawn', spawnNPC);
bindTouchButton('btn-grab', interact);
bindTouchButton('btn-throw', throwHeld);
bindTouchButton('btn-attack', attack);

function update(dt) {
  time += dt;
  game.time = time;
  const playing = document.body.classList.contains('playing') && player.alive;
  hitCooldown = Math.max(0, hitCooldown - dt);
  swingT = Math.max(0, swingT - dt);

  player.group.rotation.y = yaw;
  player.forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  camera.rotation.x = pitch;

  if (playing) {
    const keyboard = new THREE.Vector2(
      (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0),
      (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0)
    );
    const input = moveInput.clone().add(keyboard);
    if (input.length() > 1) input.normalize();
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    player.group.position.addScaledVector(forward, input.y * player.speed * dt);
    player.group.position.addScaledVector(right, input.x * player.speed * dt);
    player.group.position.x = THREE.MathUtils.clamp(player.group.position.x, -1.76, 1.76);
    player.group.position.z = THREE.MathUtils.clamp(player.group.position.z, -1.76, 1.76);
  }

  if (heldNPC && player.alive) heldNPC.setGrabbed(player);
  for (const npc of npcs) npc.update(dt, game);
  for (const weapon of weapons) weapon.update(dt, time, game);
  fx.update(dt, time);

  const targetArm = swingT > 0 ? -1.25 * (swingT / 0.24) : 0;
  armR.rotation.x += (targetArm - armR.rotation.x) * Math.min(1, dt * 18);
  armL.rotation.x += ((heldNPC ? -0.5 : 0) - armL.rotation.x) * Math.min(1, dt * 10);
  if (viewWeapon) viewWeapon.rotation.x = -0.2 + (swingT > 0 ? -0.7 * (swingT / 0.24) : 0);

  if (shakeT > 0) {
    const amount = shakeT;
    camera.position.set((Math.random() - 0.5) * amount * 0.16, 1.62 + (Math.random() - 0.5) * amount * 0.12, 0);
    camera.rotation.z = (Math.random() - 0.5) * amount * 0.1;
    shakeT = Math.max(0, shakeT - dt * 1.8);
  } else {
    camera.position.set(0, 1.62, 0);
    camera.rotation.z = 0;
  }

  updatePrompt();
  updateHud();
  renderer.render(scene, camera);
}

let lastFrame = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  update(dt);
}
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(renderPixelRatio());
});
requestAnimationFrame(frame);
