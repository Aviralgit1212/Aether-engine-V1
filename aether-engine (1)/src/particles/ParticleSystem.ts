/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from "../core/Config";
import { createParticles, ParticleInitializationData } from "./ParticleFactory";
import { getCenteringForce, getFingerAttraction, getNoiseDrift, getFistCompressionForce, computeSpringForce } from "../physics/Forces";
import { integrateParticle } from "../physics/IntegratorStep";
import { ColorStop, interpolateColor } from "../rendering/ColorGradient";

// Let's define the color gradient stops for fist compression
const COLOR_STOPS: ColorStop[] = [
  { value: 0.0, color: { r: 0.1, g: 0.4, b: 1.0, a: 0.7 } },  // Electric Blue
  { value: 0.5, color: { r: 0.6, g: 0.1, b: 1.0, a: 0.85 } }, // Royal Purple
  { value: 1.0, color: { r: 0.85, g: 0.05, b: 0.15, a: 0.95 } } // Deep Crimson
];

// Gold accent color stop for the SIGNATURE text hold
const GOLD_COLOR: { r: number; g: number; b: number; a: number } = {
  r: 0.95,
  g: 0.75,
  b: 0.15,
  a: 0.9,
};

export class ParticleSystem {
  public count: number;
  public positions: Float32Array;
  public velocities: Float32Array;
  public colors: Float32Array;
  public shimmerPhase: Float32Array;
  public sizes: Float32Array;
  
  // Text target coordinates (optional, length count * 2)
  public targetPositions: Float32Array | null = null;
  
  // Spring-damped cloud anchor that lags behind the tracked hand centroid
  public anchorX: number = 0.5;
  public anchorY: number = 0.5;
  public anchorVx: number = 0;
  public anchorVy: number = 0;

  constructor(count: number = Config.PARTICLE_COUNT) {
    this.count = count;
    const data = createParticles(count);
    this.positions = data.positions;
    this.velocities = data.velocities;
    this.colors = data.colors;
    this.shimmerPhase = data.shimmerPhase;
    this.sizes = data.sizes;
  }

  /**
   * Sets target positions for text formation
   */
  public setTargetPositions(targets: Float32Array) {
    this.targetPositions = targets;
  }

  /**
   * Clears target positions
   */
  public clearTargetPositions() {
    this.targetPositions = null;
  }

  /**
   * Reset all particles to center
   */
  public resetToCenter() {
    const data = createParticles(this.count);
    this.positions = data.positions;
    this.velocities = data.velocities;
    this.colors = data.colors;
    this.shimmerPhase = data.shimmerPhase;
    this.sizes = data.sizes;
    this.anchorX = 0.5;
    this.anchorY = 0.5;
    this.anchorVx = 0;
    this.anchorVy = 0;
  }

