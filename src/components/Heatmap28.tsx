// src/components/Heatmap28.tsx
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { loadHistory } from '../lib/history';
import { getRepairSet } from '../lib/streak';

type Cell = { d: string; count: number; repaired?: boolean };

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const set = new Set(dates);
  let s = 0;
  let cur = dayjs().startOf('day');
  while (set.has(cur.format('YYYY-MM-DD'))) {
    s++;
    cur = cur.subtract(1, 'day');
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
        const k = dayjs(l.ts).startOf('day').format('YYYY-MM-DD');
        counts.set(k, (counts.get(k) || 0) + 1);
      });
      // ensure repaired days show as filled (at least 1)
      repairs.forEach(day => counts.set(day, Math.max(1, counts.get(day) || 0)));

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

  const cellCls = (c: number, repaired?: boolean) => {
    const base = 'h-6 w-6 rounded border transition-colors';
    const ring = repaired ? ' ring-2 ring-brand-400' : '';
    if (c <= 0) return `${base} bg-white border-default${ring}`;               // empty = white
    if (c === 1) return `${base} bg-brand-100 border-transparent${ring}`;     // light fill
    if (c === 2) return `${base} bg-brand-200 border-transparent${ring}`;
    if (c === 3) return `${base} bg-brand-300 border-transparent${ring}`;
    return `${base} bg-brand-700 border-transparent${ring}`;                  // strongest fill
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">Past 28 days</div>
        <div className="text-xs text-muted">{total} sessions • {streak}-day streak</div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => (
          <div
            key={i}
            className={cellCls(c.count, c.repaired)}
            title={`${dayjs(c.d).format('MMM D')}: ${c.count} session(s)${c.repaired ? ' (repaired)' : ''}`}
            aria-label={`${dayjs(c.d).format('MMM D')}: ${c.count} session(s)${c.repaired ? ' (repaired)' : ''}`}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 mt-3 text-[10px] text-muted">
        <span>Legend</span>
        <span className="h-3 w-3 rounded bg-white border border-default" />
        <span className="h-3 w-3 rounded bg-brand-100" />
        <span className="h-3 w-3 rounded bg-brand-200" />
        <span className="h-3 w-3 rounded bg-brand-300" />
        <span className="h-3 w-3 rounded bg-brand-700" />
        <span className="h-3 w-3 rounded bg-brand-100 ring-2 ring-brand-400" title="repaired" />
        <span className="ml-1">• repaired</span>
      </div>

      {!total && (
        <p className="text-xs text-muted mt-3">
          No sessions yet—start your first ritual to light up the grid.
        </p>
      )}
    </div>
  );
}
