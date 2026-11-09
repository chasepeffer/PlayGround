import * as THREE from 'three';
import { FX } from './fx.js';
import { Sound } from './audio.js';
import { GoreNPC } from './npc.js';
import { WeaponDrop, WEAPON_DEFS, WEAPON_ICONS, buildWeaponMesh } from './weapons.js';
import { LOW, QUALITY, lit } from './quality.js';

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

const concrete = lit(0x555155);
const wallMat = lit(0x39383d);
const floor = new THREE.Mesh(new THREE.BoxGeometry(4, 0.16, 4), concrete);
floor.position.y = -0.08;
floor.receiveShadow = false;
scene.add(floor);
// Exactly two plain, untextured boundary walls; the other edges are open.
const wallBack = new THREE.Mesh(new THREE.BoxGeometry(4, 2.8, 0.16), wallMat);
wallBack.position.set(0, 1.32, -2.08);
wallBack.receiveShadow = false;
wallBack.castShadow = false;
scene.add(wallBack);
const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.8, 4), wallMat);
wallLeft.position.set(-2.08, 1.32, 0);
wallLeft.receiveShadow = false;
wallLeft.castShadow = false;
scene.add(wallLeft);
// Bare arena slab with restrained edge markings (geometry, not textures).
const edgeMat = new THREE.MeshBasicMaterial({ color: 0x8e3231, transparent: true, opacity: 0.65 });
for (const [x, z, sx, sz] of [[0, 1.94, 3.85, 0.018], [1.94, 0, 0.018, 3.85]]) {
  const line = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.008, sz), edgeMat);
  line.position.set(x, 0.006, z);
  scene.add(line);
}

