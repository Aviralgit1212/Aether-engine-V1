/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AppConfig {
  // Particle Simulation parameters
  PARTICLE_COUNT: number;
  PARTICLE_MIN_SIZE: number;
  PARTICLE_MAX_SIZE: number;
  
  // Physics & Forces
  DRAG_COEFFICIENT: number; // how fast particles slow down (damping)
  SPRING_STRENGTH: number;  // pulling force to palm target (macro layer)
  SPRING_DAMPING: number;   // damping for the spring force
  
  ATTRACTOR_STRENGTH: number; // local fingertip force scale (micro layer)
  ATTRACTOR_RADIUS: number;   // max distance for local finger attraction
  
  IDLE_NOISE_SCALE: number;   // simplex noise spatial frequency for idle drift
  IDLE_NOISE_STRENGTH: number;// simplex noise force magnitude
  IDLE_NOISE_SPEED: number;   // how fast the noise field shifts over time
  IDLE_SHIMMER_SPEED: number; // frequency of particle opacity oscillation
  
  // Hand Tracking Configuration
  HAND_CONFIDENCE_THRESHOLD: number;
  HAND_LOST_GRACE_DURATION_MS: number; // 3-5 seconds grace period
  
  // Fist Compression
  FIST_GRIP_THRESHOLD: number; // grip value above which fist is considered closed
  FIST_COMPRESSION_STRENGTH: number; // force pulling particles inward during fist
  
  // Signature Trigger Parameters
  ENERGY_CAPTURE_RADIUS: number; // distance around palm centroid to capture particles
  ENERGY_READY_THRESHOLD: number; // 90%
  ENERGY_SMOOTHING: number;      // exponential moving average smoothing factor (0 to 1)
  
  FIST_HOLD_DURATION_MS: number; // 1.5 - 2.0 seconds hold
  STABILITY_EPSILON: number;     // max movement of hand centroid to count as stable
  STABILITY_WINDOW_MS: number;   // duration over which stability is measured
  
  // Signature Sequence Stage Timings (Seconds)
  STAGE_COMPRESS_DURATION: number;
  STAGE_VIBRATE_DURATION: number;
  STAGE_VIBRATE_DECAY_DURATION: number;
  STAGE_STILL_DURATION: number;
  STAGE_FORMING_DURATION: number;
  STAGE_TEXT_HOLD_DURATION: number;
  STAGE_DISSOLVE_DURATION: number;
  
  SIGNATURE_TEXT: string;
}

export const Config: AppConfig = {
  PARTICLE_COUNT: 5000,
  PARTICLE_MIN_SIZE: 1.5,
  PARTICLE_MAX_SIZE: 4.5,
  
  DRAG_COEFFICIENT: 0.08,
  SPRING_STRENGTH: 0.15,
  SPRING_DAMPING: 0.92,
  
  ATTRACTOR_STRENGTH: 0.35,
  ATTRACTOR_RADIUS: 0.4, // Normalized coordinates (0 to 1 screen space)
  
  IDLE_NOISE_SCALE: 1.5,
  IDLE_NOISE_STRENGTH: 0.008,
  IDLE_NOISE_SPEED: 0.3,
  IDLE_SHIMMER_SPEED: 2.0,
  
  HAND_CONFIDENCE_THRESHOLD: 0.5,
  HAND_LOST_GRACE_DURATION_MS: 3000, // 3 seconds
  
  FIST_GRIP_THRESHOLD: 0.82,
  FIST_COMPRESSION_STRENGTH: 0.5,
  
  ENERGY_CAPTURE_RADIUS: 0.25,
  ENERGY_READY_THRESHOLD: 0.90, // 90%
  ENERGY_SMOOTHING: 0.1,        // Smoother energy updates
  
  FIST_HOLD_DURATION_MS: 1600,  // 1.6 seconds
  STABILITY_EPSILON: 0.05,      // Hand moves less than 5% of screen width/height
  STABILITY_WINDOW_MS: 1600,
  
  STAGE_COMPRESS_DURATION: 1.2,
  STAGE_VIBRATE_DURATION: 1.5,
  STAGE_VIBRATE_DECAY_DURATION: 0.8,
  STAGE_STILL_DURATION: 1.0,
  STAGE_FORMING_DURATION: 2.0,
  STAGE_TEXT_HOLD_DURATION: 4.0,
  STAGE_DISSOLVE_DURATION: 2.0,
  
  SIGNATURE_TEXT: "AVIRAL"
};
