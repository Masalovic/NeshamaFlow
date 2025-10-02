import React, { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Flame } from 'lucide-react'
import { loadHistory, type LogItem } from '../lib/history'

export default function StreakCard() {
  const [list, setList] = useState<LogItem[] | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const items = await loadHistory()
      if (alive) setList(items)
    })()
    return () => { alive = false }
  }, [])

  const { streak, todayCount } = useMemo(() => {
    const h = Array.isArray(list) ? [...list] : []
    if (!h.length) return { streak: 0, todayCount: 0 }

    // sort oldest->newest by timestamp
    h.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0))

    // unique day buckets
    const days = h.map(x => dayjs(x.ts).startOf('day').valueOf())
    const uniq = Array.from(new Set(days)).map(d => dayjs(d))

    // rolling streak ending today
    let s = 0
    let cursor = dayjs().startOf('day')
    for (let i = uniq.length - 1; i >= 0; i--) {
      if (uniq[i].isSame(cursor, 'day')) { s++; cursor = cursor.subtract(1, 'day') }
      else if (uniq[i].isBefore(cursor, 'day')) break
    }

    const today = uniq.some(d => d.isSame(dayjs(), 'day')) ? 1 : 0
    return { streak: s, todayCount: today }
  }, [list])

  return (
    <div className="card flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-brand-200/50 flex items-center justify-center">
        <Flame className="text-brand-800" size={20}/>
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">Daily streak</div>
        <div className="text-xs text-gray-500">
          {todayCount ? 'You’re on track today' : 'Log a mood to keep it going'}
        </div>
      </div>
      <div className="text-lg font-semibold">{streak}🔥</div>
    </div>
  )
}
