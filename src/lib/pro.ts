// src/lib/pro.ts
import { getItem as sGet, setItem as sSet } from './secureStorage'

const KEY = 'entitlement.pro' // boolean

export async function isPro(): Promise<boolean> {
  return (await sGet<boolean>(KEY)) === true
}

export async function setPro(enabled: boolean): Promise<void> {
  await sSet(KEY, !!enabled)
}

/** Placeholder for future server check (e.g., Stripe via Supabase Function). */
export async function refreshProFromServer(): Promise<boolean> {
  // No-op for now; return stored flag
  return isPro()
}
