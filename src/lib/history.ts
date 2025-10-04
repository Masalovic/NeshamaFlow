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

/** Clamp any ISO to exact second precision to create a stable natural key. */
function toSecondISO(iso: string): string {
  const ms = Math.floor(new Date(iso).getTime() / 1000) * 1000
  return new Date(ms).toISOString()
}

/** Natural key to dedupe across sources: ritual + second. */
function secondKey(x: { ts: string; ritualId: string }): string {
  return `${x.ritualId}|${toSecondISO(x.ts)}`
}

/** Always returns newest-first (desc by ts). */
export async function loadHistory(): Promise<LogItem[]> {
  if (!sReady()) return []
  try {
    const data = await sGet<LogItem[]>(KEY)
    const list = Array.isArray(data) ? data.slice(0, MAX_ITEMS) : []
    // Normalize + sort newest-first
    list.forEach(it => { it.ts = toSecondISO(it.ts) })
    list.sort((a, b) => (a.ts < b.ts ? 1 : -1))
    return list
  } catch {
    return []
  }
}

/** Save, keeping only newest-first and capping size. */
export async function saveHistory(items: LogItem[]): Promise<void> {
  if (!sReady()) throw new Error('secureStorage not ready (locked)')
  try {
    const copy = (items ?? []).map(it => ({ ...it, ts: toSecondISO(it.ts) }))
    copy.sort((a, b) => (a.ts < b.ts ? 1 : -1))
    await sSet(KEY, copy.slice(0, MAX_ITEMS))
  } catch {
    // ignore write errors (quota, etc.)
  }
}

/** Log a new local entry and persist with dedupe. Returns the created row. */
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

  // Merge with dedupe by id AND by natural second key
  const seenIds = new Set<string>()
  const seenKeys = new Set<string>()
  const merged = [row, ...items].filter(it => {
    const k = secondKey(it)
    if (seenIds.has(it.id) || seenKeys.has(k)) return false
    seenIds.add(it.id)
    seenKeys.add(k)
    return true
  })

  await saveHistory(merged)
  return row
}

/**
 * Merge remote rows (e.g., from Supabase) into local history with proper dedupe.
 * Returns the number of new rows accepted.
 */
export async function mergeRemote(incoming: LogItem[]): Promise<number> {
  if (!incoming?.length) return 0
  const current = await loadHistory()

  // Pre-normalize incoming
  const sanitized = incoming.map(r => ({
    ...r,
    ts: toSecondISO(r.ts),
    source: 'remote' as const,
  }))

  const byId = new Set(current.map(x => x.id))
  const byKey = new Set(current.map(x => secondKey(x)))

  const additions: LogItem[] = []
  for (const r of sanitized) {
    const k = secondKey(r)
    if (byId.has(r.id) || byKey.has(k)) continue
    additions.push(r)
    byId.add(r.id)
    byKey.add(k)
  }

  if (!additions.length) return 0
  await saveHistory([...additions, ...current])
  return additions.length
}

/** Optional helper if you ever need it elsewhere */
export async function clearHistory(): Promise<void> {
  if (!sReady()) return
  await sSet(KEY, [])
}
