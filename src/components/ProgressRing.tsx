// src/components/ProgressRing.tsx
import React from "react";

type Props = {
  progress: number;            // 0..1
  children?: React.ReactNode;  // usually the mm:ss or seconds
  size?: number;               // px, optional (default 160)
  thickness?: number;          // px, optional (default 8)
};

export default function ProgressRing({
  progress,
  children,
  size = 160,
  thickness = 8,
}: Props) {
  const pct = Math.max(0, Math.min(1, progress));
  const angle = pct * 360;

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      aria-label="progress ring"
      role="img"
    >
      {/* Track + progress using theme tokens */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          // conic: progress color first, then track color
          background: `conic-gradient(var(--ring-progress) ${angle}deg, var(--ring-track) ${angle}deg)`,
        }}
      />

      {/* Inner disc to create the ring "hole" */}
      <div
        className="absolute rounded-full"
        style={{
          inset: thickness,
          background: "var(--surface-1)",
        }}
      />

      {/* Centered label/content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="text-4xl font-mono tabular-nums"
          style={{ color: "var(--ring-text)" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
