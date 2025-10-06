// src/pages/Insights.tsx
import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/ui/Header";
import { summarize } from "../lib/insights";
import { titleForRitualId } from "../lib/ritualEngine";
import { loadHistory, type LogItem } from "../lib/history";
import dayjs, { Dayjs } from "dayjs";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Legend,
} from "recharts";

// Small wrapper for consistent card styling
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
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

type MoodSlice = { name: string; value: number };
type DayPoint  = { day: string; count: number };
type Block     = { block: string; count: number };

const COLORS = [
  "#7c3aed", "#22c55e", "#f59e0b", "#ef4444",
  "#06b6d4", "#a78bfa", "#84cc16", "#fb7185",
];

type Preset = "7" | "28" | "90" | "custom";

export default function Insights() {
  const [history, setHistory] = useState<LogItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await loadHistory();
      if (alive) setHistory(list);
    })();
    return () => { alive = false; };
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
    // Custom: fall back to last 28d if invalid
    const s = dayjs(customStart || "").startOf("day");
    const e = dayjs(customEnd || "").endOf("day");
    if (!s.isValid() || !e.isValid() || s.isAfter(e)) {
      return { start: today.startOf("day").subtract(27, "day"), end: today };
    }
    return { start: s, end: e };
  }, [preset, customStart, customEnd]);

  const windowDays = Math.max(1, end.startOf("day").diff(start.startOf("day"), "day") + 1);

  // -------- Data slicing --------
  const rangeItems: LogItem[] = useMemo(() => {
    const list = history ?? [];
    return list.filter(x => {
      const t = dayjs(x.ts);
      return !t.isBefore(start) && !t.isAfter(end);
    });
  }, [history, start, end]);

  // Summary for the visible range
  const summary = summarize(rangeItems ?? [], windowDays);

  // 1) Mood distribution
  const moodChart: MoodSlice[] = useMemo(() => {
    if (!rangeItems.length) return [];
    const map = new Map<string, number>();
    rangeItems.forEach(x => map.set(x.mood, (map.get(x.mood) || 0) + 1));
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
    rangeItems.forEach(x => {
      const key = dayjs(x.ts).startOf("day").format("YYYY-MM-DD");
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([day, count]) => ({
      day: dayjs(day).format(windowDays <= 35 ? "MMM D" : "MM/DD"),
      count,
    }));
  }, [rangeItems, start, windowDays]);

  // 3) Time-of-day blocks (0–3h, 4–7h, …)
  const blocks: Block[] = useMemo(() => {
    if (!rangeItems.length) return [];
    const buckets = Array.from({ length: 24 }, () => 0);
    for (const x of rangeItems) {
      const h = new Date(x.ts).getHours();
      buckets[h]++;
    }
    const out: Block[] = [];
    for (let i = 0; i < 24; i += 4) {
      const value = buckets.slice(i, i + 4).reduce((a, b) => a + b, 0);
      const label = `${String(i).padStart(2, "0")}-${String(i + 3).padStart(2, "0")}h`;
      out.push({ block: label, count: value });
    }
    return out.filter(b => b.count > 0).sort((a, b) => b.count - a.count);
  }, [rangeItems]);

  // 4) Quick wins
  const quickWins = useMemo(() => {
    if (!rangeItems.length) return [] as { ritualId: string; avg: number; n: number }[];
    const map = new Map<string, { sum: number; n: number }>();
    for (const x of rangeItems) {
      const p = map.get(x.ritualId) || { sum: 0, n: 0 };
      p.sum += x.durationSec || 0;
      p.n += 1;
      map.set(x.ritualId, p);
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

  const empty = (history?.length ?? 0) === 0;

  // Range UI
  function RangeControls() {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs text-gray-500">
          {start.format("MMM D, YYYY")} – {end.format("MMM D, YYYY")}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as Preset)}
            className="rounded-md border px-2 py-1 text-sm"
            aria-label="Select range"
          >
            <option value="7">Last 7 days</option>
            <option value="28">Last 28 days</option>
            <option value="90">Last 90 days</option>
            <option value="custom">Custom…</option>
          </select>

          {preset === "custom" && (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-md border px-2 py-1 text-sm"
                aria-label="Start date"
              />
              <span className="text-gray-400">–</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-md border px-2 py-1 text-sm"
                aria-label="End date"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header title="Insights (Pro)" back />
      <main className="flex-1 p-4">
        <div className="max-w-[560px] mx-auto space-y-4 pb-24">
          {/* Summary header */}
          <div className="rounded-2xl border bg-white p-4">
            <RangeControls />
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <div className="flex-1 min-w-[140px]">
                <div className="text-gray-500 text-xs">This period</div>
                <div className="font-medium">
                  {Math.round((summary.totalSec ?? 0) / 60)} min · {summary.sessions ?? 0} sessions
                </div>
              </div>

              <div className="flex-1 min-w-[140px]">
                <div className="text-gray-500 text-xs">Avg session</div>
                <div className="font-medium">{summary.avgSec ?? 0}s</div>
              </div>

              <div className="flex-1 min-w-[140px]">
                <div className="text-gray-500 text-xs">Top ritual</div>
                <div className="font-medium truncate">
                  {summary.topRitualId
                    ? `${titleForRitualId(summary.topRitualId)} (${summary.topRitualCount})`
                    : "—"}
                </div>
              </div>

              <div className="flex-1 min-w-[140px]">
                <div className="text-gray-500 text-xs">Streak</div>
                <div className="font-medium">
                  {summary.streak ?? 0}🔥 {summary.hasTodayLog ? "" : <span className="text-gray-400">(no entry today)</span>}
                </div>
              </div>
            </div>
          </div>

          {empty && (
            <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600">
              No data yet — complete a ritual or two and check back!
            </div>
          )}

          {/* Mood distribution */}
          <Card
            title="Mood distribution"
            right={
              !!moodChart.length && (
                <span className="text-xs text-gray-500">
                  {rangeItems.length} entries
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
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={24} />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-xs text-gray-500">No data yet.</div>
            )}
          </Card>

          {/* Sessions per day (sparkline) */}
          <Card title="Consistency — sessions per day">
            {daySeries.length ? (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daySeries} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="c" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={Math.ceil(windowDays / 7)} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#7c3aed" fill="url(#c)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-xs text-gray-500">No data yet.</div>
            )}
          </Card>

          {/* Best time blocks */}
          <Card title="When you practice — time blocks">
            {blocks.length ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={blocks} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="block" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-xs text-gray-500">No data yet.</div>
            )}
          </Card>

          {/* Quick wins */}
          <Card title="Quick wins">
            {!quickWins.length ? (
              <div className="text-xs text-gray-500">No data yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-1 pr-3">Ritual</th>
                      <th className="py-1 pr-3">Avg time (s)</th>
                      <th className="py-1">Samples</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quickWins.map((r) => (
                      <tr key={r.ritualId} className="border-t">
                        <td className="py-2 pr-3 font-medium">
                          {titleForRitualId(r.ritualId)}
                        </td>
                        <td className="py-2 pr-3">{r.avg}</td>
                        <td className="py-2">{r.n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Tip: short rituals reduce friction — a good way to build streaks.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
