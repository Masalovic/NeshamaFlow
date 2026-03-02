// src/pages/History.tsx
import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Header from "../components/ui/Header";
import InsightChips from "../components/InsightChips";
import Heatmap28 from "../components/Heatmap28";

import { loadHistory, type LogItem } from "../lib/history";
import { ready as storageReady } from "../lib/secureStorage";
import { titleForRitualId, type RitualId } from "../lib/ritualEngine";
import { tRitualTitle } from "../lib/i18nRitual";

dayjs.extend(relativeTime);

function fmtTime(ts: string): string {
  return dayjs(ts).format("HH:mm");
}

function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  return `${m} min`;
}

export default function History() {
  const navigate = useNavigate();
  const { t } = useTranslation(["history", "common"]);

  const [items, setItems] = useState<LogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [unlocked, setUnlocked] = useState<boolean>(() => storageReady());

  function dayLabel(dISO: string): string {
    const d = dayjs(dISO);
    if (d.isSame(dayjs(), "day")) return t("history:labels.today", "Today");
    if (d.isSame(dayjs().subtract(1, "day"), "day")) {
      return t("history:labels.yesterday", "Yesterday");
    }
    return d.format(t("history:labels.format", "ddd, MMM D"));
  }

  // wait for secure storage to be ready (if locked)
  useEffect(() => {
    if (unlocked) return;

    const id = setInterval(() => {
      if (storageReady()) {
        setUnlocked(true);
        clearInterval(id);
      }
    }, 250);

    return () => clearInterval(id);
  }, [unlocked]);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const list = await loadHistory();
      const sorted = [...list].sort((a, b) => (a.ts < b.ts ? 1 : -1));
      setItems(sorted);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load history.";
      setError(msg);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // load history (single source of truth)
  useEffect(() => {
    if (!unlocked) return;
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  // group by day for sticky headers (safe against invalid timestamps)
  const grouped = useMemo(() => {
    const map = new Map<string, LogItem[]>();

    items.forEach((it) => {
      const d = dayjs(it.ts);
      if (!d.isValid()) return;

      const key = d.startOf("day").toISOString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    });

    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [items]);

  const empty = !isLoading && !error && items.length === 0;

  return (
    <div className="flex h-full flex-col">
      <Header title={t("history:title", "History")} back />

      <button
        type="button"
        onClick={() => navigate("/insights")}
        className="mx-auto mt-1 text-xs underline text-accent"
        aria-label={t("history:openInsights", "Open Insights")}
      >
        {t("common:nav.insights", "Insights")}
      </button>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-[420px] space-y-4">
          <Heatmap28 />
          <InsightChips compact />

          {isLoading && (
            <div className="text-center text-muted">
              {t("history:loading", "Loading…")}
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-2xl border border-token bg-surface-1 p-4 text-center shadow-soft">
              <div className="text-sm text-main">
                {t("history:error", "Couldn’t load history.")}
              </div>
              <div className="mt-1 text-xs text-muted">{error}</div>

              <button
                type="button"
                onClick={fetchHistory}
                className="mt-3 rounded-xl border border-token bg-surface-2 px-3 py-2 text-sm text-main"
              >
                {t("common:buttons.retry", "Retry")}
              </button>
            </div>
          )}

          {empty && (
            <div className="card text-center text-dim">
              {t(
                "history:empty",
                "No sessions yet—start your first ritual to light up the grid."
              )}
            </div>
          )}

          {!isLoading &&
            !error &&
            grouped.map(([dayISO, rows]) => (
              <section
                key={dayISO}
                className="space-y-2"
                aria-label={dayLabel(dayISO)}
              >
                <div className="sticky top-0 z-[1] -mx-4 bg-nav px-4 py-1 text-xs font-medium text-muted backdrop-blur">
                  {dayLabel(dayISO)}
                </div>

                <div className="space-y-2">
                  {rows.map((it) => {
                    const ritualId =
                      (it.ritualId as RitualId) ??
                      ("box-breath-2m" as RitualId);

                    const title = tRitualTitle(
                      t,
                      ritualId,
                      titleForRitualId(it.ritualId)
                    );

                    return (
                      <article
                        key={it.id}
                        className="flex items-start gap-3 rounded-2xl border border-token bg-surface-1 p-3 shadow-soft"
                      >
                        <div
                          className="select-none text-2xl leading-none"
                          aria-hidden
                        >
                          {String(it.mood)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-main">
                              {fmtTime(it.ts)}
                            </div>
                            <div className="text-[11px] text-muted">
                              · {fmtDuration(it.durationSec ?? 0)}
                            </div>

                            <div
                              className="ml-auto truncate text-[11px] text-muted"
                              title={title}
                              aria-label={title}
                            >
                              {title}
                            </div>
                          </div>

                          {it.note && it.note.trim() !== "" && (
                            <p className="mt-1 break-words text-sm text-dim">
                              {it.note}
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
        </div>
      </main>
    </div>
  );
}