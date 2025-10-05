import dayjs from "dayjs";
import type { LogItem } from "./history";
import { titleForRitualId } from "./ritualEngine";

export type QuickStats = {
  windowDays: number;
  sessions: number;
  avgDurationSec: number;
  bestBlockLabel: string | null; // e.g., "20–23h"
  topRitualTitle: string | null;
};

function blockLabel(startHour: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(startHour)}–${pad(startHour + 3)}h`;
}

/** Compute quick facts over the last `windowDays` (default 28) */
export function computeQuickStats(list: LogItem[], windowDays = 28): QuickStats {
  if (!Array.isArray(list)) list = [];
  const end = dayjs().endOf("day");
  const start = end.subtract(windowDays - 1, "day").startOf("day");

  const inWindow = list.filter(it => dayjs(it.ts).isAfter(start.subtract(1, "millisecond")));

  // sessions + average duration
  const sessions = inWindow.length;
  const totalSec = inWindow.reduce((s, it) => s + Math.max(0, it.durationSec || 0), 0);
  const avgDurationSec = sessions ? Math.round(totalSec / sessions) : 0;

  // best 4h block
  const hours = new Array(24).fill(0);
  for (const it of inWindow) {
    const h = new Date(it.ts).getHours();
    hours[h] += 1;
  }
  let bestBlock = -1;
  let bestCount = -1;
  for (let startHour = 0; startHour < 24; startHour += 4) {
    const count = hours.slice(startHour, startHour + 4).reduce((a, b) => a + b, 0);
    if (count > bestCount) {
      bestCount = count;
      bestBlock = startHour;
    }
  }
  const bestBlockLabel = bestCount > 0 ? blockLabel(bestBlock) : null;

  // top ritual
  const rc = new Map<string, number>();
  for (const it of inWindow) rc.set(it.ritualId, (rc.get(it.ritualId) || 0) + 1);
  let top: string | null = null;
  let topN = 0;
  rc.forEach((n, id) => { if (n > topN) { top = id; topN = n; } });
  const topRitualTitle = top ? titleForRitualId(top) : null;

  return { windowDays, sessions, avgDurationSec, bestBlockLabel, topRitualTitle };
}

export function fmtAvg(sec: number): string {
  if (sec <= 0) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}
