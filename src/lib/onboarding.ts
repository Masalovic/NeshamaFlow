// src/lib/onboarding.ts
import { getItem as sGet, setItem as sSet, ready as storageReady, removeItem } from "./secureStorage";
import { ensureDefaultCryptoKey } from "./secureBootstrap";

const KEY_BASE = "onboarded.v1";

// ✅ scope per user
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
  if (!storageReady()) return false;

  // sGet() already returns null on decrypt fail / missing key
  const v = await sGet<{ at: string } | boolean>(KEY());
  if (v === true) return true;
  if (v && typeof v === "object") return true;
  return false;
}

/**
 * Marks onboarding as completed on this device/account.
 * Ensures crypto key exists before writing.
 */
export async function completeOnboarding(): Promise<void> {
  // If no PIN, bootstrap device-secret key (so storageReady becomes true).
  try {
    ensureDefaultCryptoKey();
  } catch {}

  if (!storageReady()) {
    throw new Error("secureStorage not ready — cannot complete onboarding.");
  }

  await sSet(KEY(), { at: new Date().toISOString() });
}

/** Debug / optional: reset onboarding for this user scope */
export async function resetOnboarding(): Promise<void> {
  if (!storageReady()) return;
  removeItem(KEY()); // ✅ clean remove
}