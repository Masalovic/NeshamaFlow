// src/pages/Insights.tsx
import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/ui/Header";
import { summarize } from "../lib/insights";
import { localizedTitleForRitualId, isRitualId } from "../lib/ritualEngine";
import { loadHistory, type LogItem } from "../lib/history";
import dayjs, { Dayjs } from "dayjs";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { useTranslation } from "react-i18next";
import { isPro as isProFn, setPro as setProFn } from "../lib/pro";
import { getItem as sGet } from "../lib/secureStorage";

/** Tokenized card wrapper (doesn't touch chart visuals) */
function Card({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-main">{title}</div>
        {right}
      </div>
      {children}
    </section>
  );
}

type MoodSlice = { name: string; value: number };
type DayPoint = { day: string; count: number };

const COLORS = [
  "#7c3aed",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#a78bfa",
  "#84cc16",
  "#fb7185",
];

type Preset = "7" | "28" | "90" | "custom";

type GoalKey = "reduceStress" | "buildHabit" | "sleepBetter" | "feelSteadier";
const GOAL_KEY = "goal.primary.v1"; // change if you store it elsewhere

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function fmtPct(n01: number) {
  return `${Math.round(clamp01(n01) * 100)}%`;
}

function inEveningWindow(d: dayjs.Dayjs) {
  // "sleepBetter": 20:00–02:59
  const h = d.hour();
  return h >= 20 || h <= 2;
}

