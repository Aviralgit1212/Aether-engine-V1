/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from "../core/Config";
import { ParticleSystem } from "../particles/ParticleSystem";

export class EnergyEstimator {
  private currentEnergy: number = 0.0; // 0.0 to 1.0

  /**
   * Evaluates the particle density around the hand anchor point.
   * Rises when particles are concentrated near the hand, declines when dispersed.
   */
  public update(particleSystem: ParticleSystem, dt: number): number {
    const ax = particleSystem.anchorX;
    const ay = particleSystem.anchorY;
    const captureRadius = Config.ENERGY_CAPTURE_RADIUS;
    const captureRadiusSq = captureRadius * captureRadius;
    
    let inRangeCount = 0;
    const count = particleSystem.count;
    const positions = particleSystem.positions;

    for (let i = 0; i < count; i++) {
      const px = positions[i * 2];
      const py = positions[i * 2 + 1];
      
      const dx = px - ax;
      const dy = py - ay;
      const dSq = dx * dx + dy * dy;
      
      if (dSq <= captureRadiusSq) {
        // Particles closer to center contribute more to density score
        const dist = Math.sqrt(dSq);
        const weight = 1.0 - (dist / captureRadius);
        inRangeCount += weight;
      }
    }

    // Convert weighted count to a percentage.
    // If half of the particles are tightly packed, it's a maximum.
    // Let's normalize so a target sum of ~1200 weighted points represents 100% (1.0) energy
    const maxTargetScore = count * 0.28; // ~1400 points for 5000 particles
    const rawRatio = inRangeCount / maxTargetScore;
    const targetEnergy = Math.max(0.0, Math.min(1.0, rawRatio));

    // Smooth temporal jitter using exponential moving average
    // Adjust speed based on dt
    const alpha = Math.min(1.0, Config.ENERGY_SMOOTHING * dt * 60.0);
    this.currentEnergy = this.currentEnergy * (1.0 - alpha) + targetEnergy * alpha;

    return this.currentEnergy;
  }

  public getEnergyLevel(): number {
    return this.currentEnergy * 100.0; // Return percentage
  }

  public getEnergyFraction(): number {
    return this.currentEnergy;
  }

  public reset() {
    this.currentEnergy = 0.0;
  }
}
export default EnergyEstimator;
