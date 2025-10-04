import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/ui/Header';
import Button from '../components/ui/Button';
import { loadHistory, type LogItem } from '../lib/history';
import { isMoodKey } from '../lib/ritualEngine';

function niceDuration(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export default function RitualDone() {
  const nav = useNavigate();
  const [last, setLast] = useState<LogItem | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await loadHistory();
      if (!alive) return;
      setLast(list[0] ?? null);
    })();
    return () => { alive = false; };
  }, []);

  const practiced = useMemo(() => {
    if (!last) return null;
    // Guard: only treat true ritual rows as “just done”
    if (!isMoodKey(last.mood) || !last.ritualId) return null;
    return {
      when: new Date(last.ts),
      dur: niceDuration(Math.max(0, last.durationSec ?? 0)),
      ritualId: last.ritualId,
      mood: String(last.mood),
    };
  }, [last]);

  return (
    <div className="flex h-full flex-col">
      <Header title="Nice work ✨" back />
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[420px] mx-auto">
          <div className="rounded-2xl bg-white shadow p-6 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
            <h2 className="text-lg font-semibold">Session complete</h2>

            {practiced ? (
              <p className="text-sm text-gray-600 mt-1">
                Logged <span className="font-medium">{practiced.dur}</span> — {practiced.ritualId.replace(/_/g,' ')}.
              </p>
            ) : (
              <p className="text-sm text-gray-600 mt-1">Your practice was saved.</p>
            )}

            <div className="mt-4 text-sm text-gray-700">
              <p className="mb-1 font-medium">After-care</p>
              <ul className="text-left list-disc pl-5 space-y-1">
                <li>Take one slower breath and unclench your jaw.</li>
                <li>Drink a sip of water (tiny rituals stick better!).</li>
                <li>Optional: jot a 1-line note in <em>History</em>.</li>
              </ul>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="primary"
                className="col-span-1"
                onClick={() => nav('/log', { replace: true })}
              >
                Log another
              </Button>
              <Button
                variant="outline"
                className="col-span-1"
                onClick={() => nav('/history', { replace: true })}
              >
                See history
              </Button>
            </div>

            <div className="mt-3">
              <Button
                variant="ghost"
                onClick={() => nav('/settings')}
                title="Open Settings → Smart reminders"
              >
                Set a smart reminder
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
