import * as THREE from 'three';

/**
 * CollisionSystem — Simple robust cylinder/circle collision for player and obstacles.
 * Prevents clipping through trees, rocks, plane wreckage, and bounds.
 */
export class CollisionSystem {
  constructor(boundaryRadius = 36) {
    this.boundaryRadius = boundaryRadius;
  }

  update(world, dt) {
    const players = world.query('PlayerInput', 'Transform', 'Collider');
    const obstacles = world.query('Collider', 'Transform');

    for (const pId of players) {
      const pTransform = world.getComponent(pId, 'Transform');
      const pCollider = world.getComponent(pId, 'Collider');

      // 1. Check against static obstacles (trees, rocks, plane, campfire)
      for (const oId of obstacles) {
        if (pId === oId) continue;
        const oCollider = world.getComponent(oId, 'Collider');
        if (!oCollider.isStatic) continue;

        const oTransform = world.getComponent(oId, 'Transform');

        const dx = pTransform.position.x - oTransform.position.x;
        const dz = pTransform.position.z - oTransform.position.z;
        const distSq = dx * dx + dz * dz;

        const minDist = pCollider.radius + oCollider.radius;
        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = minDist - dist;

          // Push player out along collision normal (sliding response)
          const nx = dx / dist;
          const nz = dz / dist;

          pTransform.position.x += nx * overlap;
          pTransform.position.z += nz * overlap;
        }
      }

      // 2. Boundary constraint (Keep player within clearing radius)
      const centerDist = Math.sqrt(
        pTransform.position.x * pTransform.position.x +
        pTransform.position.z * pTransform.position.z
      );

      if (centerDist > this.boundaryRadius) {
        const nx = pTransform.position.x / centerDist;
        const nz = pTransform.position.z / centerDist;
        pTransform.position.x = nx * this.boundaryRadius;
        pTransform.position.z = nz * this.boundaryRadius;
      }
    }
  }
}
