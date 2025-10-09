import { setEncryptionPassphrase } from './secureStorage';

const DEVICE_SECRET_KEY = 'secure.device_secret.v1';

/** Stable, device-local secret used when no PIN is set. */
export function getOrCreateDeviceSecret(): string {
  let s = localStorage.getItem(DEVICE_SECRET_KEY);
  if (!s) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    s = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(DEVICE_SECRET_KEY, s);
  }
  return s;
}

/** If no PIN is active, set the crypto key so secureStorage works immediately. */
export function ensureDefaultCryptoKey(): void {
  const hasPin = !!localStorage.getItem('lock.hash');
  if (!hasPin) {
    // Safe to call multiple times; last one wins.
    setEncryptionPassphrase(getOrCreateDeviceSecret());
  }
}
