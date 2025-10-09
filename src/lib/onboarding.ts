// src/lib/onboarding.ts
// Remember (encrypted) that we finished onboarding on this device/account.

import { getItem as sGet, setItem as sSet } from './secureStorage';
import { ensureDefaultCryptoKey } from './secureBootstrap';

const KEY = 'onboarded.v1';

export async function isOnboarded(): Promise<boolean> {
  try {
    const v = await sGet(KEY);
    return Boolean(v);
  } catch {
    // If the encryption key isn't set yet (first boot / locked),
    // treat as not onboarded instead of throwing.
    return false;
  }
}

export async function completeOnboarding(): Promise<void> {
  // Ensure a crypto key exists (device-secret if no PIN) before writing.
  try { ensureDefaultCryptoKey(); } catch {}
  await sSet(KEY, { at: new Date().toISOString() });
}
