/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { AetherEngine } from "./components/AetherEngine";
import { DebugOverlay } from "./components/DebugOverlay";
import { InstructionCard } from "./components/InstructionCard";
import { EngineStats } from "./core/EngineLoop";
import { Cpu, Eye, EyeOff, Activity, Sparkles } from "lucide-react";

export default function App() {
  const [engineActive, setEngineActive] = useState<boolean>(false);
  const [debugHudVisible, setDebugHudVisible] = useState<boolean>(true);
  
  // Track live stats from WebGL loop to feed our premium telemetry panel
  const [liveStats, setLiveStats] = useState<EngineStats>({
    fps: 0,
    energyLevel: 0,
    gripValue: 0,
    stability: 999.0,
    state: "IDLE",
    stateProgress: 0.0,
    handDetected: false,
    handInGracePeriod: false,
  });

  const handleStatsUpdate = (stats: EngineStats) => {
    setLiveStats(stats);
  };

  // Compute dynamic mock inference latency based on actual render loop FPS to give high-fidelity physical feedback
  const dynamicLatency = liveStats.fps > 0 
    ? (1000 / liveStats.fps * 0.42).toFixed(1) 
    : "0.0";

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0D8D0] font-sans flex flex-col selection:bg-gold/30 selection:text-gold-bright">
      
      {/* 1. Header (Top Navigation / Brand Rail) */}
      <header className="sticky top-0 z-50 h-16 border-b border-gold/20 bg-black/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-3 h-3 bg-gold rounded-full ${engineActive ? "animate-pulse" : "opacity-40"}`} />
            <div>
              <h1 className="font-serif text-lg tracking-widest text-gold uppercase flex items-center gap-2">
                Aether Engine <span className="font-sans text-[9px] opacity-40 uppercase tracking-widest font-mono">V1.0.42</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-8 md:space-x-12">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[9px] uppercase tracking-widest opacity-40 font-mono">Inference Latency</span>
              <span className="font-mono text-xs text-gold">{engineActive ? `${dynamicLatency}ms` : "—"}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] uppercase tracking-widest opacity-40 font-mono">Frame Rate</span>
              <span className="font-mono text-xs text-gold">{liveStats.fps > 0 ? `${liveStats.fps.toFixed(1)} FPS` : "—"}</span>
            </div>

            {/* Quick Actions / HUD toggle */}
            <button
              onClick={() => setDebugHudVisible(!debugHudVisible)}
              className={`p-2 rounded-md border transition duration-300 cursor-pointer ${
                debugHudVisible
                  ? "border-gold/30 bg-gold/10 text-gold hover:bg-gold/20"
                  : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-[#E0D8D0]"
              }`}
              title={debugHudVisible ? "Hide Debug Telemetry" : "Show Debug Telemetry"}
            >
              {debugHudVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 md:py-12 flex flex-col gap-10">
        
        {/* Title & Overview Banner */}
        <div className="flex flex-col gap-3 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/5 border border-gold/20 w-fit">
            <Cpu className="w-3.5 h-3.5 text-gold animate-pulse" />
            <span className="text-[9px] font-mono tracking-widest uppercase font-semibold text-gold">
              Interactive WebGL Physics Engine
            </span>
          </div>
          <h2 className="font-serif italic text-3xl md:text-5xl tracking-wide text-gold">
            Sculpt Living Energy with Your Hands
          </h2>
          <p className="text-sm md:text-base text-neutral-400 leading-relaxed font-sans mt-1">
            Experience a fluid particle field responding dynamically to continuous physical forces. Every motion, elongation, and color transition is computed dynamically from real-time hand-landmarks.
          </p>
        </div>

        {/* Primary Interactive Zone */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left / Middle: WebGL Renderer View (takes 2 columns on desktop) */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <AetherEngine
              onStatsUpdate={handleStatsUpdate}
              isActive={engineActive}
              onActiveChange={setEngineActive}
              debugOverlayVisible={debugHudVisible}
            />

            {/* Sub-canvas info rail */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 rounded-lg bg-black/60 border border-gold/10 text-xs text-neutral-500">
              <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-gold/80">
                <Activity className="w-3.5 h-3.5 text-gold" />
                DYNAMICS: SEMI-IMPLICIT EULER INTEGRATOR
              </div>
              <div className="flex items-center gap-6 font-mono text-[10px] uppercase">
                <span>PARTICLES: <strong className="text-[#E0D8D0]">5,120</strong></span>
                <span>BUFFER MODE: <strong className="text-[#E0D8D0]">GPU INSTANCE</strong></span>
              </div>
            </div>
          </div>

          {/* Right side: Telemetry & Instruction Guide */}
          <div className="flex flex-col gap-6 lg:col-span-1">
            {/* Live Diagnostics HUD */}
            <DebugOverlay stats={liveStats} visible={debugHudVisible} />

            {/* Micro Interaction mechanics guide */}
            <InstructionCard />
          </div>

        </div>

      </main>

      {/* 3. Luxury subtle footer */}
      <footer className="h-14 border-t border-white/5 px-8 flex items-center justify-between bg-black/80 text-[9px] uppercase tracking-[0.2em] text-neutral-500">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-gold/40" />
          <span>Aether Engine System Core &copy; 2026</span>
        </div>
        <div className="flex items-center gap-6 font-mono text-[10px]">
          <span className="hidden sm:inline">Designated Prototype: #811-A</span>
          <span>Ready for deployment</span>
        </div>
      </footer>

    </div>
  );
}
