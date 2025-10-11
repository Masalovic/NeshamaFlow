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
  const { t } = useTranslation(["insights"]); // uses insights namespace
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

  // “Past 28d • N sessions”
  chips.push({
    label: t("chips.lastN", { n: windowDays, defaultValue: "Last {{n}}d" }),
    value: t("chips.sessions", {
      count: qs.sessions,
      defaultValue: "{{count}} sessions",
    }),
  });

  // “Avg time • 2m”
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
    <div className={`flex flex-wrap gap-2 ${compact ? "mt-2" : "mt-3"}`}>
      {chips.map((c, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] text-gray-700 bg-white"
          aria-label={`${c.label}: ${c.value}`}
          title={`${c.label}: ${c.value}`}
        >
          <strong className="font-medium text-gray-600">{c.label}</strong>
          <span>·</span>
          <span className="truncate max-w-[9rem]">{c.value}</span>
        </span>
      ))}
    </div>
  );
}