// A roomy sandbox and a chain of separated survival islands share the original pit.
const mapGround = new THREE.Mesh(new THREE.PlaneGeometry(54, 54), lit(0x485044));
mapGround.rotation.x = -Math.PI / 2;
mapGround.position.y = -0.19;
mapGround.visible = false;
scene.add(mapGround);
const ocean = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), lit(0x152d38));
ocean.rotation.x = -Math.PI / 2;
ocean.position.y = -1.15;
scene.add(ocean);
const islandPositions = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(24, 0, 0), new THREE.Vector3(0, 0, 24), new THREE.Vector3(-24, 0, 0)];
const islandGroups = [];
const resourceNodes = [];
let mode = 'sandbox';
let currentIsland = 0;
let wave = 0;
let waveDelay = 0;
const resources = { wood: 0, stone: 0 };
const inventory = { pickaxe: null, hatchet: null, pistol: null, rifle: null };
const slotKinds = ['fist', 'pickaxe', 'hatchet', 'pistol', 'rifle'];
function makeResource(type, x, z, island) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  let mesh;
  if (type === 'wood') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.25, 5), lit(0x67452b));
    trunk.position.y = 0.62;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.5, 6), lit(0x405b36));
    crown.position.y = 1.75;
    group.add(trunk, crown);
    mesh = crown;
  } else {
    mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.58, 0), lit(0x777a78));
    mesh.position.y = 0.48;
    mesh.scale.set(1.1, 0.8, 0.9);
    group.add(mesh);
  }
  scene.add(group);
  const node = { type, group, mesh, health: 3, island, active: true };
  resourceNodes.push(node);
  return node;
}
for (let i = 0; i < islandPositions.length; i++) {
  const p = islandPositions[i];
  const group = new THREE.Group();
  group.position.copy(p);
  const land = new THREE.Mesh(new THREE.BoxGeometry(18, 0.55, 18), lit(i === 0 ? 0x56604a : 0x62604b));
  land.position.y = -0.38;
  group.add(land);
  const shore = new THREE.Mesh(new THREE.BoxGeometry(18.2, 0.12, 18.2), lit(0x8c7958));
  shore.position.y = -0.66;
  group.add(shore);
  scene.add(group);
  islandGroups.push(group);
  for (const [type, x, z] of [['wood', -5.3, -4.4], ['wood', 5.2, -4.5], ['stone', -5, 4.7], ['stone', 5.1, 4.5], ['wood', 0.8, 6.1]]) makeResource(type, p.x + x, p.z + z, i);
}

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
const weapons = [
  new WeaponDrop('pickaxe', scene, fx, -1.25, -0.9),
  new WeaponDrop('hatchet', scene, fx, -0.55, -0.9),
  new WeaponDrop('pistol', scene, fx, 0.25, -0.9),
  new WeaponDrop('rifle', scene, fx, 1.05, -0.9)
];
for (const weapon of weapons) {
  weapon.island = 0;
  weapon.ammo = WEAPON_DEFS[weapon.kind].ammo || 0;
}
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
        addFeed(`${opts.weapon ? WEAPON_DEFS[opts.weapon].name : 'PUNCH'} · GORE DOWN`);
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
function renderInventory() {
  const root = $('inventory-slots');
  root.innerHTML = '';
  slotKinds.forEach((kind, index) => {
    const item = kind === 'fist' || inventory[kind];
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = `inventory-slot${item ? '' : ' empty'}${(heldWeapon?.kind || 'fist') === kind ? ' selected' : ''}`;
    slot.setAttribute('aria-label', `${index + 1}: ${kind}${item && inventory[kind]?.ammo != null ? `, ${inventory[kind].ammo} rounds` : ''}`);
    slot.innerHTML = `<span class="slot-key">${index + 1}</span><span class="slot-icon">${WEAPON_ICONS[kind]}</span>`;
    slot.addEventListener('click', () => equipSlot(kind));
    root.append(slot);
  });
}
function updateInventoryHud() {
  $('resource-count').textContent = `${resources.wood} / ${resources.stone}`;
  const item = heldWeapon;
  $('ammo-label').textContent = item && WEAPON_DEFS[item.kind].magazine
    ? `AMMO ${item.ammo} · ${WEAPON_DEFS[item.kind].magazine} MAG` : (item ? 'MELEE' : 'MELEE');
  $('travel-btn').disabled = mode !== 'survival' || resources.wood < 2 || resources.stone < 1;
  renderInventory();
}
function setWeapon(kind) {
  const def = WEAPON_DEFS[kind];
  $('weapon-name').textContent = def.name;
  $('weapon-dmg').textContent = `${def.damage} DMG`;
  $('weapon-spd').textContent = def.speed;
  $('weapon-icon').innerHTML = WEAPON_ICONS[kind];
  $('weapon-bar-fill').style.width = `${Math.min(100, 25 + def.damage * 1.9)}%`;
  updateInventoryHud();
}
function syncViewWeapon() {
  if (viewWeapon) { hands.remove(viewWeapon); viewWeapon = null; }
  if (!heldWeapon) return;
  viewWeapon = buildWeaponMesh(heldWeapon.kind);
  viewWeapon.scale.setScalar(0.72);
  viewWeapon.position.set(0.27, -0.32, -0.54);
  viewWeapon.rotation.set(-0.2, 0.12, -0.38);
  viewWeapon.traverse(o => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
  hands.add(viewWeapon);
}
function equipSlot(kind) {
  if (kind !== 'fist' && !inventory[kind]) return;
  if (heldNPC) releaseNPC();
  if (heldWeapon) {
    hands.remove(heldWeapon.group);
    heldWeapon.state = 'inventory';
  }
  heldWeapon = kind === 'fist' ? null : inventory[kind];
  if (heldWeapon) heldWeapon.attach(hands);
  syncViewWeapon();
  setWeapon(kind);
  $('state-label').textContent = heldWeapon ? 'ARMED' : 'READY';
  audio.ui();
}
function useWeapon(drop) {
  audio.pickup();
  const kind = drop.kind;
  drop.state = 'inventory';
  drop.group.visible = false;
  if (inventory[kind] && inventory[kind] !== drop) {
    inventory[kind].dropToGround(player.group.position.clone().add(new THREE.Vector3(0.4, 0, 0.2)), yaw);
  }
  inventory[kind] = drop;
  equipSlot(kind);
  addFeed(`${WEAPON_DEFS[kind].name} · EQUIPPED`);
}
function spawnNPC() {
  if (!player.alive || npcs.filter(n => n.alive).length >= QUALITY.maxNPCs) return;
  const center = islandPositions[currentIsland];
  const angle = Math.random() * Math.PI * 2;
  const radius = mode === 'sandbox' ? 1.35 + Math.random() * 0.25 : 4.5 + Math.random() * 2.5;
  const limit = mode === 'sandbox' ? 1.55 : 7.8;
  const x = THREE.MathUtils.clamp(player.group.position.x + Math.cos(angle) * radius, center.x - limit, center.x + limit);
  const z = THREE.MathUtils.clamp(player.group.position.z + Math.sin(angle) * radius, center.z - limit, center.z + limit);
  npcs.push(new GoreNPC(scene, fx, audio, x, z, {
    scale: 0.92 + Math.random() * 0.16,
    bounds: mode === 'sandbox' ? 1.66 : 8.2,
    center
  }));
  audio.spawn();
  addFeed(mode === 'survival' ? `WAVE ${wave} · GORE SPAWNED` : 'GORE NPC · SPAWNED');
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
  for (const weapon of weapons) if (weapon.state === 'ground' && (mode === 'sandbox' || weapon.island === currentIsland)) consider(weapon, weapon.group.position, 'weapon');
  for (const node of resourceNodes) if (node.active && (mode === 'sandbox' || node.island === currentIsland)) consider(node, node.group.position, 'resource');
  return best;
}
function releaseNPC() {
  if (!heldNPC) return;
  heldNPC.release();
  heldNPC = null;
  $('state-label').textContent = heldWeapon ? 'ARMED' : 'READY';
}
function gatherNode(node) {
  if (!node.active) return;
  if (node.type === 'wood' && !inventory.hatchet) { addFeed('NEED A HATCHET'); return; }
  if (node.type === 'stone' && !inventory.pickaxe) { addFeed('NEED A PICKAXE'); return; }
  node.health--;
  audio.swing();
  fx.slash(node.group.position.clone().setY(0.8), yaw, node.type === 'wood' ? 0x9bc779 : 0xc5cbd0);
  if (node.health <= 0) {
    node.active = false;
    node.group.visible = false;
    resources[node.type] += node.type === 'wood' ? 3 : 2;
    updateInventoryHud();
    addFeed(`+${node.type === 'wood' ? 3 : 2} ${node.type.toUpperCase()}`);
    audio.pickup();
  }
}
function interact() {
  if (!player.alive) return;
  if (heldNPC) { releaseNPC(); audio.grab(); return; }
  const target = nearestTarget(1.9);
  if (!target) return;
  if (target.type === 'weapon') useWeapon(target.obj);
  else if (target.type === 'resource') gatherNode(target.obj);
  else {
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
  if (!player.alive || hitCooldown > 0) return;
  const kind = heldWeapon?.kind || 'fist';
  const def = WEAPON_DEFS[kind];
  hitCooldown = def.cooldown;
  const origin = player.group.position;
  let target = null, best = Infinity;
  for (const npc of npcs) {
    if (!npc.alive || npc.state === 'grabbed') continue;
    const dx = npc.group.position.x - origin.x, dz = npc.group.position.z - origin.z;
    const dist = Math.hypot(dx, dz);
    if (dist > def.range + (npc.baseScale * 0.22)) continue;
    const dot = (dx * player.forward.x + dz * player.forward.z) / Math.max(dist, 0.001);
    if (dot < (def.magazine ? 0.975 : 0.28)) continue;
    if (dist < best) { target = npc; best = dist; }
  }
  if (def.magazine) {
    if (!heldWeapon || heldWeapon.ammo <= 0) { addFeed('OUT OF AMMO'); audio.ui(); return; }
    heldWeapon.ammo--;
    updateInventoryHud();
    audio.swing();
    fx.slash(origin.clone().addScaledVector(player.forward, 0.65).setY(1.25), yaw, 0xffb15c);
    if (target) {
      game.hitNPC(target, def.damage, player.forward, { weapon: kind });
      fx.bloodBurst(target.group.position.clone().setY(1.08), player.forward, 10, 0.9);
    }
    return;
  }
  swingT = 0.24;
  if (kind === 'fist') audio.punch(); else audio.swing();
  if (target) {
    game.hitNPC(target, def.damage, player.forward, { weapon: kind });
    fx.bloodBurst(target.group.position.clone().setY(1.08), player.forward, kind === 'fist' ? 8 : 13, kind === 'fist' ? 0.65 : 1.05);
    if (kind !== 'fist') fx.slash(target.group.position.clone(), yaw, kind === 'pickaxe' ? 0xffb15c : 0xe9d2bc);
    if (kind !== 'fist') audio.hit();
  } else {
    const nodeTarget = nearestTarget(def.range);
    if (nodeTarget?.type === 'resource' && nodeTarget.dist <= def.range) gatherNode(nodeTarget.obj);
    else fx.slash(origin.clone().addScaledVector(player.forward, 0.62).setY(1.05), yaw, kind === 'fist' ? 0xcaa88b : 0xffb15c);
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
    if (target) $('prompt-text').textContent = target.type === 'npc' ? 'GRAB GORE'
      : target.type === 'resource' ? `GATHER ${target.obj.type.toUpperCase()}` : `PICK UP ${target.obj.kind.toUpperCase()}`;
  }
  $('crosshair').classList.toggle('hot', !!nearestTarget(1.9));
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

function updateIslandVisibility() {
  islandGroups.forEach((group, index) => { group.visible = mode === 'survival' || index === 0; });
  resourceNodes.forEach(node => { node.group.visible = node.active && (mode === 'sandbox' || node.island === currentIsland); });
  weapons.forEach(weapon => { weapon.group.visible = weapon.state !== 'held' && weapon.state !== 'inventory' && (mode === 'sandbox' || weapon.island === currentIsland); });
}
function setMode(nextMode) {
  mode = nextMode;
  currentIsland = 0;
  wave = nextMode === 'survival' ? 1 : 0;
  waveDelay = nextMode === 'survival' ? 0.6 : 0;
  $('island-label').textContent = nextMode === 'survival' ? 'ISLAND 1 / 4 · WAVE 1' : 'SANDBOX';
  $('brand-sub').textContent = nextMode === 'survival' ? 'ISLAND SURVIVAL · GATHER · FIGHT · SAIL' : '4 × 4 ROOM · EXPANDED SANDBOX';
  mapGround.visible = nextMode === 'sandbox';
  ocean.visible = nextMode === 'survival';
  scene.fog.far = nextMode === 'sandbox' ? 46 : 70;
  player.group.position.set(0, 0, 0.65);
  resources.wood = 0;
  resources.stone = 0;
  if (nextMode === 'survival') pendingSpawns = 2;
  else pendingSpawns = 0;
  updateIslandVisibility();
  updateInventoryHud();
}
let pendingSpawns = 0;
function travel() {
  if (mode !== 'survival' || resources.wood < 2 || resources.stone < 1) return;
  resources.wood -= 2;
  resources.stone -= 1;
  for (const npc of npcs) if (!npc.removed) { npc.removed = true; npc.dispose(); }
  npcs.length = 0;
  if (heldNPC) { heldNPC = null; armL.rotation.x = 0; }
  currentIsland = (currentIsland + 1) % islandPositions.length;
  const p = islandPositions[currentIsland];
  player.group.position.set(p.x, 0, p.z + 0.65);
  wave++;
  pendingSpawns = Math.min(5, wave + 1);
  waveDelay = 1;
  $('island-label').textContent = `ISLAND ${currentIsland + 1} / 4 · WAVE ${wave}`;
  updateIslandVisibility();
  updateInventoryHud();
  addFeed(`SAILED TO ISLAND ${currentIsland + 1}`);
  audio.ui();
}
$('sandbox-btn').addEventListener('click', () => { setMode('sandbox'); startGame(); });
$('survival-btn').addEventListener('click', () => { setMode('survival'); startGame(); });
$('travel-btn').addEventListener('click', travel);
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
// Mode buttons above choose the ruleset and then start the session.
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
