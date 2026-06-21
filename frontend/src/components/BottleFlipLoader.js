import React from "react";

/**
 * Bottle-flip loading animation.
 * Flow: bottle drops, flips mid-air, lands standing, briefly bobs.
 * Pure SVG + Tailwind keyframes — no JS animation loop.
 */
export default function BottleFlipLoader({ label = "Loading workspace" }) {
  return (
    <div
      className="h-screen w-screen flex items-center justify-center bg-brand-cream paisley"
      style={{ backgroundColor: "#F7EFE0" }}
      data-testid="bottle-flip-loader"
    >
      <div className="flex flex-col items-center gap-8">
        <div className="relative h-48 w-32">
          {/* Floor shadow */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-2 w-20 rounded-full bg-ink/15 blur-[2px] animate-bottle-shadow" />
          {/* Bottle (the SVG below is one continuous shape so it flips cleanly) */}
          <svg
            viewBox="0 0 80 160"
            className="absolute inset-x-0 top-0 mx-auto h-44 w-24 origin-bottom animate-bottle-flip"
            aria-hidden="true"
          >
            {/* Cap */}
            <rect x="32" y="6" width="16" height="10" rx="2" fill="#1F2A40" />
            {/* Neck */}
            <rect x="32" y="16" width="16" height="14" fill="#3A7D44" />
            {/* Body */}
            <path
              d="M22 30 Q18 38 18 48 L18 138 Q18 150 30 150 L50 150 Q62 150 62 138 L62 48 Q62 38 58 30 Z"
              fill="#3A7D44"
            />
            {/* Label */}
            <rect x="22" y="70" width="36" height="48" rx="3" fill="#F7EFE0" />
            <rect x="26" y="78" width="28" height="3" rx="1.5" fill="#B0533C" />
            <rect x="26" y="86" width="22" height="3" rx="1.5" fill="#22241F" />
            <rect x="26" y="94" width="26" height="3" rx="1.5" fill="#E4A11B" />
            <circle cx="40" cy="108" r="5" fill="#B0533C" />
            {/* Highlight */}
            <path
              d="M26 38 Q24 44 24 50 L24 100"
              stroke="#FFFFFF"
              strokeOpacity="0.35"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="font-display text-2xl font-bold text-ink tracking-tight">
            fresh<span className="text-brand-primary">track</span>.
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft">
            {label}
            <span className="inline-flex w-6 justify-start text-brand-accent ml-1 animate-loading-dots" />
          </div>
        </div>
      </div>

      {/* Local keyframes (animation tokens scoped to the loader) */}
      <style>{`
        @keyframes bottle-flip {
          0%   { transform: translateY(-120%) rotate(0deg); }
          18%  { transform: translateY(0%)    rotate(0deg); }
          22%  { transform: translateY(-4%)   rotate(20deg); }
          50%  { transform: translateY(-50%)  rotate(540deg); }
          78%  { transform: translateY(0%)    rotate(720deg); }
          82%  { transform: translateY(-3%)   rotate(720deg); }
          90%  { transform: translateY(0%)    rotate(720deg); }
          100% { transform: translateY(0%)    rotate(720deg); }
        }
        @keyframes bottle-shadow {
          0%   { transform: translateX(-50%) scaleX(0.3); opacity: 0.35; }
          22%  { transform: translateX(-50%) scaleX(1);   opacity: 0.6; }
          50%  { transform: translateX(-50%) scaleX(0.3); opacity: 0.2; }
          78%  { transform: translateX(-50%) scaleX(1);   opacity: 0.6; }
          100% { transform: translateX(-50%) scaleX(1);   opacity: 0.6; }
        }
        @keyframes loading-dots {
          0%   { content: ""; }
          33%  { content: "."; }
          66%  { content: ".."; }
          100% { content: "..."; }
        }
        .animate-bottle-flip {
          animation: bottle-flip 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .animate-bottle-shadow {
          animation: bottle-shadow 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .animate-loading-dots::after {
          content: "";
          animation: loading-dots 1.4s steps(4, end) infinite;
        }
      `}</style>
    </div>
  );
}
