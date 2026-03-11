import React, { useEffect, useState } from "react";
import { loadHistory, type LogItem } from "../lib/history";
import { computeQuickStats, fmtAvg } from "../lib/quickStats";
import { useTranslation } from "react-i18next";

export default function InsightChips({
  windowDays = 28,
  compact = false,
}: {
  windowDays?: number;
  compact?: boolean;
}) {
  const { t } = useTranslation(["insights"]);
  const [list, setList] = useState<LogItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const h = await loadHistory();
      if (alive) setList(h);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (list === null) return null;
  const qs = computeQuickStats(list, windowDays);

  const chips: { label: string; value: string }[] = [];

  chips.push({
    label: t("chips.lastN", { n: windowDays, defaultValue: "Last {{n}}d" }),
    value: t("chips.sessions", {
      count: qs.sessions,
      defaultValue: "{{count}} sessions",
    }),
  });

  chips.push({
    label: t("chips.avgTime", "Avg time"),
    value: fmtAvg(qs.avgDurationSec),
  });

  if (qs.bestBlockLabel) {
    chips.push({
      label: t("chips.bestTime", "Best time"),
      value: qs.bestBlockLabel,
    });
  }
  if (qs.topRitualTitle) {
    chips.push({
      label: t("chips.mostFrequent", "Most frequent"),
      value: qs.topRitualTitle,
    });
  }

  if (!chips.length) return null;

  return (
    <div
      className={[
        "grid grid-cols-2 gap-2",
        compact ? "mt-2" : "mt-3",
      ].join(" ")}
    >
      {chips.map((c, i) => (
        <span
          key={i}
          className="w-full inline-flex items-center justify-center gap-1 rounded-full border border-token px-3 py-1.5 text-[11px] bg-[var(--surface-2)] text-[var(--text-dim)]"
          aria-label={`${c.label}: ${c.value}`}
          title={`${c.label}: ${c.value}`}
        >
          <strong className="font-medium text-main whitespace-nowrap">
            {c.label}
          </strong>
          <span className="opacity-70">·</span>
          <span className="truncate max-w-[10rem] text-main/90">{c.value}</span>
        </span>
      ))}
    </div>
  );
}