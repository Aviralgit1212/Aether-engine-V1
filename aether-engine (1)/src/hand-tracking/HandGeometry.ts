/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface HandState {
  palmCentroid: { x: number; y: number; z: number };
  handScale: number;
  gripValue: number; // 0 = open, 1 = tight fist
  fingerExtensions: number[]; // [thumb, index, middle, ring, pinky], each 0 (curled) to 1 (extended)
  fingertips: { x: number; y: number; z: number }[]; // coordinates of five fingertips
  velocity: { x: number; y: number };
  stability: number; // metric of how stable the hand is (lower is more stable)
}

// MediaPipe landmarks structure for fingers:
// Thumb: 1-4, Index: 5-8, Middle: 9-12, Ring: 13-16, Pinky: 17-20
const FINGER_TIPS = [4, 8, 12, 16, 20];
const FINGER_MCPS = [2, 5, 9, 13, 17];

// Helper to compute distance in 3D
function distance3D(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Helper to compute distance in 2D
function distance2D(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Rolling history for velocity and stability
export class HandHistory {
  private history: { centroid: { x: number; y: number; z: number }; time: number }[] = [];
  private maxDurationMs: number;

  constructor(maxDurationMs: number = 2000) {
    this.maxDurationMs = maxDurationMs;
  }

  public add(centroid: { x: number; y: number; z: number }, time: number) {
    this.history.push({ centroid, time });
    this.clean(time);
  }

  private clean(now: number) {
    const cutOff = now - this.maxDurationMs;
    while (this.history.length > 0 && this.history[0].time < cutOff) {
      this.history.shift();
    }
  }

  public getVelocity(now: number): { x: number; y: number } {
    if (this.history.length < 2) {
      return { x: 0, y: 0 };
    }
    // Calculate velocity based on recent items
    const start = this.history[0];
    const end = this.history[this.history.length - 1];
    const dt = (end.time - start.time) / 1000; // seconds
    if (dt <= 0) return { x: 0, y: 0 };
    
    return {
      x: (end.centroid.x - start.centroid.x) / dt,
      y: (end.centroid.y - start.centroid.y) / dt,
    };
  }

  // Stability: maximum distance between any two centroids in the history window
  public getStabilityMetric(): number {
    if (this.history.length < 2) {
      return 0.0;
    }
    let maxDist = 0;
    for (let i = 0; i < this.history.length; i++) {
      for (let j = i + 1; j < this.history.length; j++) {
        const d = distance2D(this.history[i].centroid, this.history[j].centroid);
        if (d > maxDist) {
          maxDist = d;
        }
      }
    }
    return maxDist;
  }

  public clear() {
    this.history = [];
  }
}

/**
 * Derives hand structural parameters and grip values from raw landmarks.
 * Assumes coordinates are already normalized or in coordinate space.
 */
export function analyzeHandLandmarks(
  landmarks: Landmark[],
  history?: HandHistory,
  now: number = Date.now()
): HandState {
  if (!landmarks || landmarks.length < 21) {
    throw new Error("Invalid or incomplete landmarks list. Minimum 21 landmarks required.");
  }

  const wrist = landmarks[0];
  const middleMcp = landmarks[9];

  // 1. Hand scale baseline: wrist to middle MCP
  const handScale = distance3D(wrist, middleMcp);

  // 2. Palm Centroid: average of MCPs and Wrist
  const palmCentroid = {
    x: (wrist.x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5,
    y: (wrist.y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5,
    z: (wrist.z + landmarks[5].z + landmarks[9].z + landmarks[13].z + landmarks[17].z) / 5,
  };

  // Add to rolling history if provided
  if (history) {
    history.add(palmCentroid, now);
  }

  // 3. Fingertip coordinates
  const fingertips = FINGER_TIPS.map((tipIdx) => ({
    x: landmarks[tipIdx].x,
    y: landmarks[tipIdx].y,
    z: landmarks[tipIdx].z,
  }));

  // 4. Continuous grip value: derived from average fingertip-to-centroid distance.
  // When hand is open, average distance is high (~1.6x handScale). When closed, it shrinks (~0.6x handScale).
  let sumTipDist = 0;
  for (let i = 0; i < fingertips.length; i++) {
    sumTipDist += distance3D(fingertips[i], palmCentroid);
  }
  const avgTipDist = sumTipDist / 5;
  const normalizedAvgTipDist = handScale > 0 ? avgTipDist / handScale : 1.2;

  // Map normalized average distance [0.65, 1.65] to grip value [1.0, 0.0]
  const minGripDist = 0.65;
  const maxGripDist = 1.65;
  let gripValue = 1.0 - (normalizedAvgTipDist - minGripDist) / (maxGripDist - minGripDist);
  gripValue = Math.max(0, Math.min(1.0, gripValue));

  // 5. Finger extensions: separate extension for each of the 5 fingers
  // We measure distance from fingertip to its respective MCP joint, normalized by hand scale.
  // For thumb, we check Tip 4 to MCP 2 relative to hand scale.
  const fingerExtensions = FINGER_TIPS.map((tipIdx, index) => {
    const mcpIdx = FINGER_MCPS[index];
    const tip = landmarks[tipIdx];
    const mcp = landmarks[mcpIdx];
    const dist = distance3D(tip, mcp);
    const normDist = handScale > 0 ? dist / handScale : 0.8;

    // Define extension bounds: fully curled (min) and fully extended (max)
    // Thumb: [0.35, 1.0], Fingers: [0.55, 1.5]
    const minExt = index === 0 ? 0.35 : 0.55;
    const maxExt = index === 0 ? 0.95 : 1.45;
    
    let extension = (normDist - minExt) / (maxExt - minExt);
    return Math.max(0, Math.min(1.0, extension));
  });

  // Calculate velocity and stability if history is active
  const velocity = history ? history.getVelocity(now) : { x: 0, y: 0 };
  const stability = history ? history.getStabilityMetric() : 0.0;

  return {
    palmCentroid,
    handScale,
    gripValue,
    fingerExtensions,
    fingertips,
    velocity,
    stability,
  };
}
