import React from "react";

type Props = {
  progress: number;           // 0..1
  children?: React.ReactNode; // center label
  size?: number;              // px (default 160)
  thickness?: number;         // px (default 12)
};

export default function ProgressRing({
  progress,
  children,
  size = 160,
  thickness = 12,
}: Props) {
  const pct = Math.max(0, Math.min(1, progress));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;

  return (
    <div
      className="grid place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label="progress ring"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* track */}
        <circle
          className="ring-track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
        />
        {/* progress */}
        <circle
          className="ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={thickness}
          strokeDasharray={c}
          strokeDashoffset={c - dash}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {/* center disc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r - thickness / 2}
          fill="var(--surface-1)"
        />
        {/* label */}
        <text
          className="ring-text"
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          style={{ fontFamily: "ui-monospace, monospace", fontSize: size * 0.22 }}
        >
          {children}
        </text>
      </svg>
    </div>
  );
}
