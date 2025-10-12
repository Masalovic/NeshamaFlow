// src/components/Heatmap28.tsx
import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { loadHistory } from "../lib/history";
import { getRepairSet } from "../lib/streak";

type Cell = { d: string; count: number; repaired?: boolean };

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const set = new Set(dates);
  let s = 0;
  let cursor = dayjs().startOf("day");
  while (set.has(cursor.format("YYYY-MM-DD"))) {
    s++;
    cursor = cursor.subtract(1, "day");
  }
  return s;
}

export default function Heatmap28() {
  const { t } = useTranslation(["history", "insights", "common"]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    (async () => {
      const logs = await loadHistory();
      const repairs = await getRepairSet();

      const counts = new Map<string, number>();
      logs.forEach((l) => {
        const key = dayjs(l.ts).startOf("day").format("YYYY-MM-DD");
        counts.set(key, (counts.get(key) || 0) + 1);
      });

      // mark repaired days so they render filled
      repairs.forEach((day) => {
        counts.set(day, Math.max(1, counts.get(day) || 0));
      });

      const end = dayjs().startOf("day");
      const start = end.subtract(27, "day");
      const arr: Cell[] = [];
      for (let i = 0; i < 28; i++) {
        const d = start.add(i, "day").format("YYYY-MM-DD");
        arr.push({ d, count: counts.get(d) || 0, repaired: repairs.has(d) });
      }

      setCells(arr);
      setTotal(logs.length);
      setStreak(calcStreak(Array.from(counts.keys())));
    })();
  }, []);

  // map count -> accent shade
  const shadeColor = (c: number) => {
    if (c <= 0) return "var(--surface-2)"; // empty
    if (c === 1) return "var(--accent-100)";
    if (c === 2) return "var(--accent-200)";
    if (c === 3) return "var(--accent-300)";
    return "var(--accent-500)";
  };

  // text color for the day number so it stays legible
  const dayTextColor = (c: number) => {
    if (c <= 0) return "var(--text-muted)";
    if (c >= 4) return "#ffffff";
    return "rgba(0,0,0,.85)"; // works on light accent-100..300
  };

  const sessionsLabel = t("insights:chips.sessions", {
    count: total,
    defaultValue: "{{count}} sessions",
  });

  // Weekday headers for the first 7 cells (localized via dayjs format)
  const weekdayLabels = useMemo(() => {
    if (cells.length < 7) return [];
    const start = dayjs(cells[0].d);
    return Array.from({ length: 7 }, (_, i) =>
      start.add(i, "day").format("dd") // localized short weekday, e.g. Mo, Tu…
    );
  }, [cells]);

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium">
          {t("history:heatmap.title", "Past 28 days")}
        </div>
        <div className="text-xs text-muted">
          {sessionsLabel} · {streak}🔥
        </div>
      </div>

      {/* Weekday header row */}
      <div className="mb-1 grid grid-cols-7 gap-1.5">
        {weekdayLabels.map((w, i) => (
          <div
            key={i}
            className="h-4 text-center text-[10px] font-medium text-muted select-none"
          >
            {w}
          </div>
        ))}
      </div>

      {/* 4x7 calendar grid with day numbers inside each cell */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c, i) => {
          const bg = shadeColor(c.count);
          const d = dayjs(c.d);
          const title = `${d.format("MMM D")}: ${c.count} ${t(
            "insights:chips.sessions",
            { count: c.count, defaultValue: "sessions" }
          )}${c.repaired ? ` (${t("history:heatmap.repaired", "repaired")})` : ""}`;

          return (
            <div
              key={i}
              title={title}
              aria-label={title}
              className="relative h-8 w-8 rounded"
              style={{
                background: bg,
                outline: c.repaired ? "2px solid var(--accent-400)" : undefined,
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
              }}
            >
              {/* day-of-month number */}
              <span
                className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold select-none"
                style={{ color: dayTextColor(c.count) }}
              >
                {d.date()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-muted">
        <span>{t("history:heatmap.legend", "Legend")}</span>
        <span
          className="h-3 w-3 rounded"
          style={{
            background: "var(--surface-2)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
          }}
        />
        <span className="h-3 w-3 rounded" style={{ background: "var(--accent-100)" }} />
        <span className="h-3 w-3 rounded" style={{ background: "var(--accent-200)" }} />
        <span className="h-3 w-3 rounded" style={{ background: "var(--accent-300)" }} />
        <span className="h-3 w-3 rounded" style={{ background: "var(--accent-500)" }} />
        <span
          className="h-3 w-3 rounded"
          style={{ background: "var(--accent-100)", outline: "2px solid var(--accent-400)" }}
          title={t("history:heatmap.repaired", "repaired")}
        />
        <span className="ml-1">• {t("history:heatmap.repaired", "repaired")}</span>
      </div>

      {!total && (
        <p className="mt-3 text-xs text-muted">
          {t(
            "history:heatmap.empty",
            "No sessions yet—start your first ritual to light up the grid."
          )}
        </p>
      )}
    </div>
  );
}
