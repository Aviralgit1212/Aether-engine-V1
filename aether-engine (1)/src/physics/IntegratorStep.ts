/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Performs a single physics integration step for a particle.
 * Uses semi-implicit Euler integration for energy conservation.
 * Coordinates are normalized [0, 1].
 */
export function integrateParticle(
  px: number,
  py: number,
  vx: number,
  vy: number,
  fx: number,
  fy: number,
  drag: number,
  dt: number
): { x: number; y: number; vx: number; vy: number } {
  // 1. Update velocity with force (acceleration = force / mass, assuming mass = 1)
  let nextVx = vx + fx * dt;
  let nextVy = vy + fy * dt;
  
  // 2. Apply drag (damping)
  const dampingFactor = Math.max(0.0, 1.0 - drag * dt);
  nextVx *= dampingFactor;
  nextVy *= dampingFactor;
  
  // 3. Update position
  let nextX = px + nextVx * dt;
  let nextY = py + nextVy * dt;
  
  // 4. Boundary constraints (soft bounce/containment to keep particles inside the normalized screen box)
  const margin = 0.02;
  const bounce = -0.3; // lose most energy on wall bounce
  
  if (nextX < margin) {
    nextX = margin;
    nextVx *= bounce;
  } else if (nextX > 1.0 - margin) {
    nextX = 1.0 - margin;
    nextVx *= bounce;
  }
  
  if (nextY < margin) {
    nextY = margin;
    nextVy *= bounce;
  } else if (nextY > 1.0 - margin) {
    nextY = 1.0 - margin;
    nextVy *= bounce;
  }
  
  return {
    x: nextX,
    y: nextY,
    vx: nextVx,
    vy: nextVy
  };
}
