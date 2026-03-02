// src/lib/goalEngine.ts
import dayjs from "dayjs";
import type { LogItem } from "./history";
import type { GoalId } from "./goal";

export type GoalSuggestion = {
  ritualId: string;
  reasonKey: string; // i18n key later
};

export function suggestionForGoal(goal: GoalId): GoalSuggestion {
  switch (goal) {
    case "sleepBetter":
      return { ritualId: "sleep-reset-5m", reasonKey: "goal.reason.sleep" };
    case "buildHabit":
      return { ritualId: "box-breath-2m", reasonKey: "goal.reason.habit" };
    case "feelSteadier":
      return { ritualId: "grounding-3m", reasonKey: "goal.reason.steady" };
    case "reduceStress":
    default:
      return { ritualId: "box-breath-2m", reasonKey: "goal.reason.stress" };
  }
}

/**
 * Goal progress metrics (computed purely from history).
 * This avoids needing new DB tables.
 */
export type GoalMetrics = {
  windowDays: number;
  sessions: number;
  totalMin: number;

  // habit-like
  consistencyScore: number; // 0-100
  sessionsPerDayAvg: number;

  // sleep-like
  eveningRate: number; // 0-1 (after 20:00)
  eveningStreak: number; // consecutive days with evening session

  // stress-like
  microResetRate: number; // 0-1 (<= 3min sessions)
  avgDurationSec: number;

  // steadiness-like
  moodVariance: number | null;
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function streakFromDays(daysWithAny: Set<string>, start: dayjs.Dayjs, end: dayjs.Dayjs) {
  // counts consecutive days from end backwards
  let s = 0;
  let d = end.startOf("day");
  const startDay = start.startOf("day");
  while (!d.isBefore(startDay, "day")) {
    if (!daysWithAny.has(d.format("YYYY-MM-DD"))) break;
    s += 1;
    d = d.subtract(1, "day");
  }
  return s;
}

// If your MoodKey is emoji string, we can map a few. Unknown -> null.
const MOOD_VALUE: Record<string, number> = {
  "😄": 5,
  "🙂": 4,
  "😐": 3,
  "😕": 2,
  "😞": 1,
};

export function computeGoalMetrics(items: LogItem[], startISO: string, endISO: string): GoalMetrics {
  const start = dayjs(startISO).startOf("day");
  const end = dayjs(endISO).endOf("day");
  const windowDays = Math.max(1, end.startOf("day").diff(start.startOf("day"), "day") + 1);

  const inRange = items.filter((x) => {
    const t0 = dayjs(x.ts);
    return !t0.isBefore(start) && !t0.isAfter(end);
  });

  const sessions = inRange.length;
  const totalSec = inRange.reduce((a, b) => a + (Number(b.durationSec) || 0), 0);
  const totalMin = Math.round(totalSec / 60);

  // sessions per day
  const perDay = new Map<string, number>();
  for (let i = 0; i < windowDays; i++) perDay.set(start.add(i, "day").format("YYYY-MM-DD"), 0);
  for (const x of inRange) {
    const k = dayjs(x.ts).format("YYYY-MM-DD");
    perDay.set(k, (perDay.get(k) || 0) + 1);
  }

  const activeDays = Array.from(perDay.values()).filter((n) => n > 0).length;
  const sessionsPerDayAvg = sessions / windowDays;

  // consistency score: weighted by active days and regularity
  const activeRate = activeDays / windowDays; // 0..1
  const regularity = clamp01(1 - Math.min(1, Math.abs(sessionsPerDayAvg - 1) / 2)); // ~1/day is ideal
  const consistencyScore = Math.round(100 * (0.7 * activeRate + 0.3 * regularity));

  // sleep: evening rate (after 20h)
  const eveningCount = inRange.filter((x) => new Date(x.ts).getHours() >= 20).length;
  const eveningRate = sessions ? eveningCount / sessions : 0;

  const eveningDays = new Set<string>();
  for (const x of inRange) {
    const h = new Date(x.ts).getHours();
    if (h >= 20) eveningDays.add(dayjs(x.ts).format("YYYY-MM-DD"));
  }
  const eveningStreak = streakFromDays(eveningDays, start, end);

  // stress: micro reset rate (<= 3 minutes)
  const microCount = inRange.filter((x) => (Number(x.durationSec) || 0) <= 180).length;
  const microResetRate = sessions ? microCount / sessions : 0;
  const avgDurationSec = sessions ? Math.round(totalSec / sessions) : 0;

  // steadiness: mood variance (if mood values available)
  const moodVals = inRange
    .map((x) => MOOD_VALUE[String(x.mood)])
    .filter((v) => typeof v === "number") as number[];

  let moodVariance: number | null = null;
  if (moodVals.length >= 3) {
    const mean = moodVals.reduce((a, b) => a + b, 0) / moodVals.length;
    const var0 = moodVals.reduce((a, b) => a + (b - mean) ** 2, 0) / moodVals.length;
    moodVariance = Number(var0.toFixed(2));
  }

  return {
    windowDays,
    sessions,
    totalMin,
    consistencyScore,
    sessionsPerDayAvg: Number(sessionsPerDayAvg.toFixed(2)),
    eveningRate: Number(eveningRate.toFixed(2)),
    eveningStreak,
    microResetRate: Number(microResetRate.toFixed(2)),
    avgDurationSec,
    moodVariance,
  };
}

export function goalHeadline(goal: GoalId, m: GoalMetrics): { title: string; subtitle: string } {
  switch (goal) {
    case "sleepBetter":
      return {
        title: `Evening practice: ${Math.round(m.eveningRate * 100)}%`,
        subtitle: `Evening streak: ${m.eveningStreak} day(s)`,
      };
    case "buildHabit":
      return {
        title: `Consistency score: ${m.consistencyScore}/100`,
        subtitle: `Avg: ${m.sessionsPerDayAvg} sessions/day`,
      };
    case "feelSteadier":
      return {
        title: m.moodVariance == null ? "Mood stability: —" : `Mood variance: ${m.moodVariance}`,
        subtitle: `Consistency score: ${m.consistencyScore}/100`,
      };
    case "reduceStress":
    default:
      return {
        title: `Micro-resets: ${Math.round(m.microResetRate * 100)}%`,
        subtitle: `Avg session: ${m.avgDurationSec}s`,
      };
  }
}