  /**
   * CPU simulation update loop. Called once per frame.
   * Accumulated forces are integrated.
   */
  public update(
    dt: number,
    time: number,
    handDetected: boolean,
    handState: {
      palmCentroid: { x: number; y: number; z: number };
      gripValue: number;
      fingerExtensions: number[];
      fingertips: { x: number; y: number; z: number }[];
    } | null,
    machineState: string,
    stateProgress: number // 0.0 to 1.0 progress of current state for visual blending
  ) {
    // 1. Update the lagging cloud anchor using hand position (spring/damper model)
    let targetX = 0.5;
    let targetY = 0.5;
    let targetGrip = 0.0;
    
    if (handDetected && handState) {
      targetX = handState.palmCentroid.x;
      targetY = handState.palmCentroid.y;
      targetGrip = handState.gripValue;
    }

    // Apply spring-damper to the cloud anchor point
    const sx = computeSpringForce(
      this.anchorX,
      targetX,
      this.anchorVx,
      Config.SPRING_STRENGTH,
      Config.SPRING_DAMPING
    );
    this.anchorX = sx.nextPosition;
    this.anchorVx = sx.nextVelocity;

    const sy = computeSpringForce(
      this.anchorY,
      targetY,
      this.anchorVy,
      Config.SPRING_STRENGTH,
      Config.SPRING_DAMPING
    );
    this.anchorY = sy.nextPosition;
    this.anchorVy = sy.nextVelocity;

    // Determine target color based on grip value
    // If we are in signature state STILL, FORMING_TEXT, or TEXT_HOLD, we blend towards luxury gold!
    let baseColor = interpolateColor(COLOR_STOPS, targetGrip);
    if (machineState === "FORMING_TEXT" || machineState === "TEXT_HOLD") {
      // Transition from current crimson/purple base color to premium gold
      const goldBlend = Math.min(1.0, stateProgress * 1.5); // speed up color transition
      baseColor = {
        r: baseColor.r * (1 - goldBlend) + GOLD_COLOR.r * goldBlend,
        g: baseColor.g * (1 - goldBlend) + GOLD_COLOR.g * goldBlend,
        b: baseColor.b * (1 - goldBlend) + GOLD_COLOR.b * goldBlend,
        a: baseColor.a * (1 - goldBlend) + GOLD_COLOR.a * goldBlend,
      };
    } else if (machineState === "DISSOLVING") {
      // Fade back to normal blue
      const blueColor = COLOR_STOPS[0].color;
      const dissolveBlend = stateProgress;
      baseColor = {
        r: GOLD_COLOR.r * (1 - dissolveBlend) + blueColor.r * dissolveBlend,
        g: GOLD_COLOR.g * (1 - dissolveBlend) + blueColor.g * dissolveBlend,
        b: GOLD_COLOR.b * (1 - dissolveBlend) + blueColor.b * dissolveBlend,
        a: GOLD_COLOR.a * (1 - dissolveBlend) + blueColor.a * dissolveBlend,
      };
    }

    // Accumulate and integrate forces per-particle
    for (let i = 0; i < this.count; i++) {
      const px = this.positions[i * 2];
      const py = this.positions[i * 2 + 1];
      const vx = this.velocities[i * 2];
      const vy = this.velocities[i * 2 + 1];

      // Reset forces
      let fx = 0;
      let fy = 0;

      // Update shimmer phase
      this.shimmerPhase[i] += Config.IDLE_SHIMMER_SPEED * dt * (0.8 + Math.random() * 0.4);
      const shimmer = Math.sin(this.shimmerPhase[i]);
      
      // Update particle color (with a tiny bit of individual phase variation)
      const particleAlpha = baseColor.a * (0.5 + 0.5 * shimmer);
      this.colors[i * 4] = baseColor.r;
      this.colors[i * 4 + 1] = baseColor.g;
      this.colors[i * 4 + 2] = baseColor.b;
      this.colors[i * 4 + 3] = particleAlpha;

      // Apply forces depending on State Machine
      if (machineState === "FORMING_TEXT" || machineState === "TEXT_HOLD") {
        if (this.targetPositions) {
          const tx = this.targetPositions[i * 2];
          const ty = this.targetPositions[i * 2 + 1];

          // Critically damped spring force pull towards target letters
          // F = -k * x - c * v
          const k = machineState === "FORMING_TEXT" ? 6.5 : 8.0; // Spring strength
          const c = machineState === "FORMING_TEXT" ? 1.5 : 1.8; // Damping
          
          const dx = tx - px;
          const dy = ty - py;

          fx += dx * k - vx * c;
          fy += dy * k - vy * c;

          // Add a tiny bit of micro-jitter so the text looks living
          const jitterMag = machineState === "TEXT_HOLD" ? 0.002 : 0.005;
          const [jx, jy] = getNoiseDrift(px, py, time * 2 + i * 0.1, 5.0, jitterMag);
          fx += jx;
          fy += jy;
        }
      } else if (machineState === "COMPRESSING") {
        // Force compressed sphere
        const cx = handState ? handState.palmCentroid.x : this.anchorX;
        const cy = handState ? handState.palmCentroid.y : this.anchorY;
        
        // Intense centering force
        const [cfx, cfy] = getCenteringForce(px, py, cx, cy, Config.FIST_COMPRESSION_STRENGTH * 2.0);
        fx += cfx;
        fy += cfy;

        // Gentle noise for fluid feeling while compressing
        const [nx, ny] = getNoiseDrift(px, py, time, Config.IDLE_NOISE_SCALE, Config.IDLE_NOISE_STRENGTH);
        fx += nx;
        fy += ny;

      } else if (machineState === "VIBRATING" || machineState === "VIBRATION_DECAY") {
        const cx = handState ? handState.palmCentroid.x : this.anchorX;
        const cy = handState ? handState.palmCentroid.y : this.anchorY;

        // Keep compressed
        const [cfx, cfy] = getCenteringForce(px, py, cx, cy, Config.FIST_COMPRESSION_STRENGTH * 2.2);
        fx += cfx;
        fy += cfy;

        // High frequency unstable jitter
        // Amplitude decay multiplier
        let ampMult = 1.0;
        if (machineState === "VIBRATION_DECAY") {
          ampMult = 1.0 - stateProgress; // fade out vibration
        }
        
        const vibStrength = 0.12 * ampMult;
        const vxNoise = Math.sin(time * 55.0 + i * 1.5) * vibStrength;
        const vyNoise = Math.cos(time * 57.0 + i * 2.1) * vibStrength;
        fx += vxNoise;
        fy += vyNoise;

      } else if (machineState === "STILL") {
        const cx = handState ? handState.palmCentroid.x : this.anchorX;
        const cy = handState ? handState.palmCentroid.y : this.anchorY;

        // Draw in tight and slow them down aggressively (extremely high drag)
        const [cfx, cfy] = getCenteringForce(px, py, cx, cy, Config.FIST_COMPRESSION_STRENGTH * 1.5);
        fx += cfx;
        fy += cfy;

        // Stillness damping is applied by the drag coefficient in integrate,
        // but let's also pull speed down manually
        this.velocities[i * 2] *= 0.82;
        this.velocities[i * 2 + 1] *= 0.82;

        // Barely a whisper of drift
        const [nx, ny] = getNoiseDrift(px, py, time * 0.1, 1.0, 0.0005);
        fx += nx;
        fy += ny;

      } else {
        // Normal interactive physics (IDLE, GATHERING, READY, HOLDING_FIST, DISSOLVING)
        
        // A. Idle ambient noise drift (always active, but scales down if hand is close or squeezing)
        const activeNoiseInfluence = machineState === "DISSOLVING" ? 1.0 : (1.0 - targetGrip * 0.85);
        const [ndx, ndy] = getNoiseDrift(
          px,
          py,
          time,
          Config.IDLE_NOISE_SCALE,
          Config.IDLE_NOISE_STRENGTH * activeNoiseInfluence
        );
        fx += ndx;
        fy += ndy;

        // B. Cloud Centering pulling particles to lagging anchor point
        // Strength scales based on whether hand is detected
        const centerStrength = handDetected ? 0.35 : 0.04;
        const cx = handDetected ? this.anchorX : 0.5;
        const cy = handDetected ? this.anchorY : 0.5;
        const [cfx, cfy] = getCenteringForce(px, py, cx, cy, centerStrength);
        fx += cfx;
        fy += cfy;

        // C. Continuous Fist compression
        if (handDetected && targetGrip > 0.05) {
          const [fcfx, fcfy] = getFistCompressionForce(
            px,
            py,
            this.anchorX,
            this.anchorY,
            targetGrip,
            Config.FIST_COMPRESSION_STRENGTH
          );
          fx += fcfx;
          fy += fcfy;
        }

        // D. Layer 2 local fingertip force fields
        if (handDetected && handState && targetGrip < 0.7) {
          // Only apply fingertip attraction if not in deep fist compression
          const fingerScale = 1.0 - targetGrip; // fade fingertip attractors as fist closes
          for (let f = 0; f < handState.fingertips.length; f++) {
            const fTip = handState.fingertips[f];
            const ext = handState.fingerExtensions[f];
            
            const [fafx, fafy] = getFingerAttraction(
              px,
              py,
              fTip.x,
              fTip.y,
              ext * fingerScale,
              Config.ATTRACTOR_STRENGTH,
              Config.ATTRACTOR_RADIUS
            );
            fx += fafx;
            fy += fafy;
          }
        }
      }

      // 3. Integrate particle physics step
      // In STILL state, use higher drag to lock them in place
      const dragCoefficient = machineState === "STILL" ? 0.6 : Config.DRAG_COEFFICIENT;
      const integrated = integrateParticle(
        px,
        py,
        vx,
        vy,
        fx,
        fy,
        dragCoefficient,
        dt
      );

      this.positions[i * 2] = integrated.x;
      this.positions[i * 2 + 1] = integrated.y;
      this.velocities[i * 2] = integrated.vx;
      this.velocities[i * 2 + 1] = integrated.vy;
    }
  }
}
export default ParticleSystem;
