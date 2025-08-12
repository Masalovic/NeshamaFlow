import React, { useMemo } from 'react'
import dayjs from 'dayjs'
import { loadHistory } from '../lib/history'

type Cell = { d: string; count: number }

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0
  const set = new Set(dates)
  let s = 0
  let cursor = dayjs().startOf('day')
  while (set.has(cursor.format('YYYY-MM-DD'))) {
    s++; cursor = cursor.subtract(1, 'day')
  }
  return s
}

export default function Heatmap28() {
  const { cells, total, streak } = useMemo(() => {
    const logs = loadHistory()
    const counts = new Map<string, number>()
    logs.forEach(l => {
      const key = dayjs(l.ts).local().startOf('day').format('YYYY-MM-DD')
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    const end = dayjs().startOf('day')
    const start = end.subtract(27, 'day')
    const arr: Cell[] = []
    for (let i = 0; i < 28; i++) {
      const d = start.add(i, 'day').format('YYYY-MM-DD')
      arr.push({ d, count: counts.get(d) || 0 })
    }
    const total = logs.length
    const streak = calcStreak(Array.from(counts.keys()))
    return { cells: arr, total, streak }
  }, [])

  const shade = (c: number) =>
    c === 0 ? 'bg-gray-100'
    : c === 1 ? 'bg-brand-200'
    : c === 2 ? 'bg-brand-300'
    : c === 3 ? 'bg-brand-700/60'
    : 'bg-brand-700'

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">Past 28 days</div>
        <div className="text-xs text-gray-500">{total} sessions • {streak}-day streak</div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => (
          <div
            key={i}
            className={`h-6 w-6 rounded ${shade(c.count)}`}
            title={`${dayjs(c.d).format('MMM D')}: ${c.count} session(s)`}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-500">
        <span>Legend</span>
        <span className="h-3 w-3 rounded bg-gray-100" />
        <span className="h-3 w-3 rounded bg-brand-200" />
        <span className="h-3 w-3 rounded bg-brand-300" />
        <span className="h-3 w-3 rounded bg-brand-700/60" />
        <span className="h-3 w-3 rounded bg-brand-700" />
      </div>

      {!total && (
        <p className="text-xs text-gray-500 mt-3">
          No sessions yet—start your first ritual to light up the grid.
        </p>
      )}
    </div>
  )
}
