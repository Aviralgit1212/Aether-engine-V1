/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from "@mediapipe/tasks-vision";

export interface TrackerCallbacks {
  onLoaded?: () => void;
  onError?: (err: string) => void;
  onTrackingResult?: (result: HandLandmarkerResult) => void;
}

export class HandTracker {
  private handLandmarker: HandLandmarker | null = null;
  private activeToken: symbol | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private mediaStream: MediaStream | null = null;
  private isTrackerActive: boolean = false;
  private isLoading: boolean = false;
  private isLoaded: boolean = false;
  private callbacks: TrackerCallbacks | null = null;

  constructor() {
    console.log("[HandTracker] Constructing HandTracker instance...");
  }

  private ensureVideoElement(): HTMLVideoElement {
    if (!this.videoElement) {
      console.log("[HandTracker] Initializing hidden video element for local stream...");
      this.videoElement = document.createElement("video");
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;
      this.videoElement.muted = true;
      this.videoElement.style.display = "none";
      if (document.body) {
        document.body.appendChild(this.videoElement);
      } else {
        document.documentElement.appendChild(this.videoElement);
      }
    }
    return this.videoElement;
  }

  /**
   * Initializes MediaPipe model and starts the camera
   */
  public async initialize(callbacks?: TrackerCallbacks): Promise<void> {
    if (this.isLoading || this.isLoaded) return;
    this.isLoading = true;

    const token = Symbol("hand-tracker-init");
    this.activeToken = token;

    if (callbacks) {
      this.callbacks = callbacks;
    }

    try {
      this.ensureVideoElement();

      console.log("[HandTracker] Step 1/4: Requesting local user webcam permissions...");
      await this.startCamera(token);
      if (this.activeToken !== token) return this.abortInit();

      console.log("[HandTracker] Step 2/4: Waiting for video stream metadata to load...");
      await this.waitForVideoMetadata();
      if (this.activeToken !== token) return this.abortInit();

      console.log("[HandTracker] Step 3/4: Activating webcam stream playback...");
      await this.playVideo();
      if (this.activeToken !== token) return this.abortInit();

      console.log("[HandTracker] Step 4/4: Video is active. Loading MediaPipe fileset resolver and models...");

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
      );
      if (this.activeToken !== token) return this.abortInit();

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      if (this.activeToken !== token) {
        this.handLandmarker?.close();
        this.handLandmarker = null;
        return this.abortInit();
      }

      console.log("[HandTracker] Step 4/4: HandLandmarker initialized successfully. Ready to detect!");

      this.isLoaded = true;
      this.isTrackerActive = true;
      this.isLoading = false;

      if (this.callbacks?.onLoaded) {
        this.callbacks.onLoaded();
      }
    } catch (err: any) {
      this.isLoading = false;
      if (this.activeToken !== token) return; // superseded by destroy(); swallow
      const errMsg = err.message || "Failed to load hand tracking system assets.";
      console.error("[HandTracker Error during initialize]:", err);
      if (this.callbacks?.onError) {
        this.callbacks.onError(errMsg);
      }
      throw err;
    }
  }

  private abortInit() {
    console.log("[HandTracker] Initialization aborted (destroy() called mid-flight).");
    this.isLoading = false;
  }
  private async startCamera(token: symbol): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera API (getUserMedia) not supported in this browser. Please use Chrome/Firefox/Safari.");
    }

    try {
      this.ensureVideoElement();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        },
        audio: false,
      });

      // If destroy() ran while we were awaiting the camera, don't attach
      // a stream to a torn-down tracker — release it and bail out cleanly.
      if (this.activeToken !== token) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      this.mediaStream = stream;
      console.log("[HandTracker] Camera MediaStream obtained successfully:", this.mediaStream.id);

      // Re-ensure the element in case something removed it during the await.
      this.ensureVideoElement();

      if (this.videoElement) {
        this.videoElement.srcObject = this.mediaStream;
        console.log("[HandTracker] MediaStream assigned to video.srcObject.");
      } else {
        throw new Error("Video element is missing during camera assignment.");
      }
    } catch (err: any) {
      console.error("[HandTracker] getUserMedia error:", err);
      const errName = err.name || "";
      const isPermissionDenied = errName === "NotAllowedError" || errName === "PermissionDeniedError" || String(err).includes("denied");

      let errMsg = "Camera permission denied or camera device not found. Please enable camera access in your browser bar.";
      if (isPermissionDenied) {
        errMsg = "Camera permission denied. If you are viewing inside an iframe/preview mode, please click 'Open in New Tab' to bypass security sandbox constraints.";
      } else if (err.message) {
        errMsg = `Webcam Error: ${err.message}`;
      }
      throw new Error(errMsg);
    }
  }

  private async waitForVideoMetadata(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const video = this.videoElement;
      if (!video) {
        return reject(new Error("Video element is not available."));
      }

      // If already has metadata
      if (video.readyState >= 1) {
        console.log("[HandTracker] Video metadata already loaded. readyState:", video.readyState);
        return resolve();
      }

      const onLoadedMetadata = () => {
        cleanup();
        console.log("[HandTracker] Video metadata loaded. dimensions:", video.videoWidth, "x", video.videoHeight);
        resolve();
      };

      const onError = (e: any) => {
        cleanup();
        reject(new Error("Failed to load video stream metadata."));
      };

      const cleanup = () => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.removeEventListener("error", onError);
      };

      video.addEventListener("loadedmetadata", onLoadedMetadata);
      video.addEventListener("error", onError);

      // Timeout fallback after 10 seconds
      setTimeout(() => {
        cleanup();
        if (video.readyState >= 1) {
          resolve();
        } else {
          reject(new Error("Timeout waiting for camera stream metadata."));
        }
      }, 10000);
    });
  }

  private async playVideo(): Promise<void> {
    const video = this.videoElement;
    if (!video) {
      throw new Error("Video element is not available for playback.");
    }

    try {
      await video.play();
      console.log("[HandTracker] video.play() resolved successfully. Current time:", video.currentTime);
      
      // Double check that it's actually rendering frames
      await new Promise<void>((resolve, reject) => {
        const checkPlaying = () => {
          if (video.currentTime > 0) {
            console.log("[HandTracker] Video is actively playing. Ready for inference.");
            resolve();
          } else {
            setTimeout(checkPlaying, 50);
          }
        };
        checkPlaying();
        
        // Timeout after 5 seconds
        setTimeout(() => {
          resolve(); // Resolve anyway to proceed
        }, 5000);
      });

    } catch (err: any) {
      console.error("[HandTracker] video.play() failed:", err);
      throw new Error(`Failed to play webcam stream: ${err.message || err}`);
    }
  }

  /**
   * Performs Hand detection inference on the current video frame if tracker is active.
   * Runs inside the render loop requestAnimationFrame.
   */
  public update(callbacks?: TrackerCallbacks) {
    if (!this.isTrackerActive || !this.handLandmarker || !this.videoElement) {
      return;
    }

    const activeCallbacks = callbacks || this.callbacks;

    // Check if video has enough data
    if (this.videoElement.readyState >= 2) {
      const startTimeMs = performance.now();
      
      try {
        const result = this.handLandmarker.detectForVideo(this.videoElement, startTimeMs);
        if (activeCallbacks?.onTrackingResult) {
          activeCallbacks.onTrackingResult(result);
        }
      } catch (err) {
        console.error("[HandTracker] Error detecting hand for video frame:", err);
      }
    }
  }

  /**
   * Release camera and tracker resources
   */
  public destroy() {
    console.log("[HandTracker] Destroying hand tracker and releasing camera...");
    // Invalidate any in-flight initialize() so it aborts on its next
    // await-boundary check instead of operating on torn-down state.
    this.activeToken = null;
    this.isTrackerActive = false;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        console.log("[HandTracker] Stopping track:", track.label);
        track.stop();
      });
      this.mediaStream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement.remove();
      this.videoElement = null;
    }

    if (this.handLandmarker) {
      try {
        this.handLandmarker.close();
      } catch (err) {
        console.error("[HandTracker] Error closing hand landmarker:", err);
      }
      this.handLandmarker = null;
    }

    this.isLoaded = false;
    this.isLoading = false;
    this.callbacks = null;
}

  public isReady(): boolean {
    return this.isLoaded && this.isTrackerActive;
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }
}
export default HandTracker;
