import * as THREE from 'three';
import { lit } from './quality.js';

const box = (root, size, pos, color, opts = {}) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), lit(color, opts));
  mesh.position.set(...pos);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  root.add(mesh);
  return mesh;
};

function church(root) {
  const stone = 0x514b49, dark = 0x29272b, wood = 0x493326;
  box(root, [18, .2, 18], [0, -.1, 0], 0x3e3938);
  // Nave walls; gaps are deliberate breaches for incoming gore.
  for (const z of [-8.9, 8.9]) {
    for (const x of [-7.3, -3.1, 3.1, 7.3]) box(root, [3.4, 5, .28], [x, 2.5, z], stone);
    box(root, [2.4, 1.45, .28], [0, 4.28, z], stone);
    // splintered breach frame
    box(root, [.18, 1.25, .34], [-1.32, .62, z], wood);
    box(root, [.18, 1.05, .34], [1.32, .52, z], wood);
    box(root, [1.2, .14, .34], [-.72, .12, z], wood);
  }
  for (const x of [-8.9, 8.9]) {
    for (const z of [-7.2, -2.4, 2.4, 7.2]) box(root, [.28, 5, 3.2], [x, 2.5, z], stone);
    box(root, [.28, 1.2, 2], [x, 4.4, 0], stone);
  }
  // Nave columns and broken pews
  for (const x of [-5.7, 5.7]) for (const z of [-5.8, 0, 5.8]) box(root, [.55, 4.7, .55], [x, 2.35, z], 0x655a52);
  for (const z of [-4.7, -2.8, 1.9, 3.8]) {
    box(root, [5.4, .18, .46], [0, .54, z], wood);
    for (const x of [-2.4, 2.4]) box(root, [.16, .52, .16], [x, .27, z], 0x30231c);
  }
  // boarded-off side rooms
  for (const side of [-1, 1]) for (const z of [-5.3, 5.3]) {
    for (let i = 0; i < 5; i++) {
      const plank = box(root, [.14, 2.1, .2], [side * 8.73, 1.55, z - .9 + i * .42], 0x76513a);
      plank.rotation.x = (i % 2 ? -1 : 1) * .1;
    }
  }
  // apse / altar, cross and bloodied statue
  box(root, [4.5, .45, 1.25], [0, .25, -7.25], 0x6b5b4b);
  box(root, [2.1, .12, .8], [0, .54, -7.25], 0xa39378);
  box(root, [.18, 2.2, .18], [0, 2.6, -8.1], 0x281f1b);
  box(root, [1.2, .16, .18], [0, 3.05, -8.1], 0x281f1b);
  const statue = new THREE.Group(); statue.position.set(0, .65, -7.45); root.add(statue);
  const robe = new THREE.Mesh(new THREE.ConeGeometry(.38, 1.45, 6), lit(0x73191c)); robe.position.y = .72; statue.add(robe);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.19, 8, 6), lit(0xb78d76)); head.position.y = 1.58; statue.add(head);
  const arms = box(statue, [.92, .13, .14], [0, 1.2, .02], 0x9d7062); arms.rotation.z = -.12;
  for (const x of [-.22, .22]) { const stain = new THREE.Mesh(new THREE.SphereGeometry(.11, 6, 4), lit(0x9e1118)); stain.position.set(x, .92, .25); stain.scale.set(.7, 1.5, .28); statue.add(stain); }
  // second-floor gallery and stairs
  box(root, [13, .22, 2.7], [0, 3.15, 6.7], 0x413b39);
  box(root, [13, .2, .18], [0, 3.75, 5.28], 0x72583e);
  for (let i = 0; i < 7; i++) box(root, [1.05, .18, 1.1], [-7 + i * .72, .16 + i * .32, 4.5 - i * .25], 0x5b4638);
  for (const x of [-5.2, -3.1, 3.1, 5.2]) box(root, [.12, 1.05, .12], [x, 3.75, 6], 0x5a4130);
  // ragged roof beams, hanging lanterns
  for (const x of [-6.6, -3.3, 0, 3.3, 6.6]) box(root, [.16, .18, 17], [x, 5.1, 0], 0x302923);
  for (const z of [-5, 0, 5]) {
    box(root, [17, .16, .16], [0, 5.05, z], 0x362b24);
    const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(.18), new THREE.MeshBasicMaterial({ color: 0xff9a52 })); lamp.position.set(0, 4.35, z); root.add(lamp);
  }
  // merchant stall
  box(root, [2.4, .12, 1.3], [6.65, 1.1, -6.1], 0x6b4932);
  box(root, [2.6, .18, 1.5], [6.65, 2.1, -6.1], 0x5a2020);
  for (const x of [5.65, 7.65]) box(root, [.12, 2, .12], [x, 1.05, -6.1], 0x33231d);
  const merchant = new THREE.Group(); merchant.position.set(6.65, 0, -5.35); root.add(merchant);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.27, .48, 2, 5), lit(0x655a48)); body.position.y = .85; merchant.add(body);
  const mhead = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 6), lit(0xc29d78)); mhead.position.y = 1.32; merchant.add(mhead);
  return { bounds: 8.15, spawn: [0, 0.8], merchant: [6.65, -5.35] };
}

