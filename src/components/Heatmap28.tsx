import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { loadHistory } from '../lib/history';
import { getRepairSet } from '../lib/streak';

type Cell = { d: string; count: number; repaired?: boolean };

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const set = new Set(dates);
  let s = 0;
  let cursor = dayjs().startOf('day');
  while (set.has(cursor.format('YYYY-MM-DD'))) {
    s++;
    cursor = cursor.subtract(1, 'day');
  }
  return s;
}

export default function Heatmap28() {
  const { t } = useTranslation(['history', 'insights', 'common']);
  const [cells, setCells] = useState<Cell[]>([]);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    (async () => {
      const logs = await loadHistory();
      const repairs = await getRepairSet();

      const counts = new Map<string, number>();
      logs.forEach(l => {
        const key = dayjs(l.ts).startOf('day').format('YYYY-MM-DD');
        counts.set(key, (counts.get(key) || 0) + 1);
      });

      // mark repaired days as at least 1 so they render filled
      repairs.forEach(day => {
        counts.set(day, Math.max(1, counts.get(day) || 0));
      });

      const end = dayjs().startOf('day');
      const start = end.subtract(27, 'day');
      const arr: Cell[] = [];
      for (let i = 0; i < 28; i++) {
        const d = start.add(i, 'day').format('YYYY-MM-DD');
        arr.push({ d, count: counts.get(d) || 0, repaired: repairs.has(d) });
      }

      setCells(arr);
      setTotal(logs.length);
      setStreak(calcStreak(Array.from(counts.keys())));
    })();
  }, []);

  // Map a count to an accent shade (0 = white)
  const shadeColor = (c: number) => {
    if (c <= 0) return 'var(--surface-1, #ffffff)';   // empty (white)
    if (c === 1) return 'var(--accent-100)';          // light
    if (c === 2) return 'var(--accent-200)';
    if (c === 3) return 'var(--accent-300)';
    return 'var(--accent-500)';                       // strongest
  };

  // Use i18next pluralization (sessions_one/few/other)
  const sessionsLabel = t('insights:chips.sessions', {
    count: total,
    defaultValue: '{{count}} sessions'
  });

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">
          {t('history:heatmap.title', 'Past 28 days')}
        </div>
        <div className="text-xs text-muted">
          {sessionsLabel} · {streak}🔥
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c, i) => {
          const bg = shadeColor(c.count);
          const title = `${dayjs(c.d).format('MMM D')}: ${c.count} ${t('insights:chips.sessions', { count: c.count, defaultValue: 'sessions' })}${c.repaired ? ` (${t('history:heatmap.repaired', 'repaired')})` : ''}`;
          return (
            <div
              key={i}
              title={title}
              aria-label={title}
              className="h-6 w-6 rounded"
              style={{
                background: bg,
                outline: c.repaired ? '2px solid var(--accent-400)' : undefined,
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
              }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-[10px] text-muted">
        <span>{t('history:heatmap.legend', 'Legend')}</span>
        <span
          className="h-3 w-3 rounded"
          style={{ background: 'var(--surface-1, #ffffff)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' }}
        />
        <span className="h-3 w-3 rounded" style={{ background: 'var(--accent-100)' }} />
        <span className="h-3 w-3 rounded" style={{ background: 'var(--accent-200)' }} />
        <span className="h-3 w-3 rounded" style={{ background: 'var(--accent-300)' }} />
        <span className="h-3 w-3 rounded" style={{ background: 'var(--accent-500)' }} />
        <span
          className="h-3 w-3 rounded"
          style={{ background: 'var(--accent-100)', outline: '2px solid var(--accent-400)' }}
          title={t('history:heatmap.repaired', 'repaired')}
        />
        <span className="ml-1">• {t('history:heatmap.repaired', 'repaired')}</span>
      </div>

      {!total && (
        <p className="text-xs text-muted mt-3">
          {t('history:heatmap.empty', 'No sessions yet—start your first ritual to light up the grid.')}
        </p>
      )}
    </div>
  );
}
