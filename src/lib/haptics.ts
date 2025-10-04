// src/lib/haptics.ts
let supported = typeof navigator !== 'undefined' && !!navigator.vibrate;

export function buzz(pattern: number | number[]): void {
  if (!supported) return;
  try { navigator.vibrate(pattern); } catch {}
}

/** micro tap for UI feedback */
export function tap() { buzz(8); }
/** success pulse (e.g., complete) */
export function success() { buzz([0, 14, 60, 18]); }
/** warning/attention */
export function warn() { buzz([0, 24, 40, 24]); }
