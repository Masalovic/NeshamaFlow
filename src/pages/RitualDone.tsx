// src/pages/RitualDone.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/ui/Header';
import { loadHistory, type LogItem } from '../lib/history';
import { titleForRitualId } from '../lib/ritualEngine';

function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  return `${m} min`;
}

function afterCareFor(ritualId: string): string[] {
  switch (ritualId) {
    case 'box-breath-2m':
      return [
        'Take one slower breath and unclench your jaw.',
        'Soften the next exhale; notice shoulders drop.',
        'If helpful, do 1–2 quiet cycles later today.'
      ];
    case '478-pace-2m':
      return [
        'If light-headed, breathe normally for a minute.',
        'Use 4-7-8 at bedtime: 3–4 rounds is plenty.',
        'Sip water and avoid standing up too fast.'
      ];
    case 'body-scan-1m':
      return [
        'Roll shoulders once; soften forehead and tongue.',
        'Note one area to revisit for 30s later today.',
        'Take a sip of water and stretch gently.'
      ];
    case 'ground-54321':
      return [
        'Pick one tiny next action and do it slowly.',
        'Open your hands; relax the tongue from the palate.',
        'If agitation returns, take a slow, longer exhale.'
      ];
    case 'compassion-break':
      return [
        'Place a hand on your heart and offer one kind phrase.',
        'Remember “common humanity”: others feel this too.',
        'Write one supportive line you can reuse later.'
      ];
    case 'gratitude-3':
      return [
        'Savor one concrete detail for ~10 seconds.',
        'If possible, send a 1-line thank-you message.',
        'Smile softly to help encode the memory.'
      ];
    default:
      return [
        'Take one slower breath and relax your shoulders.',
        'Drink a sip of water (tiny rituals stick better!).',
        'Optional: jot a 1-line note in History.'
      ];
  }
}

export default function RitualDone() {
  const navigate = useNavigate();
  const [last, setLast] = useState<LogItem | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await loadHistory();
      if (!alive) return;
      if (!list.length) return setLast(null);
      // newest-first by timestamp
      const latest = [...list].sort((a, b) => (a.ts < b.ts ? 1 : -1))[0];
      setLast(latest);
    })();
    return () => { alive = false; };
  }, []);

  const ritualTitle = last ? titleForRitualId(last.ritualId) : 'ritual';
  const tips = afterCareFor(last?.ritualId ?? '');

  return (
    <div className="flex h-full flex-col">
      <Header title="Ritual done" back />
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[420px] mx-auto">
          <div className="rounded-2xl bg-white shadow p-6 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-2xl">
              ✅
            </div>

            <h2 className="text-lg font-semibold">Session complete</h2>

            <p className="mt-1 text-sm text-gray-600">
              {last ? (
                <>
                  Logged <strong>{fmtDuration(last.durationSec)}</strong> — {ritualTitle}.
                </>
              ) : (
                'Saved.'
              )}
            </p>

            <div className="mt-4 text-left">
              <div className="text-sm font-semibold text-gray-800 text-center">After-care</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
                {tips.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                className="btn btn-primary w-full"
                onClick={() => navigate('/log', { replace: true })}
              >
                Log another
              </button>
              <button
                className="btn btn-secondary w-full"
                onClick={() => navigate('/history')}
              >
                See history
              </button>
            </div>

            <button
              className="mt-4 text-sm text-brand-700 underline"
              onClick={() => navigate('/settings')}
            >
              Set a smart reminder
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
