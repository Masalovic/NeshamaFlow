// src/components/ProgressRing.tsx
import React from 'react'

export default function ProgressRing({
  progress,
  children,
}: {
  progress: number
  children?: React.ReactNode
}) {
  const pct = Math.max(0, Math.min(1, progress))
  const angle = pct * 360
  return (
    <div className="relative w-40 h-40">
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(#5B486F ${angle}deg, #E5E7EB ${angle}deg)` }}
      />
      <div className="absolute inset-2 rounded-full bg-white" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-4xl font-mono tabular-nums">{children}</div>
      </div>
    </div>
  )
}
