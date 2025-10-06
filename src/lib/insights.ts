import dayjs from 'dayjs'
import type { LogItem } from './history'

export type InsightsSummary = {
  // totals (last N days, default 28)
  totalSec: number
  sessions: number
  avgSec: number

  // “favorite” ritual
  topRitualId: string | null
  topRitualCount: number

  // rhythm
  streak: number           // consecutive days ending today
  hasTodayLog: boolean

  // simple histograms
  byHour: number[]         // length 24
  byDow: number[]          // length 7; 0 = Sun
}

/** Summarize the last `windowDays` days (inclusive of today). */
export function summarize(list: LogItem[], windowDays = 28): InsightsSummary {
  const end = dayjs().endOf('day')
  const start = end.startOf('day').subtract(windowDays - 1, 'day')

  const inWindow = list.filter(x => dayjs(x.ts).isAfter(start) || dayjs(x.ts).isSame(start))

  // Totals
  const totalSec = inWindow.reduce((s, it) => s + Math.max(0, it.durationSec || 0), 0)
  const sessions  = inWindow.length
  const avgSec    = sessions ? Math.round(totalSec / sessions) : 0

  // Top ritual by count
  let topRitualId: string | null = null
  let topRitualCount = 0
  const counts = new Map<string, number>()
  inWindow.forEach(it => {
    const n = (counts.get(it.ritualId) || 0) + 1
    counts.set(it.ritualId, n)
    if (n > topRitualCount) { topRitualCount = n; topRitualId = it.ritualId }
  })

  // Has today?
  const hasTodayLog = inWindow.some(it => dayjs(it.ts).isSame(dayjs(), 'day'))

  // Streak (ending today)
  const uniqDays = Array.from(
    new Set(inWindow.map(it => dayjs(it.ts).startOf('day').valueOf()))
  ).sort((a, b) => a - b).map(ms => dayjs(ms))

  let streak = 0
  let cursor = dayjs().startOf('day')
  for (let i = uniqDays.length - 1; i >= 0; i--) {
    if (uniqDays[i].isSame(cursor, 'day')) { streak++; cursor = cursor.subtract(1, 'day') }
    else if (uniqDays[i].isBefore(cursor, 'day')) break
  }

  // Histograms
  const byHour = Array.from({ length: 24 }, () => 0)
  const byDow  = Array.from({ length: 7 }, () => 0)
  inWindow.forEach(it => {
    const d = dayjs(it.ts)
    byHour[d.hour()]++
    byDow[d.day()]++
  })

  return { totalSec, sessions, avgSec, topRitualId, topRitualCount, streak, hasTodayLog, byHour, byDow }
}
