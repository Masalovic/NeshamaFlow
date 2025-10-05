// src/pages/Insights.tsx
import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/ui/Header";
import { loadHistory, type LogItem } from "../lib/history";
import { titleForRitualId } from "../lib/ritualEngine";
import dayjs from "dayjs";
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

  // last 28 days (inclusive of today)
  const last28 = useMemo(() => {
    const list = history ?? [];
    const cutoff = dayjs().startOf("day").subtract(27, "day");
    return list.filter(x => dayjs(x.ts).isAfter(cutoff.subtract(1, "millisecond")));
  }, [history]);

  // 1) Mood distribution (last 28 days)
  const moodChart: MoodSlice[] = useMemo(() => {
    if (!last28.length) return [];
    const map = new Map<string, number>();
    last28.forEach(x => map.set(x.mood, (map.get(x.mood) || 0) + 1));
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [last28]);

  // 2) Sessions per day (last 28 days)
  const daySeries: DayPoint[] = useMemo(() => {
    const end = dayjs().startOf("day");
    const start = end.subtract(27, "day");
    const counts = new Map<string, number>();
    for (let i = 0; i < 28; i++) {
      counts.set(start.add(i, "day").format("YYYY-MM-DD"), 0);
    }
    last28.forEach(x => {
      const key = dayjs(x.ts).startOf("day").format("YYYY-MM-DD");
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([day, count]) => ({
      day: dayjs(day).format("MMM D"),
      count,
    }));
  }, [last28]);

  // 3) Time-of-day blocks (0–3h, 4–7h, … 20–23h)
  const blocks: Block[] = useMemo(() => {
    if (!last28.length) return [];
    const buckets = Array.from({ length: 24 }, () => 0);
    for (const x of last28) {
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
  }, [last28]);

  // 4) Quick wins: shortest average duration per ritual (top 3)
  const quickWins = useMemo(() => {
    if (!last28.length) return [] as { ritualId: string; avg: number; n: number }[];
    const map = new Map<string, { sum: number; n: number }>();
    for (const x of last28) {
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
  }, [last28]);

  const empty = (history?.length ?? 0) === 0;

  return (
    <div className="flex min-h-full flex-col">
      <Header title="Insights (Pro)" back />
      <main className="flex-1 p-4">
        <div className="max-w-[480px] mx-auto space-y-4 pb-24">
          {empty && (
            <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600">
              No data yet — complete a ritual or two and check back!
            </div>
          )}

          {/* Mood distribution */}
          <Card
            title="Last 28 days — mood distribution"
            right={
              !!moodChart.length && (
                <span className="text-xs text-gray-500">
                  {last28.length} entries
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
          <Card title="Consistency — sessions per day (28d)">
            {daySeries.length ? (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={daySeries}
                    margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="c" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={6} />
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

          {/* Quick wins table */}
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
