import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { loadHistory, type LogItem } from '../lib/history';
import { loadSettings } from '../lib/settings';
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
  const [goalMin, setGoalMin] = useState<number>(2);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [items, s] = await Promise.all([loadHistory(), loadSettings()]);
      if (!alive) return;
      setList(items);
      setGoalMin(s.goalMin ?? 2);
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

  const donePct = Math.min(100, Math.round((minutesToday / Math.max(1, goalMin)) * 100));
  const { text: greet, Icon } = greeting();
  const suggestion = suggestTitle();

  async function quickStart() {
    if (last) {
      await sSet('mood', last.mood);
      await sSet('note', '');
      nav('/ritual');
    } else {
      nav('/log');
    }
  }

  return (
    <section className="card p-4 ">
      <div className="mb-1 flex items-center gap-2 ">
        <Icon size={16} style={{ color: 'var(--accent-500)' }} />
        <div className="text-sm font-medium text-main">{greet}</div>
      </div>

      <div className="text-sm text-muted">
        Suggested today:{' '}
        <span className="font-medium text-main text-brand-400">{suggestion}</span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="text-xs text-muted">
          Goal: {goalMin} min ·{' '}
          <span className="font-medium text-main">{minutesToday} min</span> done
          <div
            className="mt-1 h-2 w-40 overflow-hidden rounded-full"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <div
              className="h-full"
              style={{ width: `${donePct}%`, background: 'var(--accent-300)' }}
              aria-label={`Progress ${donePct}%`}
            />
          </div>
        </div>

        <button
          className="btn btn-secondary inline-flex items-center gap-1"
          onClick={quickStart}
        >
          <Sparkles size={16} /> Start suggestion
        </button>
      </div>
    </section>
  );
}
