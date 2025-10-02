// src/lib/settings.ts
import { getItem as sGet, setItem as sSet, ready } from './secureStorage'

export type AppSettings = {
  haptics?: boolean; // default true
}

const KEY = 'settings'

const DEFAULTS: Required<AppSettings> = {
  haptics: true,
}

function withDefaults(partial: AppSettings | null): Required<AppSettings> {
  return { ...DEFAULTS, ...(partial ?? {}) }
}

export async function loadSettings(): Promise<Required<AppSettings>> {
  if (!ready()) return DEFAULTS
  const s = await sGet<AppSettings>(KEY)
  return withDefaults(s)
}

export async function saveSettings(next: AppSettings): Promise<void> {
  const merged = withDefaults(next)
  await sSet(KEY, merged)
}

export async function setSetting<K extends keyof AppSettings>(k: K, v: NonNullable<AppSettings[K]>) {
  const cur = await loadSettings()
  const next = { ...cur, [k]: v }
  await saveSettings(next)
}
