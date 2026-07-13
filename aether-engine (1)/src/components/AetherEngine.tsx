/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { EngineLoop, EngineStats } from "../core/EngineLoop";
import { Play, RotateCcw, AlertCircle, Camera, ShieldAlert } from "lucide-react";

interface AetherEngineProps {
  onStatsUpdate: (stats: EngineStats) => void;
  isActive: boolean;
  onActiveChange: (active: boolean) => void;
  debugOverlayVisible: boolean;
}

export const AetherEngine: React.FC<AetherEngineProps> = ({
  onStatsUpdate,
  isActive,
  onActiveChange,
  debugOverlayVisible,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<EngineLoop | null>(null);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<"idle" | "loading" | "running" | "error">("idle");

  const startEngine = async () => {
    if (!canvasRef.current) return;
    
    setLoadingState("loading");
    setErrorMsg(null);
    onActiveChange(true);

    try {
      // 1. Create engine loop instance
      const engine = new EngineLoop(canvasRef.current);
      engineRef.current = engine;

      // 2. Register stats update
      engine.registerOnStatsUpdate((stats) => {
        onStatsUpdate(stats);
      });

      // 3. Launch engine (loads MediaPipe and requests camera access)
      await engine.start((err) => {
        setErrorMsg(err);
        setLoadingState("error");
        onActiveChange(false);
      });

      setLoadingState("running");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initialize Aether Engine.");
      setLoadingState("error");
      onActiveChange(false);
    }
  };

  const stopEngine = () => {
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }
    setLoadingState("idle");
    onActiveChange(false);
  };

  const resetParticles = () => {
    if (engineRef.current) {
      const particleSys = (engineRef.current as any).particleSystem;
      if (particleSys) {
        particleSys.resetToCenter();
      }
    }
  };

  // Keep eye on activation state from parent
  useEffect(() => {
    if (isActive && loadingState === "idle") {
      startEngine();
    } else if (!isActive && loadingState === "running") {
      stopEngine();
    }
    
    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
    };
  }, [isActive]);

  return (
    <div id="aether-engine-container" className="relative w-full h-[65vh] md:h-[75vh] rounded-xl overflow-hidden border border-gold/20 bg-[#050505] shadow-2xl">
      
      {/* 1. Grid Background Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.06] z-0" 
        style={{ 
          backgroundImage: "radial-gradient(#D4AF37 0.8px, transparent 0.8px)", 
          backgroundSize: "24px 24px" 
        }} 
      />

      {/* 2. Canvas element */}
      <canvas
        id="aether-webgl-canvas"
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair relative z-10"
      />

      {/* 3. Soft Gold Vignette & Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-gold/20 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(5,5,5,0.9)_100%)] z-20" />

      {/* 4. Overlay Loading / Welcome Screen */}
      {loadingState === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/90 text-center animate-fade-in z-30">
          <div className="w-16 h-16 rounded-full border border-gold/30 flex items-center justify-center bg-gold/5 mb-6 animate-pulse shadow-xl shadow-gold/5">
            <Camera className="w-7 h-7 text-gold" />
          </div>
          <h3 className="font-serif text-xl tracking-wider text-gold mb-2">
            Camera Connection Required
          </h3>
          <p className="max-w-md text-neutral-400 text-xs md:text-sm mb-8 leading-relaxed font-sans px-4">
            Aether Engine utilizes local MediaPipe Hand Landmarker to track your palm and fingers. Your camera stream is processed locally inside your browser and is never uploaded or saved.
          </p>
          <div className="flex flex-col items-center gap-4">
            <button
              id="btn-activate-engine"
              onClick={startEngine}
              className="px-8 py-3 bg-gold hover:bg-gold-bright text-black font-semibold text-xs tracking-widest uppercase rounded shadow-lg hover:shadow-gold/20 active:scale-98 transition duration-300 cursor-pointer"
            >
              Engage Camera & Launch
            </button>
            <a
              id="link-welcome-standalone"
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-gold text-[11px] font-mono tracking-wider transition duration-200 border-b border-dashed border-neutral-800 hover:border-gold"
            >
              Prefer standalone window? Open in New Tab
            </a>
          </div>
        </div>
      )}

      {/* 5. Loading State */}
      {loadingState === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/95 text-center z-30">
          <div className="relative w-20 h-20 mb-8">
            {/* Outer Spinning Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-gold/10" />
            <div className="absolute inset-0 rounded-full border-2 border-t-gold border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            {/* Inner pulsing particle core */}
            <div className="absolute inset-4 rounded-full bg-gold/10 animate-ping" />
            <div className="absolute inset-6 rounded-full bg-gold/20 animate-pulse" />
          </div>
          <h3 className="font-serif text-lg tracking-wider text-gold uppercase mb-2 animate-pulse">
            Synthesizing Engine Core
          </h3>
          <p className="max-w-xs text-neutral-500 text-xs tracking-widest uppercase font-mono">
            Loading MediaPipe Hand Model & WASM binaries...
          </p>
        </div>
      )}

      {/* 6. Error Screen */}
      {loadingState === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/95 text-center z-30 border border-red-500/20">
          <div className="w-16 h-16 rounded-full border border-red-500/30 flex items-center justify-center bg-red-500/5 mb-6">
            <ShieldAlert className="w-8 h-8 text-red-500 animate-bounce" />
          </div>
          <h3 className="font-serif text-lg tracking-wider text-red-400 mb-2">
            Inception Interrupted
          </h3>
          <p className="max-w-md text-neutral-400 text-sm mb-4 leading-relaxed font-sans px-4">
            {errorMsg || "An error occurred while loading dependencies or accessing camera."}
          </p>
          
          <p className="max-w-md text-neutral-500 text-xs mb-8 leading-relaxed font-sans px-4">
            If browser permissions are blocked inside this preview panel, please try running the application in standalone mode using the button below.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              id="btn-retry-engine"
              onClick={startEngine}
              className="px-5 py-2.5 border border-red-500/30 hover:border-red-500/60 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-semibold text-xs tracking-wider uppercase rounded transition"
            >
              Retry Connection
            </button>
            <a
              id="link-standalone-mode"
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 border border-gold/30 hover:border-gold/60 bg-gold/5 hover:bg-gold/10 text-gold font-semibold text-xs tracking-wider uppercase rounded transition flex items-center justify-center"
            >
              Open in New Tab
            </a>
            <button
              id="btn-cancel-error"
              onClick={() => setLoadingState("idle")}
              className="px-5 py-2.5 border border-neutral-800 hover:border-neutral-700 bg-neutral-900 text-neutral-300 font-semibold text-xs tracking-wider uppercase rounded transition"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* 7. Active Engine Quick Controls Overlay */}
      {loadingState === "running" && (
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none z-30">
          {/* Status badge */}
          <div className="px-3.5 py-2 rounded-full border border-gold/30 bg-black/80 backdrop-blur-md flex items-center gap-2 pointer-events-auto">
            <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="text-[9px] tracking-widest font-semibold uppercase text-gold font-mono">
              ENGINE ACTIVE
            </span>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 pointer-events-auto">
            <button
              id="btn-reset-particles"
              onClick={resetParticles}
              title="Recenter and Reset Particles"
              className="p-2.5 rounded border border-white/10 bg-black hover:bg-neutral-900 text-neutral-400 hover:text-gold transition duration-200 cursor-pointer shadow-lg active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              id="btn-stop-engine"
              onClick={stopEngine}
              title="Disconnect Hand Tracking"
              className="px-3.5 py-2.5 rounded border border-red-500/20 bg-black/80 hover:bg-red-500/10 backdrop-blur-md text-red-400 hover:text-red-300 font-mono text-[9px] tracking-wider uppercase flex items-center gap-1.5 transition duration-200 cursor-pointer shadow-lg active:scale-95"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default AetherEngine;
