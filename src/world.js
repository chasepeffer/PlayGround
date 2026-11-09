import * as THREE from 'three';
import { lit } from './quality.js';

const mat = (color, opts) => lit(color, opts);

export function buildWorld(scene, mode, map) {
  const root = new THREE.Group();
  root.name = 'active-world';
  scene.add(root);
  const solid = [];
  const breachPoints = [];
  const addBox = (w, h, d, x, y, z, material, opts = {}) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    root.add(mesh);
    if (opts.solid) solid.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    return mesh;
  };
  const ground = (w, d, color, x = 0, z = 0, y = 0) => addBox(w, 0.18, d, x, y - 0.09, z, mat(color));
  const wood = mat(0x513a2d), woodLight = mat(0x76533b), stone = mat(0x544d49);
  const blood = mat(0x520b10), bloodBright = mat(0x861a20);

  if (mode === 'area') {
    // Two-story ruined church: broad nave, blocked side rooms and breached walls.
    ground(18, 24, 0x393532);
    const masonry = mat(0x554d49), dark = mat(0x29272a), trim = mat(0x766a5e);
    // Long exterior walls deliberately leave the entrance and four breach gaps.
    for (const z of [-11.9, 11.9]) {
      for (const x of [-7.2, -3.2, 3.2, 7.2]) addBox(3.4, 7.2, 0.5, x, 3.6, z, masonry, { solid: true });
    }
    for (const x of [-8.9, 8.9]) {
      for (const z of [-8.8, -3.1, 3.1, 8.8]) addBox(0.5, 7.2, 5.2, x, 3.6, z, masonry);
    }
    // Gabled roof ribs and clerestory beams make the height legible without hiding the second level.
    for (let z = -9; z <= 9; z += 4.5) {
      addBox(0.22, 7.1, 0.25, -5.9, 3.55, z, trim);
      addBox(0.22, 7.1, 0.25, 5.9, 3.55, z, trim);
      addBox(12.2, 0.22, 0.25, 0, 6.7, z, dark);
    }
    // Upper gallery, with broken balcony edges.
    addBox(4.5, 0.38, 5.8, -6.4, 3.9, -5.9, stone);
    addBox(4.5, 0.38, 5.8, 6.4, 3.9, -5.9, stone);
    addBox(4.5, 0.55, 0.16, -6.4, 4.35, -3.05, wood);
    addBox(4.5, 0.55, 0.16, 6.4, 4.35, -3.05, wood);
    // Side rooms are boarded shut; only the main nave and transept are open.
    for (const x of [-6.4, 6.4]) for (const z of [-1.4, 5.2, 9.1]) {
      addBox(2.4, 3.4, 0.18, x, 1.7, z, dark);
      for (let i = -2; i <= 2; i++) {
        const plank = addBox(0.1, 3.1, 0.28, x + i * 0.34, 1.7, z - 0.08, woodLight);
        plank.rotation.z = (i % 2 ? -1 : 1) * 0.035;
      }
      addBox(0.12, 0.16, 2.3, x, 0.75, z - 0.24, wood);
      addBox(0.12, 0.16, 2.3, x, 2.6, z + 0.12, wood);
    }
    // Rubble and stained walls.
    for (let i = 0; i < 13; i++) {
      const x = (Math.random() - 0.5) * 15, z = (Math.random() - 0.5) * 18;
      const r = addBox(0.2 + Math.random() * 0.5, 0.12 + Math.random() * 0.3, 0.2 + Math.random() * 0.4, x, 0.08, z, i % 2 ? stone : wood);
      r.rotation.y = Math.random() * 3;
    }
    // Stylized blood streaks on the nave walls.
    for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
      const stain = addBox(0.15 + Math.random() * 0.45, 0.8 + Math.random() * 1.8, 0.025, side * 8.62, 1.8 + Math.random() * 1.8, -8 + i * 2.4, i % 2 ? blood : bloodBright);
      stain.rotation.z = (Math.random() - 0.5) * 0.14;
    }
    // A broken, blood-darkened cross stake is wedged into the entrance threshold.
    const stake = addBox(0.28, 4.3, 0.3, 0, 2.15, 11.15, wood);
    stake.rotation.z = -0.22;
    const crossbar = addBox(2.1, 0.28, 0.34, 0, 2.75, 11.12, woodLight);
    crossbar.rotation.z = -0.22;
    addBox(0.31, 2.5, 0.08, 0.18, 2.05, 10.96, bloodBright).rotation.z = -0.22;
    addBox(2.25, 0.2, 0.08, 0, 2.72, 10.95, blood).rotation.z = -0.22;
    addBox(0.8, 0.25, 0.35, -0.8, 0.12, 10.8, stone).rotation.z = 0.35;
    // Glowing breach scars: gore emerge from these wall openings.
    for (const [x, z, yaw] of [[-8.55, -5.8, Math.PI / 2], [8.55, 0, -Math.PI / 2], [-3, -11.55, 0], [3, 11.55, Math.PI]]) {
      breachPoints.push(new THREE.Vector3(x * 0.88, 0, z * 0.88));
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.07, 5, 12), new THREE.MeshBasicMaterial({ color: 0x7d151a, transparent: true, opacity: 0.68 }));
      halo.position.set(x, 1.25, z); halo.rotation.y = yaw; root.add(halo);
      for (let i = 0; i < 3; i++) addBox(0.14, 0.7 + Math.random(), 0.16, x + (Math.random() - 0.5), 1.2, z, i ? blood : bloodBright);
    }
    // Uneven pews flank the central aisle.
    for (const x of [-3.9, 3.9]) for (let z = -6.5; z < 5; z += 2.2) {
      addBox(2.4, 0.18, 0.48, x, 0.72, z, woodLight);
      addBox(2.4, 0.12, 0.32, x, 0.38, z, wood);
      for (const dx of [-0.95, 0.95]) addBox(0.14, 0.7, 0.38, x + dx, 0.36, z, wood);
    }
    return { root, solid, breachPoints, bounds: { x: 8.1, z: 10.8 }, ground: 0, title: 'THE HOLLOW CHURCH', sky: 0x171316, fog: 0x171316 };
  }

  if (mode === 'sandbox' && map === 'island') {
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), mat(0x102e3a));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -0.38; root.add(sea);
    const island = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), mat(0x53624d));
    island.scale.set(11, 1.15, 10); island.position.set(0, -0.05, 0); root.add(island);
    ground(17, 15, 0x59644c);
    // Small weather-beaten island house; front is left open as a walk-in doorway.
    const plaster = mat(0x8c8068), roof = mat(0x463b37);
    addBox(5.2, 3.2, 0.25, 0, 1.6, -3.4, plaster);
    addBox(0.25, 3.2, 5.4, -2.6, 1.6, -0.8, plaster);
    addBox(0.25, 3.2, 5.4, 2.6, 1.6, -0.8, plaster);
    addBox(1.7, 3.2, 0.25, -1.75, 1.6, 1.9, plaster);
    addBox(1.7, 3.2, 0.25, 1.75, 1.6, 1.9, plaster);
    addBox(5.8, 0.28, 5.8, 0, 3.2, -0.8, roof);
    addBox(5.8, 0.25, 5.8, 0, 0.06, -0.8, mat(0x53463a));
    addBox(0.13, 1.8, 0.2, -0.85, 0.95, 1.98, wood);
    addBox(0.07, 1.1, 0.05, 1.45, 2.05, -3.25, mat(0x243b43));
    // Palms, rocks, driftwood.
    for (const [x, z] of [[-7, -4], [7, -4], [-7, 5], [6.8, 5.5], [0, 7]]) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 3.8, 5), woodLight);
      trunk.position.set(x, 1.8, z); trunk.rotation.z = (Math.random() - 0.5) * 0.22; root.add(trunk);
      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.36, 2.1, 4), mat(0x354a35));
        leaf.position.set(x + Math.cos(i * 1.25) * 0.8, 3.5, z + Math.sin(i * 1.25) * 0.8); leaf.rotation.z = Math.cos(i * 1.25) * 0.75; root.add(leaf);
      }
    }
    return { root, solid, breachPoints, bounds: { x: 8.6, z: 7.5 }, ground: 0, title: 'DRIFTWOOD ISLAND', sky: 0x75a9b5, fog: 0x75a9b5 };
  }

  if (mode === 'sandbox' && map === 'tower') {
    ground(22, 24, 0x4b4b50);
    const roof = mat(0x55545a), concrete = mat(0x77747a), glass = mat(0x243744);
    addBox(1.2, 0.2, 19, -10.1, 0.05, 0, roof);
    addBox(1.2, 0.2, 19, 10.1, 0.05, 0, roof);
    for (let i = 0; i < 6; i++) {
      const height = 18 + Math.random() * 22, x = -44 + i * 17;
      const building = addBox(11, height, 12, x, height / 2 - 1.5, -31, i % 2 ? glass : concrete);
      void building;
      for (let y = 2; y < height - 2; y += 2.7) for (let dx = -4; dx <= 4; dx += 2.6) addBox(1.25, 1.45, 0.08, x + dx, y, -24.9, mat(0x314955));
    }
    // Rooftop machinery and a low perimeter safety wall.
    addBox(4.3, 1.8, 4, -6.5, 0.9, -7, concrete);
    addBox(3, 1.1, 2.5, 6.4, 0.55, -7, concrete);
    for (const [x, z, w, d] of [[0, -11.8, 22, 0.25], [-11, 0, 0.25, 24], [11, 0, 0.25, 24], [0, 11.8, 22, 0.25]]) addBox(w, 0.75, d, x, 0.38, z, roof);
    // Access stairwell shed.
    addBox(4.5, 2.8, 4.2, 0, 1.4, -7.3, concrete);
    addBox(1.1, 2.2, 0.1, 0, 1.1, -5.15, darken(concrete));
    // distant skyline edges
    for (let i = 0; i < 8; i++) addBox(8, 14 + (i % 3) * 7, 10, -48 + i * 14, 7 + (i % 3) * 3, 36, i % 2 ? glass : concrete);
    return { root, solid, breachPoints, bounds: { x: 10.2, z: 11.2 }, ground: 0, title: 'CLOUDLINE ROOFTOP', sky: 0x687d8c, fog: 0x687d8c };
  }

  // Classic exact 4×4 open-sided sandbox / arena slab.
  ground(4, 4, 0x555155);
  const wall = mat(0x39383d);
  addBox(4, 2.8, 0.16, 0, 1.32, -2.08, wall);
  addBox(0.16, 2.8, 4, -2.08, 1.32, 0, wall);
  const edge = new THREE.MeshBasicMaterial({ color: 0x8e3231, transparent: true, opacity: 0.65 });
  for (const [x, z, sx, sz] of [[0, 1.94, 3.85, 0.018], [1.94, 0, 0.018, 3.85]]) addBox(sx, 0.008, sz, x, 0.006, z, edge);
  return { root, solid, breachPoints, bounds: { x: 1.76, z: 1.76 }, ground: 0, title: mode === 'arena' ? 'THE GORE PIT' : '4 × 4 ROOM', sky: 0x111116, fog: 0x111116 };
}

function darken(material) {
  return material;
}
