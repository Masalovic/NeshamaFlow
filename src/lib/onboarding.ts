// src/lib/onboarding.ts
// Remember (encrypted) that we finished onboarding on this device/account.

import { getItem as sGet, setItem as sSet, ready as storageReady } from "./secureStorage";
import { ensureDefaultCryptoKey } from "./secureBootstrap";

const KEY_BASE = "onboarded.v1";

// ✅ scope per user (same idea as history/goal)
let scope = "anon";
export function setOnboardingScope(next: string | null | undefined) {
  scope = next && next.trim() ? next : "anon";
}

function KEY() {
  return `${KEY_BASE}:${scope}`;
}

/**
 * Returns whether onboarding has been completed.
 * Safe to call even before secure storage is unlocked.
 */
export async function isOnboarded(): Promise<boolean> {
  // If encryption key is not ready yet, treat as not onboarded.
  if (!storageReady()) return false;

  try {
    const v = await sGet(KEY());
    return Boolean(v);
  } catch {
    // Any decrypt failure → behave as not onboarded.
    return false;
  }
}

/**
 * Marks onboarding as completed on this device/account.
 * Ensures crypto key exists before writing.
 */
export async function completeOnboarding(): Promise<void> {
  try {
    // Ensure we have a device-secret key if no PIN is set.
    ensureDefaultCryptoKey();
  } catch {
    // ignore — secureStorage will throw later if truly broken
  }

  if (!storageReady()) {
    throw new Error("secureStorage not ready — cannot complete onboarding.");
  }

  await sSet(KEY(), { at: new Date().toISOString() });
}

/** Optional helper if you want “Reset onboarding” for debug */
export async function resetOnboarding(): Promise<void> {
  if (!storageReady()) return;
  await sSet(KEY(), null);
}