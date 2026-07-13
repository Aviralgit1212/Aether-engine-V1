/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from "./Config";
import { ParticleSystem } from "../particles/ParticleSystem";
import { WebGLRenderer } from "../rendering/WebGLRenderer";
import { HandTracker } from "../hand-tracking/HandTracker";
import { HandHistory, analyzeHandLandmarks, HandState } from "../hand-tracking/HandGeometry";
import { SignatureStateMachine, MachineState } from "../signature/SignatureStateMachine";
import { EnergyEstimator } from "../signature/EnergyEstimator";
import { TextTargetSampler } from "../signature/TextTargetSampler";

export interface EngineStats {
  fps: number;
  energyLevel: number;
  gripValue: number;
  stability: number;
  state: MachineState;
  stateProgress: number;
  handDetected: boolean;
  handInGracePeriod: boolean;
}

export class EngineLoop {
  private particleSystem: ParticleSystem;
  private renderer: WebGLRenderer;
  private handTracker: HandTracker;
  private handHistory: HandHistory;
  private stateMachine: SignatureStateMachine;
  private energyEstimator: EnergyEstimator;
  private textSampler: TextTargetSampler;

  // Loop & Timer variables
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private accumulatedTime: number = 0;
  
  // Tracking status
  private handDetectedThisFrame: boolean = false;
  private lastHandState: HandState | null = null;
  private lastHandDetectionTime: number = 0;
  private handInfluenceFactor: number = 0.0; // 0 (idle) to 1 (full hand control)
  
  // Performance metrics
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  // Callback to update UI stats
  private onStatsUpdate: ((stats: EngineStats) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.particleSystem = new ParticleSystem();
    this.renderer = new WebGLRenderer(canvas);
    this.handTracker = new HandTracker();
    this.handHistory = new HandHistory(Config.STABILITY_WINDOW_MS);
    this.stateMachine = new SignatureStateMachine();
    this.energyEstimator = new EnergyEstimator();
    this.textSampler = new TextTargetSampler();

    // Set up state machine listeners
    this.stateMachine.registerOnStateChange((fromState, toState) => {
      this.handleStateTransition(fromState, toState);
    });
  }

  public registerOnStatsUpdate(cb: (stats: EngineStats) => void) {
    this.onStatsUpdate = cb;
  }

  /**
   * Triggers actions when state machine transitions
   */
  private handleStateTransition(fromState: MachineState, toState: MachineState) {
    if (toState === "FORMING_TEXT") {
      // Lazy sample text targets so we match particle count exactly
      console.log(`%c[Engine] Sampling text points for "${Config.SIGNATURE_TEXT}"`, "color: #D4AF37");
      const targets = this.textSampler.sampleTextPoints(Config.SIGNATURE_TEXT, this.particleSystem.count);
      this.particleSystem.setTargetPositions(targets);
    } else if (toState === "IDLE" || (fromState === "DISSOLVING" && toState === "GATHERING")) {
      // Clear targets once finished dissolving
      console.log("[Engine] Clearing text targets.");
      this.particleSystem.clearTargetPositions();
    }
  }

  /**
   * Boots the engine, registers hand tracker callbacks, and kicks off requestAnimationFrame.
   */
  public async start(onError?: (err: string) => void) {
    this.lastFrameTime = performance.now();
    this.lastHandDetectionTime = 0;
    this.handInfluenceFactor = 0.0;
    
    try {
      // Start tracking
      await this.handTracker.initialize({
        onLoaded: () => {
          console.log("[Engine] MediaPipe HandLandmarker loaded successfully.");
        },
        onError: (err) => {
          console.error("[Engine Hand Tracking Error]:", err);
          if (onError) onError(err);
        },
        onTrackingResult: (result) => {
          const now = Date.now();
          if (result.landmarks && result.landmarks.length > 0) {
            this.handDetectedThisFrame = true;
            this.lastHandDetectionTime = now;
            
            // Analyze normalized coordinates (X left-to-right, Y top-to-bottom)
            // To map camera mirrors naturally to screen, we invert X coordinate (MediaPipe 0 is top-left, 1 is right)
            // Our WebGL rendering treats X=0 as left, X=1 as right.
            // In standard laptop webcams, mirroring X makes interaction feel intuitive
            const rawLandmarks = result.landmarks[0];
            const mirroredLandmarks = rawLandmarks.map((landmark) => ({
              x: 1.0 - landmark.x, // Mirror coordinate
              y: landmark.y,
              z: landmark.z,
            }));

            this.lastHandState = analyzeHandLandmarks(mirroredLandmarks, this.handHistory, now);
          } else {
            this.handDetectedThisFrame = false;
          }
        },
      });

      // Start Raf
      this.loop(this.lastFrameTime);
    } catch (err: any) {
      console.error("[Engine Start Exception]:", err);
      if (onError) onError(err.message || String(err));
    }
  }

