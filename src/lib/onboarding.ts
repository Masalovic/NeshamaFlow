// Remember (encrypted) that we finished onboarding on this device/account.
import { getItem as sGet, setItem as sSet } from '../lib/secureStorage';

const KEY = 'onboarded.v1';

export async function isOnboarded(): Promise<boolean> {
  return Boolean(await sGet(KEY));
}

export async function completeOnboarding(): Promise<void> {
  await sSet(KEY, { at: new Date().toISOString() });
}
