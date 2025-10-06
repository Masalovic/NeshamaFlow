// src/pages/RitualDone.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/ui/Header';
import Button from '../components/ui/Button';
import { loadHistory, type LogItem } from '../lib/history';
import { titleForRitualId } from '../lib/ritualEngine';
import dayjs from 'dayjs';

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
        'If helpful, do 1–2 quiet cycles later today.',
      ];
    case '478-pace-2m':
      return [
        'If light-headed, breathe normally for a minute.',
        'Use 4-7-8 at bedtime: 3–4 rounds is plenty.',
        'Sip water and avoid standing up too fast.',
      ];
    case 'body-scan-1m':
      return [
        'Roll shoulders once; soften forehead and tongue.',
        'Note one area to revisit for 30s later today.',
        'Take a sip of water and stretch gently.',
      ];
    case 'ground-54321':
      return [
        'Pick one tiny next action and do it slowly.',
        'Open your hands; relax the tongue from the palate.',
        'If agitation returns, take a slow, longer exhale.',
      ];
    case 'compassion-break':
      return [
        'Place a hand on your heart and offer one kind phrase.',
        'Remember “common humanity”: others feel this too.',
        'Write one supportive line you can reuse later.',
      ];
    case 'gratitude-3':
      return [
        'Savor one concrete detail for ~10 seconds.',
        'If possible, send a 1-line thank-you message.',
        'Smile softly to help encode the memory.',
      ];
    default:
      return [
        'Take one slower breath and relax your shoulders.',
        'Drink a sip of water (tiny rituals stick better!).',
        'Optional: jot a 1-line note in History.',
      ];
  }
}

function buildSummary(item: LogItem): string {
  const title = titleForRitualId(item.ritualId);
  const when = dayjs(item.ts).format('MMM D, HH:mm');
  const mins = Math.max(1, Math.round((item.durationSec ?? 0) / 60));
  const note = item.note ? `\nNote: ${item.note}` : '';
  return `Session complete ✅
Ritual: ${title}
Duration: ${mins} min
Mood: ${item.mood}
When: ${when}${note}`;
}

export default function RitualDone() {
  const navigate = useNavigate();
  const [last, setLast] = useState<LogItem | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await loadHistory();
      if (!alive) return;
      if (!list.length) return setLast(null);
      const latest = [...list].sort((a, b) => (a.ts < b.ts ? 1 : -1))[0];
      setLast(latest);
    })();
    return () => { alive = false; };
  }, []);

  const ritualTitle = last ? titleForRitualId(last.ritualId) : 'ritual';
  const tips = afterCareFor(last?.ritualId ?? '');
  const summary = useMemo(() => (last ? buildSummary(last) : ''), [last]);

  async function copySummary() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = summary;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  }

  async function shareSummary() {
    if (!summary) return;
    // @ts-ignore
    if (typeof navigator.share === 'function') {
      try {
        // @ts-ignore
        await navigator.share({ title: 'My ritual session', text: summary });
        return;
      } catch {}
    }
    await copySummary();
  }

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
                <>Logged <strong>{fmtDuration(last.durationSec)}</strong> — {ritualTitle}.</>
              ) : (
                'Saved.'
              )}
            </p>

            {last && (
              <div className="mt-4 text-left">
                <div className="text-sm font-semibold text-gray-800 text-center">Summary</div>
                <div className="mt-2 rounded-xl bg-gray-50 border p-3 text-sm text-gray-700 whitespace-pre-wrap">
                  {summary}
                </div>
              </div>
            )}

            <div className="mt-4 text-left">
              <div className="text-sm font-semibold text-gray-800 text-center">After-care</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
                {tips.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>

            {/* Actions */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                className="w-full"
                variant="primary"
                onClick={() => navigate('/log', { replace: true })}
              >
                Log another
              </Button>
              <Button
                className="w-full"
                variant="outline"   // was "secondary" -> not in your Variant union
                onClick={() => navigate('/history')}
              >
                See history
              </Button>
            </div>

            {last && (
              <div className="mt-3 flex gap-2 justify-center">
                <Button variant="outline" onClick={shareSummary}>Share</Button>
                <Button variant="ghost" onClick={copySummary}>
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            )}

            <button
              className="mt-4 text-sm link-accent"
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
