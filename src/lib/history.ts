// src/lib/history.ts
import { getItem as sGet, setItem as sSet, ready as sReady } from './secureStorage'
import type { MoodKey } from './ritualEngine'

export type LogItem = {
  id: string
  ts: string               // ISO (second precision)
  mood: MoodKey
  ritualId: string
  durationSec: number
  note?: string | null
  source?: 'local' | 'remote'
}

const KEY = 'history'
const MAX_ITEMS = 500

// normalize any ISO to exact second precision
function toSecondISO(iso: string): string {
  const ms = Math.floor(new Date(iso).getTime() / 1000) * 1000
  return new Date(ms).toISOString()
}

// natural key for dedupe across sources
const SECOND_KEY = (x: { ts: string; ritualId: string }) =>
  `${x.ritualId}|${toSecondISO(x.ts)}`

export async function loadHistory(): Promise<LogItem[]> {
  if (!sReady()) return []
  try {
    const data = await sGet<LogItem[]>(KEY)
    return Array.isArray(data) ? data.slice(0, MAX_ITEMS) : []
  } catch {
    return []
  }
}

export async function saveHistory(items: LogItem[]): Promise<void> {
  if (!sReady()) throw new Error('secureStorage not ready (locked)')
  try {
    await sSet(KEY, (items ?? []).slice(0, MAX_ITEMS))
  } catch {
    // ignore write errors (quota, etc.)
  }
}

/**
 * Log a new local entry and persist with dedupe.
 * Returns the created row.
 */
export async function logLocal(input: {
  mood: MoodKey
  ritualId: string
  durationSec: number
  note?: string | null
}): Promise<LogItem> {
  const items = await loadHistory()

  const ts = toSecondISO(new Date().toISOString())
  const row: LogItem = {
    id: crypto.randomUUID(),
    ts,
    mood: input.mood,
    ritualId: input.ritualId,
    durationSec: input.durationSec,
    note: input.note ?? null,
    source: 'local',
  }

  // merge with dedupe by id and by natural second-precision key
  const seenIds = new Set<string>()
  const seenKeys = new Set<string>()
  const merged = [row, ...items].filter(it => {
    const k = SECOND_KEY(it)
    if (seenIds.has(it.id) || seenKeys.has(k)) return false
    seenIds.add(it.id)
    seenKeys.add(k)
    return true
  })

  // newest first
  merged.sort((a, b) => (a.ts < b.ts ? 1 : -1))

  await saveHistory(merged)
  return row
}
