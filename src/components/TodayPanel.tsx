import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { loadHistory, type LogItem } from '../lib/history';
import { setItem as sSet } from '../lib/secureStorage';
import { Sparkles, Sun, Moon, Coffee } from 'lucide-react';

function greeting() {
  const h = dayjs().hour();
  if (h < 5) return { text: 'Late night', Icon: Moon };
  if (h < 12) return { text: 'Good morning', Icon: Sun };
  if (h < 17) return { text: 'Good afternoon', Icon: Coffee };
  return { text: 'Good evening', Icon: Moon };
}

function suggestTitle(): string {
  const h = dayjs().hour();
  if (h < 12) return 'Box Breathing (2 min)';
  if (h < 18) return '1-min Body Scan';
  return 'Gratitude ×3';
}

export default function TodayPanel() {
  const nav = useNavigate();
  const [list, setList] = useState<LogItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const items = await loadHistory();
      if (alive) setList(items);
    })();
    return () => { alive = false; };
  }, []);

  const { minutesToday, last } = useMemo(() => {
    const items = Array.isArray(list) ? list : [];
    const start = dayjs().startOf('day');
    const today = items.filter(i => dayjs(i.ts).isAfter(start));
    const mins = today.reduce((m, i) => m + Math.max(0, i.durationSec) / 60, 0);
    const lastItem = items.length ? items[0] : null;
    return { minutesToday: Math.round(mins * 10) / 10, last: lastItem };
  }, [list]);

  const goalMin = 2;
  const donePct = Math.min(100, Math.round((minutesToday / goalMin) * 100));
  const { text: greet, Icon } = greeting();
  const suggestion = suggestTitle();

  async function quickStart() {
    // Prefer last known mood so the ritual flow can start immediately.
    if (last) {
      await sSet('mood', last.mood);
      await sSet('note', '');
      nav('/ritual'); // uses the saved mood to suggest a ritual
    } else {
      nav('/log'); // first-time users pick a mood
    }
  }

  return (
    <section className="rounded-2xl border bg-white p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className="text-brand-800" />
        <div className="text-sm font-medium">{greet}</div>
      </div>

      <div className="text-sm text-gray-600">
        Suggested today: <span className="font-medium text-gray-800">{suggestion}</span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="text-xs text-gray-500">
          Goal: {goalMin} min · <span className="text-gray-700 font-medium">{minutesToday} min</span> done
          <div className="mt-1 h-2 w-40 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-brand-200"
              style={{ width: `${donePct}%` }}
              aria-label={`Progress ${donePct}%`}
            />
          </div>
        </div>

        <button className="btn btn-secondary inline-flex items-center gap-1"
                onClick={quickStart}>
          <Sparkles size={16} /> Start suggestion
        </button>
      </div>
    </section>
  );
}
