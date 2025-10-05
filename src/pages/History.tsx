import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { loadHistory, type LogItem } from '../lib/history';
import { ready as storageReady } from '../lib/secureStorage';
import { titleForRitualId } from '../lib/ritualEngine';
import InsightChips from "../components/InsightChips";
import Heatmap28 from '../components/Heatmap28';

dayjs.extend(relativeTime);

function dayLabel(dISO: string): string {
  const d = dayjs(dISO);
  if (d.isSame(dayjs(), 'day')) return 'Today';
  if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Yesterday';
  return d.format('ddd, MMM D');
}

function fmtTime(ts: string): string {
  return dayjs(ts).format('HH:mm');
}

function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  return `${m} min`;
}

export default function History() {
  const [items, setItems] = useState<LogItem[] | null>(null);
  const [unlocked, setUnlocked] = useState<boolean>(storageReady());

  // Poll until AppLock sets the in-memory encryption key
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

  // Load history once unlocked
  useEffect(() => {
    if (!unlocked) return;
    let alive = true;
    (async () => {
      const list = await loadHistory(); // returns [] if nothing stored
      if (!alive) return;
      // newest first
      const sorted = [...list].sort((a, b) => (a.ts < b.ts ? 1 : -1));
      setItems(sorted);
    })();
    return () => {
      alive = false;
    };
  }, [unlocked]);

  const grouped = useMemo(() => {
    const map = new Map<string, LogItem[]>();
    (items ?? []).forEach((it) => {
      const key = dayjs(it.ts).startOf('day').toISOString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    });
    // newest-day-first array of [dayISO, items[]]
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [items]);

  const empty = (items?.length ?? 0) === 0;

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <header className="h-12 flex items-center justify-between border-b bg-white px-3">
        <h1 className="text-lg font-semibold">History</h1>
        <a href="/insights" className="text-xs text-brand-700 underline" aria-label="See Insights">
          Insights
        </a>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[420px] mx-auto space-y-4">
          {/* 28-day streak heatmap */}
          <Heatmap28 />
          <InsightChips compact />

          {items === null && <div className="text-center text-gray-400">Loading…</div>}

          {empty && (
            <div className="card text-center text-gray-600">
              No sessions yet—start your first ritual to light up the grid.
            </div>
          )}

          {/* Grouped timeline */}
          {grouped.map(([dayISO, rows]) => (
            <section key={dayISO} className="space-y-2" aria-label={dayLabel(dayISO)}>
              <div className="sticky top-0 z-[1] -mx-4 px-4 py-1 bg-gray-50/95 backdrop-blur text-xs font-medium text-gray-500">
                {dayLabel(dayISO)}
              </div>

              <div className="space-y-2">
                {rows.map((it) => (
                  <article
                    key={it.id}
                    className="bg-white rounded-2xl shadow-soft p-3 flex items-start gap-3"
                  >
                    <div className="text-2xl leading-none select-none" aria-hidden>
                      {String(it.mood)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">{fmtTime(it.ts)}</div>
                        <div className="text-[11px] text-gray-500">· {fmtDuration(it.durationSec)}</div>
                        <div className="ml-auto text-[11px] text-gray-400 truncate">
                          {titleForRitualId(it.ritualId)}
                        </div>
                      </div>
                      {it.note && it.note.trim() !== '' && (
                        <p className="mt-1 text-sm text-gray-700 break-words">{it.note}</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
