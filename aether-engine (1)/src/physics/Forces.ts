/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getNoiseVector } from "./NoiseField";

/**
 * Computes a standard linear spring pull towards a target with damping.
 * Used for updating the lagging cloud anchor position.
 */
export function computeSpringForce(
  current: number,
  target: number,
  velocity: number,
  strength: number,
  damping: number
): { acceleration: number; nextVelocity: number; nextPosition: number } {
  const displacement = target - current;
  const springForce = displacement * strength;
  const dampingForce = -velocity * (1.0 - damping);
  const acceleration = springForce + dampingForce;
  const nextVelocity = velocity + acceleration;
  const nextPosition = current + nextVelocity;
  return { acceleration, nextVelocity, nextPosition };
}

/**
 * Pulls a particle toward a target point.
 * We can use a distance-attenuated gravity pull or a spring pull.
 * Let's use a soft attraction force that becomes stronger as particles are far, but capped to avoid infinite acceleration.
 */
export function getCenteringForce(
  px: number,
  py: number,
  tx: number,
  ty: number,
  strength: number
): [number, number] {
  const dx = tx - px;
  const dy = ty - py;
  const distSq = dx * dx + dy * dy + 0.001;
  const dist = Math.sqrt(distSq);
  
  // Soft threshold: doesn't fling particles infinitely
  if (dist === 0) return [0, 0];
  
  // Normalize and apply force scaled by strength
  const f = strength * dist; // linear pull
  return [(dx / dist) * f, (dy / dist) * f];
}

/**
 * Local finger attractor forces. Each finger landmark pulls nearby particles.
 * If the particle is inside the attractor radius, it is pulled toward the fingertip.
 * Strength is scaled by the continuous finger extension.
 */
export function getFingerAttraction(
  px: number,
  py: number,
  fx: number,
  fy: number,
  extension: number,
  maxStrength: number,
  maxRadius: number
): [number, number] {
  if (extension <= 0.05) return [0, 0]; // ignore if fully curled
  
  const dx = fx - px;
  const dy = fy - py;
  const distSq = dx * dx + dy * dy;
  const dist = Math.sqrt(distSq);
  
  if (dist === 0 || dist > maxRadius) return [0, 0];
  
  // Attenuation: stronger closer to tip, tapering off to 0 at maxRadius
  const factor = 1.0 - dist / maxRadius;
  // Let's make it a nice bell or ease-out curve
  const forceMag = maxStrength * extension * (factor * factor);
  
  return [(dx / dist) * forceMag, (dy / dist) * forceMag];
}

/**
 * Gentle organic drift driven by Perlin noise field.
 */
export function getNoiseDrift(
  px: number,
  py: number,
  time: number,
  noiseScale: number,
  noiseStrength: number
): [number, number] {
  // Sample noise field using spatial coordinates and time
  const [nx, ny] = getNoiseVector(px * noiseScale, py * noiseScale, time);
  return [nx * noiseStrength, ny * noiseStrength];
}

/**
 * Strong compression force toward hand centroid during fist squeeze or sequence.
 */
export function getFistCompressionForce(
  px: number,
  py: number,
  cx: number,
  cy: number,
  gripValue: number,
  strength: number
): [number, number] {
  if (gripValue <= 0.1) return [0, 0];
  
  const dx = cx - px;
  const dy = cy - py;
  const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
  
  // Gravitational-like pull: increases as particles get closer, with a soft core
  const pull = (strength * gripValue) / (dist * 2.0 + 0.1);
  return [(dx / dist) * pull, (dy / dist) * pull];
}
