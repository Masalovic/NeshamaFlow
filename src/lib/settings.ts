// src/lib/settings.ts
import { getItem as sGet, setItem as sSet, ready as sReady } from './secureStorage';

export type AppSettings = {
  haptics: boolean;
  goalMin: number;         // daily goal minutes (shown in TodayPanel/progress)
  reminderTime: string;    // "HH:mm" local time preference
  onboardingDone?: boolean;
};

const KEY = 'settings';

const DEFAULTS: AppSettings = {
  haptics: true,
  goalMin: 2,
  reminderTime: '20:00',
  onboardingDone: false,
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const cur = (sReady() ? await sGet<AppSettings>(KEY) : null) || {};
    // shallow-merge defaults with stored values
    return { ...DEFAULTS, ...(cur as Partial<AppSettings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function setSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<void> {
  const cur = await loadSettings();
  const next = { ...cur, [key]: value };
  if (!sReady()) throw new Error('secureStorage not ready (locked)');
  await sSet(KEY, next);
}

export async function setSettingsBulk(patch: Partial<AppSettings>): Promise<void> {
  const cur = await loadSettings();
  const next = { ...cur, ...patch };
  if (!sReady()) throw new Error('secureStorage not ready (locked)');
  await sSet(KEY, next);
}