  /**
   * Stops the engine loop and releases camera resources
   */
  public stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.handTracker.destroy();
    this.renderer.destroy();
    this.stateMachine.reset();
    this.energyEstimator.reset();
    this.particleSystem.resetToCenter();
    this.handHistory.clear();
  }

  /**
   * Main requestAnimationFrame loop
   */
  private loop = (timestamp: number) => {
    this.animationFrameId = requestAnimationFrame(this.loop);

    // Limit delta time to avoid physics explosion on background tab freeze
    let dt = (timestamp - this.lastFrameTime) / 1000.0;
    this.lastFrameTime = timestamp;
    if (dt > 0.1) dt = 0.1;

    this.accumulatedTime += dt;

    // 1. Process Hand Tracker inference (reads current webcam frame)
    this.handTracker.update();

    // 2. Compute Hand Lost Behavior & Grace Period (Section 4.2)
    const now = Date.now();
    let isHandPresent = this.handDetectedThisFrame;
    let inGracePeriod = false;

    if (!isHandPresent && this.lastHandDetectionTime > 0) {
      const elapsedSinceLost = now - this.lastHandDetectionTime;
      if (elapsedSinceLost < Config.HAND_LOST_GRACE_DURATION_MS) {
        // Tolerating dropout (Grace Period active)
        isHandPresent = true;
        inGracePeriod = true;
      }
    }

    // Smoothly interpolate hand influence factor:
    // Climbing to 1.0 when active, drifting down to 0.0 when completely lost
    const blendSpeed = isHandPresent ? 4.0 : 0.6; // returns to idle slower than engaging
    const targetInfluence = isHandPresent ? 1.0 : 0.0;
    this.handInfluenceFactor += (targetInfluence - this.handInfluenceFactor) * blendSpeed * dt;

    // 3. Update dynamic Energy Level (Section 5.1)
    let currentEnergyPct = 0.0;
    if (isHandPresent && this.lastHandState) {
      this.energyEstimator.update(this.particleSystem, dt);
      currentEnergyPct = this.energyEstimator.getEnergyLevel();
    } else {
      // Natural decay if no hand is controlling the system
      const decayRate = 35.0; // decay 35% of energy per second
      const currentEnergyFraction = Math.max(0.0, this.energyEstimator.getEnergyFraction() - (decayRate / 100.0) * dt);
      // Re-apply to estimator
      this.energyEstimator.reset();
      this.energyEstimator.update({
        ...this.particleSystem,
        // Mock a zero update
        count: 0,
        positions: new Float32Array(0),
      } as any, 0);
      // Force set current energy
      (this.energyEstimator as any).currentEnergy = currentEnergyFraction;
      currentEnergyPct = currentEnergyFraction * 100.0;
    }

    // 4. Tick the Signature State Machine (Section 5.6)
    const gripValue = (isHandPresent && this.lastHandState) ? this.lastHandState.gripValue : 0.0;
    const stabilityMetric = (isHandPresent && this.lastHandState) ? this.lastHandState.stability : 999.0;

    // Modify inputs with handInfluenceFactor to guarantee smooth blending back to idle
    const combinedGrip = gripValue * this.handInfluenceFactor;
    
    this.stateMachine.update(
      dt,
      this.handInfluenceFactor > 0.02, // counts as detected as long as influence is non-zero
      currentEnergyPct,
      combinedGrip,
      stabilityMetric
    );

    const activeMachineState = this.stateMachine.getState();
    const activeStateProgress = this.stateMachine.getStateProgress();

    // 5. Update Particle Physics Simulation
    this.particleSystem.update(
      dt,
      this.accumulatedTime,
      this.handInfluenceFactor > 0.01,
      this.lastHandState ? {
        ...this.lastHandState,
        // Scale fingertip forces with hand influence factor for seamless transitions
        gripValue: combinedGrip,
        fingerExtensions: this.lastHandState.fingerExtensions.map((ext) => ext * this.handInfluenceFactor),
      } : null,
      activeMachineState,
      activeStateProgress
    );

    // 6. Draw particles and background video to WebGL Canvas
    this.renderer.render(
      this.particleSystem.positions,
      this.particleSystem.colors,
      this.particleSystem.sizes,
      this.particleSystem.count,
      this.handTracker.getVideoElement()
    );

    // 7. Track FPS performance (Section 6.4)
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;

      // Broadcast stats to callback
      if (this.onStatsUpdate) {
        this.onStatsUpdate({
          fps: this.fps,
          energyLevel: currentEnergyPct,
          gripValue: combinedGrip,
          stability: isHandPresent ? stabilityMetric : 0,
          state: activeMachineState,
          stateProgress: activeStateProgress,
          handDetected: isHandPresent,
          handInGracePeriod: inGracePeriod,
        });
      }
    }
  };
}
export default EngineLoop;
