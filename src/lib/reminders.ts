// src/lib/reminders.ts
import dayjs from 'dayjs';
import { loadHistory } from './history';
import { track } from './metrics';

const LS = {
  enabled: 'reminder.enabled.v1',          // "1" | "0" (default ON)
  mutedUntil: 'reminder.muted_until.v1',   // ISO string
  lastShownYMD: 'reminder.last_shown_ymd', // "YYYY-MM-DD"
  lastTappedYMD: 'reminder.last_tap_ymd',
  learnedHour: 'reminder.learned_hour.v1', // "0..23"
};

export type ReminderDecision = {
  due: boolean;
  reason?:
    | 'already-logged'
    | 'muted'
    | 'out-of-window'
    | 'shown-today'
    | 'disabled'
    | 'insufficient-data';
  preferredHour?: number;
};

function safeTrack(name: string, props?: Record<string, unknown>) {
  try {
    (track as any)(name, props);
  } catch {
    // ignore typing mismatch; keeps compile happy without changing metrics.ts
  }
}

export function isEnabled(): boolean {
  const v = localStorage.getItem(LS.enabled);
  return v === null ? true : v === '1';
}

export function setEnabled(on: boolean): void {
  localStorage.setItem(LS.enabled, on ? '1' : '0');
}

/** Mute for n days (default 7) */
export function mute(days = 7): void {
  const until = dayjs().add(days, 'day').endOf('day').toISOString();
  localStorage.setItem(LS.mutedUntil, until);
}

/** Learn the most common hour from last N sessions (fallback 20:00) */
export async function learnPreferredHour(): Promise<number> {
  const h = await loadHistory();
  if (!h.length) return 20; // fallback: 8pm
  const last = h.slice(0, 30); // list is newest-first; take 30 most recent
  const freq = new Array(24).fill(0);
  for (const it of last) {
    const hour = dayjs(it.ts).hour();
    freq[hour] += 1;
  }
  let best = 20;
  let bestC = -1;
  for (let hour = 0; hour < 24; hour++) {
    if (freq[hour] > bestC) {
      bestC = freq[hour];
      best = hour;
    }
  }
  localStorage.setItem(LS.learnedHour, String(best));
  return best;
}

export async function getPreferredHour(): Promise<number> {
  const raw = localStorage.getItem(LS.learnedHour);
  if (raw == null) return await learnPreferredHour();
  const n = Number(raw);
  return Number.isFinite(n) ? n : 20;
}

/** True if there's already at least one log today */
export async function loggedToday(): Promise<boolean> {
  const today = dayjs().startOf('day');
  const items = await loadHistory();
  return items.some((it) => dayjs(it.ts).isSame(today, 'day'));
}

/** Compute if a nudge is due right now */
export async function decide(): Promise<ReminderDecision> {
  if (!isEnabled()) return { due: false, reason: 'disabled' };

  const muted = localStorage.getItem(LS.mutedUntil);
  if (muted && dayjs().isBefore(dayjs(muted))) return { due: false, reason: 'muted' };

  // once/day max
  const lastYMD = localStorage.getItem(LS.lastShownYMD);
  const todayYMD = dayjs().format('YYYY-MM-DD');
  if (lastYMD === todayYMD) return { due: false, reason: 'shown-today' };

  if (await loggedToday()) return { due: false, reason: 'already-logged' };

  const preferredHour = await getPreferredHour();

  // Nudge window: [hour-0.5h, hour+1.5h]
  const now = dayjs();
  const start = now.hour(preferredHour).minute(0).second(0).millisecond(0).subtract(30, 'minute');
  const end = start.add(2, 'hour');

  const inWindow = now.isAfter(start) && now.isBefore(end);
  if (!inWindow) return { due: false, reason: 'out-of-window', preferredHour };

  return { due: true, preferredHour };
}

export function markShown(): void {
  localStorage.setItem(LS.lastShownYMD, dayjs().format('YYYY-MM-DD'));
  safeTrack('nudge_shown');
}

export function markTapped(): void {
  localStorage.setItem(LS.lastTappedYMD, dayjs().format('YYYY-MM-DD'));
  safeTrack('nudge_tapped');
}

/** Convenience: checkbox toggle in Settings */
export function toggleEnabled(): boolean {
  const next = !isEnabled();
  setEnabled(next);
  return next;
}
