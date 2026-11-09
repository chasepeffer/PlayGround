import * as THREE from 'three';

// Keep a circular actor inside the active map and push it out of solid X/Z boxes.
export function resolveWorldPosition(position, radius, bounds, solids = [], velocity = null) {
  const limitX = Math.max(0, bounds.x - radius);
  const limitZ = Math.max(0, bounds.z - radius);
  position.x = THREE.MathUtils.clamp(position.x, -limitX, limitX);
  position.z = THREE.MathUtils.clamp(position.z, -limitZ, limitZ);

  for (const box of solids) {
    const nearestX = THREE.MathUtils.clamp(position.x, box.minX, box.maxX);
    const nearestZ = THREE.MathUtils.clamp(position.z, box.minZ, box.maxZ);
    let dx = position.x - nearestX;
    let dz = position.z - nearestZ;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq >= radius * radius) continue;

    if (distanceSq < 1e-8) {
      const left = Math.abs(position.x - box.minX);
      const right = Math.abs(box.maxX - position.x);
      const near = Math.abs(position.z - box.minZ);
      const far = Math.abs(box.maxZ - position.z);
      const edge = Math.min(left, right, near, far);
      if (edge === left) { dx = -1; dz = 0; }
      else if (edge === right) { dx = 1; dz = 0; }
      else if (edge === near) { dx = 0; dz = -1; }
      else { dx = 0; dz = 1; }
      position.x += dx * (radius + edge);
      position.z += dz * (radius + edge);
    } else {
      const distance = Math.sqrt(distanceSq);
      dx /= distance; dz /= distance;
      const push = radius - distance;
      position.x += dx * push;
      position.z += dz * push;
    }
    if (velocity) {
      if (Math.abs(dx) > Math.abs(dz)) velocity.x *= -0.35;
      else velocity.z *= -0.35;
    }
  }
  position.x = THREE.MathUtils.clamp(position.x, -limitX, limitX);
  position.z = THREE.MathUtils.clamp(position.z, -limitZ, limitZ);
  return position;
}
