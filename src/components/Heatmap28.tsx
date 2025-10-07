import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
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

      // mark repaired days
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

  const shade = (c: number) =>
    c === 0 ? 'bg-gray-100'
      : c === 1 ? 'bg-brand-100'
      : c === 2 ? 'bg-brand-200'
      : c === 3 ? 'bg-brand-300'
      : 'bg-brand-700';

  return (
    <div className="rounded-2xl p-3 border bg-surface-1">
      <div className="flex items-center justify-between mb-2 ">
        <div className="text-sm font-medium">Past 28 days</div>
        <div className="text-xs text-gray-500">{total} sessions • {streak}-day streak</div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => (
          <div
            key={i}
            className={`h-6 w-6 rounded ${shade(c.count)} ${c.repaired ? 'ring-2 ring-brand-400' : ''}`}
            title={`${dayjs(c.d).format('MMM D')}: ${c.count} session(s)${c.repaired ? ' (repaired)' : ''}`}
            aria-label={`${dayjs(c.d).format('MMM D')}: ${c.count} session(s)${c.repaired ? ' (repaired)' : ''}`}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-500">
        <span>Legend</span>
        <span className="h-3 w-3 rounded bg-gray-100" />
        <span className="h-3 w-3 rounded bg-brand-100" />
        <span className="h-3 w-3 rounded bg-brand-200" />
        <span className="h-3 w-3 rounded bg-brand-300" />
        <span className="h-3 w-3 rounded bg-brand-700" />
        <span className="h-3 w-3 rounded bg-brand-100 ring-2 ring-brand-400" title="repaired" />
        <span className="ml-1">• repaired</span>
      </div>

      {!total && (
        <p className="text-xs text-gray-500 mt-3">
          No sessions yet—start your first ritual to light up the grid.
        </p>
      )}
    </div>
  );
}
