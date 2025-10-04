import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { loadHistory, type LogItem } from '../lib/history';
import { ready as storageReady } from '../lib/secureStorage';
import Heatmap28 from '../components/Heatmap28';

export default function History() {
  const [items, setItems] = useState<LogItem[] | null>(null);
  const [unlocked, setUnlocked] = useState<boolean>(storageReady());

  // Wait until secureStorage key exists (after AppLock)
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

  // Load once unlocked
  useEffect(() => {
    if (!unlocked) return;
    let alive = true;
    (async () => {
      const list = await loadHistory();            // [] if nothing
      const last20 = list.slice(-20).reverse();    // newest first
      if (alive) setItems(last20);
    })();
    return () => { alive = false; };
  }, [unlocked]);

  const empty = items && items.length === 0;

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <header className="h-12 flex items-center justify-between border-b bg-white px-3">
        <h1 className="text-lg font-semibold">History</h1>
        <a
          href="/insights"
          className="text-xs text-brand-700 underline"
          aria-label="See Insights"
        >
          Insights
        </a>
      </header>

      <main className="flex-1 overflow-y-auto p-4" aria-busy={items === null}>
        <div className="max-w-[360px] mx-auto space-y-4">
          <Heatmap28 />

          {items === null && (
            <div className="text-center text-gray-400">Loading…</div>
          )}

          {empty && (
            <div className="text-center text-gray-500">No sessions yet.</div>
          )}

          {items && items.length > 0 && (
            <ul className="space-y-3" aria-label="Recent sessions">
              {items.map((it) => (
                <li key={it.id} className="bg-white rounded-lg shadow p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">
                        {dayjs(it.ts).format('DD MMM, HH:mm')}
                      </div>
                      <div className="text-xs text-gray-500">
                        Ritual: {it.ritualId}
                        {typeof it.mood !== 'undefined' && (
                          <span className="ml-2">• Mood: {String(it.mood)}</span>
                        )}
                        {typeof it.durationSec === 'number' && it.durationSec > 0 && (
                          <span className="ml-2">• {Math.round(it.durationSec / 60)} min</span>
                        )}
                      </div>
                      {it.note && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {it.note}
                        </div>
                      )}
                    </div>
                    <div className="text-xl" aria-hidden>
                      🧘‍♀️
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