function fourByFour(root) {
  box(root, [4, .16, 4], [0, -.08, 0], 0x555155);
  box(root, [4, 2.8, .16], [0, 1.32, -2.08], 0x39383d);
  box(root, [.16, 2.8, 4], [-2.08, 1.32, 0], 0x39383d);
  for (const [x,z,sx,sz] of [[0,1.94,3.85,.018],[1.94,0,.018,3.85]]) box(root,[sx,.008,sz],[x,.006,z],0x8e3231);
  return { bounds: 1.76, spawn: [0, .65] };
}

function skyscraper(root) {
  box(root, [20, .3, 20], [0, -.15, 0], 0x343b43);
  // rooftop perimeter with open gaps and hazard rails
  for (const x of [-9.7, 9.7]) box(root, [.35, 1.5, 20], [x, .75, 0], 0x606a72);
  for (const z of [-9.7, 9.7]) box(root, [20, 1.5, .35], [0, .75, z], 0x606a72);
  for (let i = -2; i <= 2; i++) {
    box(root, [2.8, 3.8, 2.8], [i * 3.2, 1.9, i % 2 ? -3.1 : 3.2], i % 2 ? 0x46515b : 0x3f454e);
    for (let y = .4; y < 3.5; y += .65) box(root, [2.82, .08, .08], [i * 3.2, y, (i % 2 ? -1.68 : 4.62)], 0x8795a0);
  }
  // helipad and rooftop access hut
  const pad = new THREE.Mesh(new THREE.CircleGeometry(2.1, 32), new THREE.MeshBasicMaterial({ color: 0xb5c2c8, side: THREE.DoubleSide })); pad.rotation.x = -Math.PI / 2; pad.position.set(0, .012, 0); root.add(pad);
  box(root, [3.2, 2.5, 2.7], [-6.7, 1.25, -6.5], 0x252b31);
  box(root, [2.2, .12, 2], [-6.7, 2.55, -6.5], 0x832126);
  // antenna and warning beacons
  box(root, [.12, 5, .12], [7, 2.5, 7], 0x949da0);
  for (const x of [-8, 8]) { const light = new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2929 })); light.position.set(x, 2.8, 0); root.add(light); }
  return { bounds: 9.05, spawn: [0, 0] };
}

function courtyard(root) {
  box(root, [14, .2, 14], [0, -.1, 0], 0x4c4941);
  for (const [x,z] of [[-5,-5],[5,-5],[-5,5],[5,5]]) {
    box(root, [2.1, 4.4, 2.1], [x, 2.2, z], 0x52514b);
    box(root, [2.4, .2, 2.4], [x, 4.5, z], 0x292d30);
  }
  for (let i = -2; i <= 2; i++) box(root,[.18,2.4,13],[i*2.7,1.2,0],0x64615a);
  box(root,[1.6,.6,1.6],[0,.3,0],0x70695e);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(.56,.56,.14,16),lit(0x452a29)); water.position.set(0,.68,0); root.add(water);
  return { bounds: 6.35, spawn: [0, 2] };
}

export const MAPS = [
  { id: 'four', name: '4 × 4 PIT', mode: 'Sandbox', detail: 'The original close-quarters slab' },
  { id: 'courtyard', name: 'ASH COURTYARD', mode: 'Sandbox', detail: 'Open ruins and broken pillars' },
  { id: 'skyscraper', name: 'SKYSCRAPER', mode: 'Sandbox', detail: 'A rooftop above the city' },
  { id: 'church', name: 'THE LAST CHURCH', mode: 'Arena', detail: 'Survive the waves · earn cash · arm up' }
];

export function buildMap(scene, id) {
  const group = new THREE.Group(); scene.add(group);
  const details = id === 'church' ? church(group) : id === 'skyscraper' ? skyscraper(group) : id === 'courtyard' ? courtyard(group) : fourByFour(group);
  return { ...details, group, id };
}
