// src/components/ProgressRing.tsx
import React from "react";

type Props = {
  /** 0..1 */
  progress: number;
  /** Usually seconds / mm:ss */
  children?: React.ReactNode;
  /** Outer diameter in px */
  size?: number;
  /** Stroke width in px */
  thickness?: number;
};

export default function ProgressRing({
  progress,
  children,
  size = 160,
  thickness = 12,
}: Props) {
  const pct = Math.max(0, Math.min(1, progress));

  // SVG circle math
  const r = (size - thickness) / 2;           // radius
  const c = size / 2;                          // center
  const circumference = 2 * Math.PI * r;
  const dash = circumference * pct;
  const gap = circumference - dash;

  return (
    <div
      className="relative inline-block"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`progress ${Math.round(pct * 100)}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={thickness}
          strokeLinecap="round"
        />
        {/* Progress (starts at 12 o’clock) */}
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="var(--ring-progress)"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          // rotate -90deg so stroke starts at top, not at 3 o’clock
          transform={`rotate(-90 ${c} ${c})`}
          style={{ transition: "stroke-dasharray 300ms ease" }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 grid place-items-center">
        <div
          className="font-mono tabular-nums"
          style={{ color: "var(--ring-text)", fontSize: Math.max(16, size * 0.18) }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
