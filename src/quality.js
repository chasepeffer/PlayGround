import * as THREE from 'three';

// Deliberately low-fidelity rendering profile so the game stays playable on
// phones. Everything expensive (shadows, AA, PBR shading, high DPR, dust,
// dense debris) is turned down or removed. Keep this as the only place to
// tune the cheap look.
export const LOW = true;

export const QUALITY = {
  // Internal render resolution multiplier (applied on top of device DPR).
  pixelRatio: 0.7,
  minPixelRatio: 0.5,
  // Lower cap so the arena never turns into a particle storm on a phone.
  maxNPCs: 6,
  // Fraction of the old blood/debris particle counts.
  fxScale: 0.4,
  maxDecals: 12,
  dust: false,
  shadows: false,
  antialias: false,
  toneMapping: false,
  // Cheaper shader precision is fine for this flat-shaded look.
  precision: 'mediump'
};

// One shared helper so every module downgrades materials the same way.
export function lit(color, opts = {}) {
  const { roughness, metalness, ...rest } = opts;
  void roughness;
  void metalness;
  return new THREE.MeshLambertMaterial({ color, ...rest });
}