export default function Insights() {
  const { t } = useTranslation(["insights", "common", "settings"]);

  const [history, setHistory] = useState<LogItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isPro, setIsPro] = useState<boolean>(false);
  const [goal, setGoal] = useState<GoalKey>("buildHabit");

  const fetchInsights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await loadHistory();
      setHistory(list);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load insights.";
      setError(msg);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  // Pro + Goal bootstrap
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const proVal = await isProFn();
        if (!alive) return;
        setIsPro(!!proVal);
      } catch {
        if (!alive) return;
        setIsPro(false);
      }

      try {
        const stored = await sGet<GoalKey>(GOAL_KEY);
        if (!alive) return;
        if (
          stored === "reduceStress" ||
          stored === "buildHabit" ||
          stored === "sleepBetter" ||
          stored === "feelSteadier"
        ) {
          setGoal(stored);
        }
      } catch {
        // ignore (key missing / locked / not set yet)
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // -------- Range controls --------
  const [preset, setPreset] = useState<Preset>("28");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  // Resolved range (inclusive)
  const { start, end }: { start: Dayjs; end: Dayjs } = useMemo(() => {
    const today = dayjs().endOf("day");
    if (preset !== "custom") {
      const n = Number(preset);
      return { start: today.startOf("day").subtract(n - 1, "day"), end: today };
    }

    const s = dayjs(customStart || "").startOf("day");
    const e = dayjs(customEnd || "").endOf("day");
    if (!s.isValid() || !e.isValid() || s.isAfter(e)) {
      return { start: today.startOf("day").subtract(27, "day"), end: today };
    }
    return { start: s, end: e };
  }, [preset, customStart, customEnd]);

  const windowDays = Math.max(
    1,
    end.startOf("day").diff(start.startOf("day"), "day") + 1
  );

  // -------- Data slicing (safe date parsing) --------
  const rangeItems: LogItem[] = useMemo(() => {
    const list = history ?? [];
    return list.filter((x) => {
      const d = dayjs(x.ts);
      if (!d.isValid()) return false;
      return !d.isBefore(start) && !d.isAfter(end);
    });
  }, [history, start, end]);

  // Summary for the visible range
  const summary = useMemo(
    () => summarize(rangeItems, windowDays),
    [rangeItems, windowDays]
  );

  // --- Goal progress (works even without Pro, keeps it simple + credible)
  const goalProgress = useMemo(() => {
    const sessions = rangeItems.length;
    const daysPracticed = new Set(
      rangeItems.map((x) => dayjs(x.ts).format("YYYY-MM-DD"))
    ).size;

    const consistency = windowDays ? daysPracticed / windowDays : 0; // 0..1

    const avgMin = sessions ? (summary.totalSec ?? 0) / 60 / sessions : 0;
    const shortShare =
      sessions > 0
        ? rangeItems.filter((x) => (x.durationSec ?? 0) <= 4 * 60).length /
          sessions
        : 0;

    const eveningShare =
      sessions > 0
        ? rangeItems.filter((x) => inEveningWindow(dayjs(x.ts))).length / sessions
        : 0;

    // A single “score” tuned per goal (keep it explainable)
    let score = 0;
    let primaryLabel = "";
    let primaryValue = "";
    let secondaryLabel = "";
    let secondaryValue = "";

    if (goal === "buildHabit") {
      // mainly: consistency + streak
      score = 0.7 * consistency + 0.3 * clamp01((summary.streak ?? 0) / 14);
      primaryLabel = t("insights:goal.daysPracticed", "Days practiced");
      primaryValue = `${daysPracticed}/${windowDays}`;
      secondaryLabel = t("insights:goal.streak", "Streak");
      secondaryValue = `${summary.streak ?? 0}🔥`;
    } else if (goal === "sleepBetter") {
      // mainly: evening sessions + consistency
      score = 0.6 * eveningShare + 0.4 * consistency;
      primaryLabel = t("insights:goal.eveningShare", "Evening sessions");
      primaryValue = fmtPct(eveningShare);
      secondaryLabel = t("insights:goal.consistency", "Consistency");
      secondaryValue = fmtPct(consistency);
    } else if (goal === "reduceStress") {
      // mainly: short resets + consistency
      score = 0.6 * shortShare + 0.4 * consistency;
      primaryLabel = t("insights:goal.shortResets", "Short resets (≤4 min)");
      primaryValue = fmtPct(shortShare);
      secondaryLabel = t("insights:goal.consistency", "Consistency");
      secondaryValue = fmtPct(consistency);
    } else {
      // feelSteadier: consistency + average duration stability proxy (avoid fake “mood improvement”)
      // reward moderate average duration (2–8 min) + consistency
      const durationTarget = clamp01(
        avgMin <= 0 ? 0 : avgMin < 2 ? avgMin / 2 : avgMin > 8 ? 8 / avgMin : 1
      );
      score = 0.6 * consistency + 0.4 * durationTarget;
      primaryLabel = t("insights:goal.consistency", "Consistency");
      primaryValue = fmtPct(consistency);
      secondaryLabel = t("insights:goal.avgSessionMin", "Avg session");
      secondaryValue = `${Math.round(avgMin)} ${t("common:units.min", "min")}`;
    }

    return {
      score: clamp01(score),
      daysPracticed,
      sessions,
      consistency,
      shortShare,
      eveningShare,
      avgMin,
      primaryLabel,
      primaryValue,
      secondaryLabel,
      secondaryValue,
    };
  }, [rangeItems, windowDays, summary.totalSec, summary.streak, goal, t]);

  // 1) Mood distribution
  const moodChart: MoodSlice[] = useMemo(() => {
    if (!rangeItems.length) return [];
    const map = new Map<string, number>();
    rangeItems.forEach((x) =>
      map.set(String(x.mood), (map.get(String(x.mood)) || 0) + 1)
    );
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [rangeItems]);

  // 2) Sessions per day
  const daySeries: DayPoint[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (let i = 0; i < windowDays; i++) {
      counts.set(start.add(i, "day").format("YYYY-MM-DD"), 0);
    }
    rangeItems.forEach((x) => {
      const d = dayjs(x.ts);
      if (!d.isValid()) return;
      const key = d.startOf("day").format("YYYY-MM-DD");
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return Array.from(counts.entries()).map(([day, count]) => ({
      day: dayjs(day).format(windowDays <= 35 ? "MMM D" : "MM/DD"),
      count,
    }));
  }, [rangeItems, start, windowDays]);

  // 3) Time-of-day blocks (0–3h, 4–7h, …)
  const blocks = useMemo(() => {
    if (!rangeItems.length) return [] as { block: string; count: number }[];
    const buckets = Array.from({ length: 24 }, () => 0);

    for (const x of rangeItems) {
      const d = dayjs(x.ts);
      if (!d.isValid()) continue;
      buckets[d.hour()]++;
    }

    const out: { block: string; count: number }[] = [];
    for (let i = 0; i < 24; i += 4) {
      const value = buckets.slice(i, i + 4).reduce((a, b) => a + b, 0);
      const label = `${String(i).padStart(2, "0")}-${String(i + 3).padStart(
        2,
        "0"
      )}h`;
      out.push({ block: label, count: value });
    }
    return out.filter((b) => b.count > 0).sort((a, b) => b.count - a.count);
  }, [rangeItems]);

  // 4) Quick wins
  const quickWins = useMemo(() => {
    if (!rangeItems.length)
      return [] as { ritualId: string; avg: number; n: number }[];

    const map = new Map<string, { sum: number; n: number }>();
    for (const x of rangeItems) {
      const id = String(x.ritualId || "");
      if (!id) continue;

      const p = map.get(id) || { sum: 0, n: 0 };
      p.sum += x.durationSec ?? 0;
      p.n += 1;
      map.set(id, p);
    }

    return Array.from(map.entries())
      .map(([ritualId, s]) => ({
        ritualId,
        avg: Math.round(s.sum / Math.max(1, s.n)),
        n: s.n,
      }))
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 3);
  }, [rangeItems]);

  const isEmpty = !isLoading && !error && (history?.length ?? 0) === 0;

  function RangeControls() {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs text-muted">
          {start.format("MMM D, YYYY")} – {end.format("MMM D, YYYY")}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as Preset)}
            className="input h-12 py-1 px-2 text-sm"
            aria-label={t("insights:range.select", "Select range")}
          >
            <option value="7">
              {t("insights:range.last7", "Last 7 days")}
            </option>
            <option value="28">
              {t("insights:range.last28", "Last 28 days")}
            </option>
            <option value="90">
              {t("insights:range.last90", "Last 90 days")}
            </option>
            <option value="custom">
              {t("insights:range.custom", "Custom…")}
            </option>
          </select>

          {preset === "custom" && (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="input h-8 py-1 px-2 text-sm"
                aria-label={t("insights:range.startDate", "Start date")}
              />
              <span className="text-muted">–</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="input h-8 py-1 px-2 text-sm"
                aria-label={t("insights:range.endDate", "End date")}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  async function enableProPreview() {
    await setProFn(true);
    setIsPro(true);
  }

const goalTitle = String(t("settings:goal.title", { defaultValue: "Primary goal" }));

const goalLabel = String(
  t(`settings:goal.desc.${goal}`, {
    defaultValue:
      goal === "reduceStress"
        ? "Short resets, lower tension."
        : goal === "buildHabit"
        ? "Build consistency and momentum."
        : goal === "sleepBetter"
        ? "Wind-down routines and evenings."
        : "Stability and balance over time.",
  })
);

  return (
    <div className="flex min-h-full flex-col">
      <Header title={t("insights:title", "Insights (Pro)")} back />

      <main className="flex-1 p-4">
        <div className="mx-auto max-w-[560px] space-y-4 pb-24">
          {/* Loading */}
          {isLoading && (
            <section className="card text-sm text-muted">
              {t("common:generic.loading", "Loading…")}
            </section>
          )}

          {/* Error */}
          {!isLoading && error && (
            <section className="card text-center">
              <div className="text-sm text-main">
                {t("insights:error", "Couldn’t load insights.")}
              </div>
              <div className="mt-1 text-xs text-muted">{error}</div>
              <button
                type="button"
                onClick={fetchInsights}
                className="mt-3 rounded-xl border border-token bg-surface-2 px-3 py-2 text-sm text-main"
              >
                {t("common:buttons.retry", "Retry")}
              </button>
            </section>
          )}

          {!isLoading && !error && (
            <>
              {/* Summary header */}
              <section className="card">
                <RangeControls />
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <div className="min-w-[140px] flex-1">
                    <div className="text-xs text-muted">
                      {t("insights:thisPeriod", "This period")}
                    </div>
                    <div className="font-medium text-main">
                      {Math.round((summary.totalSec ?? 0) / 60)}{" "}
                      {t("common:units.min", "min")} ·{" "}
                      {t("insights:chips.sessions", {
                        count: summary.sessions ?? 0,
                        defaultValue: "{{count}} sessions",
                      })}
                    </div>
                  </div>

                  <div className="min-w-[140px] flex-1">
                    <div className="text-xs text-muted">
                      {t("insights:avgSession", "Avg session")}
                    </div>
                    <div className="font-medium text-main">
                      {summary.avgSec ?? 0}
                      {t("common:units.secondsSuffix", "s")}
                    </div>
                  </div>

                  <div className="min-w-[140px] flex-1">
                    <div className="text-xs text-muted">
                      {t("insights:topRitual", "Top ritual")}
                    </div>
                    <div className="font-medium text-main truncate">
                      {isRitualId(summary.topRitualId)
                        ? `${localizedTitleForRitualId(
                            t,
                            summary.topRitualId
                          )} (${summary.topRitualCount})`
                        : "—"}
                    </div>
                  </div>

                  <div className="min-w-[140px] flex-1">
                    <div className="text-xs text-muted">
                      {t("insights:streak", "Streak")}
                    </div>
                    <div className="font-medium text-main">
                      {summary.streak ?? 0}🔥{" "}
                      {summary.hasTodayLog ? (
                        ""
                      ) : (
                        <span className="text-muted">
                          {t("insights:noEntryToday", "(no entry today)")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Goal Progress (always visible) */}
              <Card title={t("insights:goal.title", "Goal progress")}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted">{goalTitle}</div>
                    <div className="text-sm font-medium text-main truncate">
                      {goalLabel}
                    </div>

                    <div className="mt-3">
                      <div className="h-2 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--accent-600)]"
                          style={{ width: fmtPct(goalProgress.score) }}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                        <span>
                          {t("insights:goal.score", "Score")}:{" "}
                          <span className="text-main font-medium">
                            {fmtPct(goalProgress.score)}
                          </span>
                        </span>
                        <span>
                          {goalProgress.primaryLabel}:{" "}
                          <span className="text-main font-medium">
                            {goalProgress.primaryValue}
                          </span>
                        </span>
                        <span>
                          {goalProgress.secondaryLabel}:{" "}
                          <span className="text-main font-medium">
                            {goalProgress.secondaryValue}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {!isPro && (
                    <div className="shrink-0">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={enableProPreview}
                      >
                        {t("common:buttons.goPro", "Go Pro")}
                      </button>
                    </div>
                  )}
                </div>

                {!isPro && (
                  <p className="mt-3 text-xs text-muted">
                    {t(
                      "insights:goal.teaser",
                      "Unlock deeper goal analytics, trends, and personalized suggestions in Pro."
                    )}
                  </p>
                )}
              </Card>

              {/* Empty state */}
              {isEmpty && (
                <section className="card text-sm text-muted">
                  {t(
                    "insights:empty",
                    "No data yet—do one or two rituals and check back!"
                  )}
                </section>
              )}

              {/* If not Pro: stop here (keep UX clean) */}
              {!isPro ? null : (
                <>
                  {/* Mood distribution */}
                  <Card
                    title={t("insights:moodDistribution", "Mood distribution")}
                    right={
                      !!moodChart.length && (
                        <span className="text-xs text-muted">
                          {t("insights:entries", "{{count}} entries", {
                            count: rangeItems.length,
                          })}
                        </span>
                      )
                    }
                  >
                    {moodChart.length ? (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={moodChart}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={2}
                            >
                              {moodChart.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={COLORS[i % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Legend verticalAlign="bottom" height={24} />
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-xs text-muted">
                        {t(
                          "insights:noData",
                          "No data yet—do one or two rituals and check back!"
                        )}
                      </div>
                    )}
                  </Card>

                  {/* Sessions per day */}
                  <Card
                    title={t(
                      "insights:consistency",
                      "Consistency — sessions per day"
                    )}
                  >
                    {daySeries.length ? (
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={daySeries}
                            margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient
                                id="c"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#7c3aed"
                                  stopOpacity={0.4}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#7c3aed"
                                  stopOpacity={0.05}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="day"
                              tick={{ fontSize: 10 }}
                              interval={Math.ceil(windowDays / 7)}
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fontSize: 10 }}
                              width={24}
                            />
                            <Tooltip />
                            <Area
                              type="monotone"
                              dataKey="count"
                              stroke="#7c3aed"
                              fill="url(#c)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-xs text-muted">
                        {t(
                          "insights:noData",
                          "No data yet—do one or two rituals and check back!"
                        )}
                      </div>
                    )}
                  </Card>

                  {/* Time blocks */}
                  <Card
                    title={t(
                      "insights:timeBlocks",
                      "When you practice — time blocks"
                    )}
                  >
                    {blocks.length ? (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={blocks}
                            margin={{
                              left: 0,
                              right: 0,
                              top: 10,
                              bottom: 0,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                            />
                            <XAxis dataKey="block" tick={{ fontSize: 10 }} />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fontSize: 10 }}
                              width={24}
                            />
                            <Tooltip />
                            <Bar
                              dataKey="count"
                              fill="#22c55e"
                              radius={[6, 6, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-xs text-muted">
                        {t(
                          "insights:noData",
                          "No data yet—do one or two rituals and check back!"
                        )}
                      </div>
                    )}
                  </Card>

                  {/* Quick wins */}
                  <Card title={t("insights:quickWins", "Quick wins")}>
                    {!quickWins.length ? (
                      <div className="text-xs text-muted">
                        {t(
                          "insights:noData",
                          "No data yet—do one or two rituals and check back!"
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left text-muted">
                              <th className="py-1 pr-3">
                                {t("insights:table.ritual", "Ritual")}
                              </th>
                              <th className="py-1 pr-3">
                                {t("insights:table.avgTime", "Avg (s)")}
                              </th>
                              <th className="py-1">
                                {t("insights:table.samples", "Samples")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {quickWins.map((r) => (
                              <tr
                                key={r.ritualId}
                                className="border-t"
                                style={{ borderColor: "var(--border)" }}
                              >
                                <td className="py-2 pr-3 font-medium text-main">
                                  {isRitualId(r.ritualId)
                                    ? localizedTitleForRitualId(t, r.ritualId)
                                    : r.ritualId}
                                </td>
                                <td className="py-2 pr-3 text-main">
                                  {r.avg}
                                </td>
                                <td className="py-2 text-main">{r.n}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <p className="mt-2 text-xs text-muted">
                      {t(
                        "insights:tipShortRituals",
                        "Tip: short rituals reduce friction — a great way to build a streak."
                      )}
                    </p>
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}