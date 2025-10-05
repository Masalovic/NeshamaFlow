// src/lib/insights.ts
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);
import type { LogItem } from "./history";

/** Window for "recent" insights (days) */
export const INSIGHTS_WINDOW_DAYS = 28;

export type InsightsSummary = {
  // meta
  fromISO: string;
  toISO: string;

  // streak ending today
  streakDays: number;

  // aggregates (last 28d)
  totalMinutes: number;       // sum(duration) / 60
  avgDurationSec: number;     // average session length
  sessionsCount: number;      // number of sessions

  // top rituals
  topRitualId: string | null;
  ritualCounts: Record<string, number>;

  // distributions
  byHour: number[]; // length 24
  byDow: number[];  // length 7, 0=Sun
};

export function summarize(list: LogItem[], windowDays = INSIGHTS_WINDOW_DAYS): InsightsSummary {
  const to = dayjs().endOf("day");
  const from = to.subtract(windowDays - 1, "day").startOf("day");

  const inWindow = list.filter(it => dayjs(it.ts).isBetween(from, to, "millisecond", "[]"));

  // basic counts
  const totalSec = inWindow.reduce((s, it) => s + Math.max(0, it.durationSec || 0), 0);
  const sessionsCount = inWindow.length;
  const avgDurationSec = sessionsCount ? Math.round(totalSec / sessionsCount) : 0;
  const totalMinutes = Math.round(totalSec / 60);

  // ritual counts
  const ritualCounts: Record<string, number> = {};
  for (const it of inWindow) ritualCounts[it.ritualId] = (ritualCounts[it.ritualId] || 0) + 1;
  const topRitualId =
    Object.entries(ritualCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // by hour (0-23) and day-of-week (0=Sun..6=Sat)
  const byHour = new Array(24).fill(0);
  const byDow = new Array(7).fill(0);
  for (const it of inWindow) {
    const d = dayjs(it.ts);
    byHour[d.hour()]++;
    byDow[d.day()]++;
  }

  // streak (ending today)
  const uniqueDays = new Set(
    list.map(it => dayjs(it.ts).startOf("day").valueOf())
  );
  let streak = 0;
  let cursor = dayjs().startOf("day");
  while (uniqueDays.has(cursor.valueOf())) {
    streak++;
    cursor = cursor.subtract(1, "day");
  }

  return {
    fromISO: from.toISOString(),
    toISO: to.toISOString(),
    streakDays: streak,
    totalMinutes,
    avgDurationSec,
    sessionsCount,
    topRitualId,
    ritualCounts,
    byHour,
    byDow,
  };
}
