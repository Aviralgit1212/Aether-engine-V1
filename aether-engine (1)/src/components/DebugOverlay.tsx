/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { EngineStats } from "../core/EngineLoop";
import { Cpu, Activity, Zap, Sparkles, Orbit, Compass } from "lucide-react";

interface DebugOverlayProps {
  stats: EngineStats;
  visible: boolean;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ stats, visible }) => {
  if (!visible) return null;

  // Destructure with default values
  const {
    fps = 60,
    energyLevel = 0,
    gripValue = 0,
    stability = 0,
    state = "IDLE",
    stateProgress = 0,
    handDetected = false,
    handInGracePeriod = false,
  } = stats || {};

  // Custom visual indicators depending on current active state
  const getStateColor = (s: string) => {
    switch (s) {
      case "IDLE":
        return "text-neutral-500 border-neutral-900 bg-neutral-950/40";
      case "GATHERING":
        return "text-blue-400 border-blue-500/20 bg-blue-500/5 animate-pulse";
      case "READY":
        return "text-gold border-gold/30 bg-gold/10 shadow-[0_0_15px_rgba(212,175,55,0.15)]";
      case "HOLDING_FIST":
        return "text-gold italic font-serif border-gold/40 bg-gold/15 shadow-[0_0_20px_rgba(212,175,55,0.25)]";
      case "COMPRESSING":
        return "text-red-400 border-red-500/40 bg-red-500/10";
      case "VIBRATING":
      case "VIBRATION_DECAY":
        return "text-red-500 border-red-500/50 bg-red-500/15 animate-pulse";
      case "STILL":
        return "text-rose-300 border-rose-500/20 bg-rose-950/20";
      case "FORMING_TEXT":
      case "TEXT_HOLD":
        return "text-gold-bright border-gold/50 bg-gold/20 shadow-[0_0_25px_rgba(212,175,55,0.3)] animate-pulse font-serif tracking-widest";
      case "DISSOLVING":
        return "text-neutral-400 border-neutral-700 bg-neutral-900";
      default:
        return "text-neutral-400 border-neutral-800 bg-neutral-900/40";
    }
  };

  // Check stability epsilon (0.05 from Config)
  const isStable = stability <= 0.05;

  return (
    <div
      id="hud-telemetry-panel"
      className="w-full bg-black/60 backdrop-blur-md rounded-xl border border-gold/15 p-6 flex flex-col gap-6 font-sans shadow-2xl"
    >
      {/* HUD Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <Cpu className="w-4 h-4 text-gold animate-pulse" />
          <h4 className="text-xs font-serif tracking-widest uppercase text-gold">
            System Telemetry HUD
          </h4>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-neutral-400">
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          FEED: LOCAL INFERENCE
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Core FPS */}
        <div className="border border-white/5 bg-black/40 p-3.5 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-wider uppercase text-neutral-500 font-mono mb-1">
              RENDER RATE
            </p>
            <p className="text-xl font-bold text-gold font-mono tracking-tight">
              {fps} <span className="text-xs font-normal text-neutral-500 font-sans">FPS</span>
            </p>
          </div>
          <Activity className={`w-5 h-5 ${fps >= 55 ? "text-gold" : "text-neutral-600"}`} />
        </div>

        {/* Tracking Confidence / Status */}
        <div className="border border-white/5 bg-black/40 p-3.5 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-wider uppercase text-neutral-500 font-mono mb-1">
              CAMERA LINK
            </p>
            <p className="text-xs font-bold font-mono tracking-wide">
              {handDetected ? (
                handInGracePeriod ? (
                  <span className="text-gold animate-pulse">SIGNAL LOST</span>
                ) : (
                  <span className="text-gold">STABLE FEED</span>
                )
              ) : (
                <span className="text-neutral-600">STANDBY</span>
              )}
            </p>
          </div>
          <Orbit className={`w-5 h-5 ${handDetected ? (handInGracePeriod ? "text-gold animate-ping" : "text-gold") : "text-neutral-800"}`} />
        </div>
      </div>

      {/* State Machine Panel */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] tracking-wider uppercase text-neutral-500 font-mono">
          ENGINE STATE MACHINE
        </label>
        <div className={`border p-4 rounded-lg flex flex-col gap-2.5 transition duration-300 ${getStateColor(state)}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold font-mono tracking-wider">{state}</span>
            <span className="text-[9px] tracking-widest font-mono uppercase bg-black px-2 py-0.5 rounded border border-white/5">
              {state === "IDLE" || state === "GATHERING" || state === "READY" || state === "HOLDING_FIST"
                ? "INTERACTIVE"
                : "SEQUENTIAL SEQUENCE"}
            </span>
          </div>

          {/* Sequential Progress Bar */}
          {stateProgress > 0 && (
            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex justify-between text-[8px] font-mono tracking-wider text-neutral-400 uppercase">
                <span>Phase Progress</span>
                <span>{Math.round(stateProgress * 100)}%</span>
              </div>
              <div className="h-1 w-full bg-neutral-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-gold to-gold-bright transition-all duration-100 ease-out"
                  style={{ width: `${stateProgress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sliders / Metrics Progress indicators */}
      <div className="flex flex-col gap-4">
        {/* 1. Energy level */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] font-mono tracking-wider text-neutral-400">
            <span className="flex items-center gap-1">
              <Zap className={`w-3.5 h-3.5 ${energyLevel >= 90 ? "text-gold" : "text-blue-400"}`} />
              CORE ENERGY DENSITY
            </span>
            <span className={`font-bold ${energyLevel >= 90 ? "text-gold animate-pulse" : "text-neutral-400"}`}>
              {energyLevel.toFixed(1)}% {energyLevel >= 90 ? "[READY]" : ""}
            </span>
          </div>
          <div className="h-2 w-full bg-[#1A1A1A] rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-150 ${energyLevel >= 90 ? "bg-gradient-to-r from-gold via-gold-bright to-white shadow-[0_0_8px_rgba(212,175,55,0.5)]" : "bg-gradient-to-r from-blue-900 via-purple-800 to-[#D4AF37]"}`}
              style={{ width: `${energyLevel}%` }}
            />
          </div>
        </div>

        {/* 2. Fist grip value */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] font-mono tracking-wider text-neutral-400">
            <span className="flex items-center gap-1">
              <Sparkles className={`w-3.5 h-3.5 ${gripValue >= 0.82 ? "text-gold" : "text-neutral-600"}`} />
              CONTINUOUS SQUEEZE (GRIP)
            </span>
            <span className={`font-bold ${gripValue >= 0.82 ? "text-gold" : "text-neutral-400"}`}>
              {gripValue.toFixed(2)} / 1.00 {gripValue >= 0.82 ? "[COMPRESSED]" : ""}
            </span>
          </div>
          <div className="h-2 w-full bg-[#1A1A1A] rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-150 ${gripValue >= 0.82 ? "bg-gradient-to-r from-blue-900 via-purple-800 to-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.5)]" : "bg-neutral-800"}`}
              style={{ width: `${gripValue * 100}%` }}
            />
          </div>
        </div>

        {/* 3. Hand Stability */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] font-mono tracking-wider text-neutral-400">
            <span className="flex items-center gap-1">
              <Compass className={`w-3.5 h-3.5 ${isStable ? "text-gold" : "text-rose-500"}`} />
              CENTROID STABILITY
            </span>
            <span className={`font-bold ${isStable ? "text-gold" : "text-rose-400"}`}>
              {stability === 999.0 ? "N/A" : stability.toFixed(4)} {stability !== 999.0 && (isStable ? "[STABLE]" : "[DRIFTING]")}
            </span>
          </div>
          <div className="flex gap-1.5 mt-0.5">
            <div className={`h-1.5 flex-1 rounded-full ${stability !== 999.0 && isStable ? "bg-gold" : "bg-neutral-900"}`} />
            <div className={`h-1.5 flex-1 rounded-full ${stability !== 999.0 && !isStable ? "bg-rose-500 animate-pulse" : "bg-neutral-900"}`} />
          </div>
        </div>
      </div>
    </div>
  );
};
export default DebugOverlay;
