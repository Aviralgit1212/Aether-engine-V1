/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from "../core/Config";

export interface ParticleInitializationData {
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  shimmerPhase: Float32Array;
  sizes: Float32Array;
}

/**
 * Initializes the particle buffer with organic distribution.
 * Initial positions are distributed as a Gaussian-like cluster in the center of the viewport (0.5, 0.5)
 * so they start as a cohesive nebula.
 */
export function createParticles(count: number): ParticleInitializationData {
  const positions = new Float32Array(count * 2);
  const velocities = new Float32Array(count * 2);
  const colors = new Float32Array(count * 4);
  const shimmerPhase = new Float32Array(count);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Standard normal distribution approximation (Box-Muller transform)
    const u1 = Math.random() || 0.0001;
    const u2 = Math.random() || 0.0001;
    const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    
    // Distribute around center (0.5, 0.5) with standard dev 0.08
    const x = 0.5 + randStdNormal * 0.08;
    const y = 0.5 + Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2) * 0.08;
    
    positions[i * 2] = Math.max(0.05, Math.min(0.95, x));
    positions[i * 2 + 1] = Math.max(0.05, Math.min(0.95, y));

    // Slow initial drifting velocities
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 0.01;
    velocities[i * 2] = Math.cos(angle) * speed;
    velocities[i * 2 + 1] = Math.sin(angle) * speed;

    // Shimmer phase (random 0 to 2*PI)
    shimmerPhase[i] = Math.random() * Math.PI * 2;

    // Particle sizes between config bounds
    sizes[i] = Config.PARTICLE_MIN_SIZE + Math.random() * (Config.PARTICLE_MAX_SIZE - Config.PARTICLE_MIN_SIZE);

    // Initial color: Soft electric blue (Default starting state)
    // Blue: R=0.1, G=0.4, B=1.0, A=0.7 (Semi-transparent)
    colors[i * 4] = 0.1;
    colors[i * 4 + 1] = 0.4;
    colors[i * 4 + 2] = 1.0;
    colors[i * 4 + 3] = 0.5 + Math.random() * 0.3; // subtle opacity variations
  }

  return {
    positions,
    velocities,
    colors,
    shimmerPhase,
    sizes,
  };
}

/**
 * Resets a single particle's position and velocity.
 * Used for respawning particles if needed, or resetting the field.
 */
export function resetParticle(
  i: number,
  positions: Float32Array,
  velocities: Float32Array,
  centerX: number = 0.5,
  centerY: number = 0.5,
  spread: number = 0.1
) {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * spread;
  
  positions[i * 2] = centerX + Math.cos(angle) * radius;
  positions[i * 2 + 1] = centerY + Math.sin(angle) * radius;

  const velAngle = Math.random() * Math.PI * 2;
  const velSpeed = Math.random() * 0.005;
  velocities[i * 2] = Math.cos(velAngle) * velSpeed;
  velocities[i * 2 + 1] = Math.sin(velAngle) * velSpeed;
}
