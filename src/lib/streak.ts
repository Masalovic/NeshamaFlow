// src/lib/streak.ts
import dayjs from 'dayjs';
import { getItem as sGet, setItem as sSet } from './secureStorage';
import { loadHistory, type LogItem } from './history';

const K_REPAIRS = 'streak.repairs.v1';       // string[] of YYYY-MM-DD
const K_LAST    = 'streak.lastRepair.v1';    // YYYY-MM-DD

export async function getRepairSet(): Promise<Set<string>> {
  const arr = (await sGet<string[]>(K_REPAIRS)) ?? [];
  return new Set(arr);
}

export async function recordRepairToday(): Promise<void> {
  const today = dayjs().startOf('day').format('YYYY-MM-DD');
  const set = await getRepairSet();
  if (!set.has(today)) set.add(today);
  await sSet(K_REPAIRS, Array.from(set));
  await sSet(K_LAST, today);
}

export async function cooldownDaysLeft(): Promise<number> {
  const last = await sGet<string | null>(K_LAST);
  if (!last) return 0;
  const diff = 7 - dayjs().startOf('day').diff(dayjs(last), 'day');
  return Math.max(0, diff);
}

export async function canRepairToday(): Promise<boolean> {
  const [list, repairs, cd] = await Promise.all([
    loadHistory(),
    getRepairSet(),
    cooldownDaysLeft(),
  ]);
  const today = dayjs().startOf('day').format('YYYY-MM-DD');
  const hasTodayLog = list.some(l => dayjs(l.ts).isSame(today, 'day'));
  const alreadyRepaired = repairs.has(today);
  return !hasTodayLog && !alreadyRepaired && cd === 0;
}

/** streak using logs + repairs */
export function computeStreak(list: LogItem[], repairs: Set<string>): number {
  if (!list.length && repairs.size === 0) return 0;
  const days = new Set<string>();
  for (const it of list) {
    days.add(dayjs(it.ts).startOf('day').format('YYYY-MM-DD'));
  }
  let s = 0;
  let cursor = dayjs().startOf('day');
  while (true) {
    const key = cursor.format('YYYY-MM-DD');
    if (days.has(key) || repairs.has(key)) {
      s++;
      cursor = cursor.subtract(1, 'day');
    } else {
      break;
    }
  }
  return s;
}
