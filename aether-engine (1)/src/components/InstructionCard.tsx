/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Hand, Eye, Zap, Sparkles, Sliders } from "lucide-react";

export const InstructionCard: React.FC = () => {
  return (
    <div id="interaction-guide-panel" className="bg-black/60 border border-gold/15 rounded-xl p-6 flex flex-col gap-6 text-[#E0D8D0]/80 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2.5 border-b border-white/5 pb-4">
        <Sliders className="w-4 h-4 text-gold" />
        <h3 className="font-serif text-xs tracking-widest uppercase text-gold">
          Interaction Mechanics
        </h3>
      </div>

      <div className="flex flex-col gap-5 text-sm">
        {/* Layer 1 */}
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded bg-blue-900/10 border border-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
            <Hand className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-[#E0D8D0] uppercase tracking-wider mb-1">
              Global Control <span className="text-neutral-500 font-mono">(Macro Layer)</span>
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Your palm center controls the target center of mass of the nebula. The particles are bound by continuous spring/damping models, creating physical weight, inertia, and fluid trailing.
            </p>
          </div>
        </div>

        {/* Layer 2 */}
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded bg-indigo-900/10 border border-indigo-900/30 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-[#E0D8D0] uppercase tracking-wider mb-1">
              Fingertip Sculpting <span className="text-neutral-500 font-mono">(Micro Layer)</span>
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Each extended finger acts as an active vector attractor. Finger joint angles scale the force fields continuously. Spacing your fingers lets you sculpt and split streams organically.
            </p>
          </div>
        </div>

        {/* Color Shifts */}
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded bg-red-900/10 border border-red-900/30 flex items-center justify-center shrink-0 mt-0.5">
            <Zap className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-[#E0D8D0] uppercase tracking-wider mb-1">
              Fist Compression & Color Squeeze
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Closing your hand concentrates and squeezes the nebula. As your grip tightens, particles physically collapse inward and shift color through a custom gradient: <span className="text-blue-400 font-semibold font-mono">Blue</span> ➔ <span className="text-indigo-400 font-semibold font-mono">Purple</span> ➔ <span className="text-red-400 font-semibold font-mono">Deep Crimson</span>.
            </p>
          </div>
        </div>

        {/* Signature Sequence */}
        <div className="flex gap-3 border-t border-white/5 pt-4">
          <div className="w-6 h-6 rounded bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0 mt-0.5">
            <Eye className="w-3.5 h-3.5 text-gold" />
          </div>
          <div>
            <h4 className="font-serif text-xs text-gold uppercase tracking-widest mb-1">
              Signature Sequence Catalyst
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed mb-3">
              Trigger the core synthesis and materialize the hidden glyphs:
            </p>
            <ol className="list-decimal list-inside text-[11px] text-neutral-400 space-y-2 leading-relaxed">
              <li>
                <strong className="text-neutral-200">Gather Density:</strong> Hold your hand still so particles settle around the core, raising energy density past <span className="text-gold font-semibold font-mono">90%</span>.
              </li>
              <li>
                <strong className="text-neutral-200">Squeeze & Hold:</strong> Curl your fingers into a tight fist (Grip &gt; 0.82) and keep your palm perfectly stationary.
              </li>
              <li>
                <strong className="text-neutral-200">Witness Synthesis:</strong> Hold for <span className="text-neutral-200 font-semibold">1.6 seconds</span>. The core will compress, vibrate unstable energy, fall into deep silence, and crystallize into the golden text <strong className="text-gold font-serif tracking-widest">"AVIRAL"</strong>.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
export default InstructionCard;
