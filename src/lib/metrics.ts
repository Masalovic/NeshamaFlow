// src/lib/metrics.ts
import { getItem as sGet, setItem as sSet, ready as storageReady } from './secureStorage'
import { supabase } from './supabase'

// Expanded event set (adds ritual_started, ritual_paused, ritual_rest, library_*, suggestion_*).
export type EventName =
  | 'app_open'
  | 'upgrade_click'
  | 'pro_enabled'
  | 'mood_selected'
  | 'first_mood'
  | 'ritual_started'
  | 'ritual_paused'
  | 'ritual_rest'
  | 'ritual_completed'
  | 'first_ritual'
  | 'library_opened'
  | 'library_detail_viewed'
  | 'library_start_clicked'
  | 'suggestion_steps_opened'
  | 'suggestion_why_opened'
  | 'slash_quick_used'
  | 'streak_repair_used'
  | 'streak_repair_ineligible'
  | 'streak_repair_failed'
  | 'nudge_shown'
  | 'nudge_tapped'
  | 'export_json'
  | 'export_csv'
  | 'app_error';

type Event = {
  id: string
  ts: string // ISO
  name: EventName
  props?: Record<string, unknown> | null
}

const KEY = 'events.queue'
let memQueue: Event[] = []

async function loadQueue(): Promise<Event[]> {
  if (!storageReady()) return memQueue
  return (await sGet<Event[]>(KEY)) ?? []
}
async function saveQueue(list: Event[]): Promise<void> {
  const capped = list.slice(-300)
  if (!storageReady()) { memQueue = capped; return }
  await sSet(KEY, capped)
}

/**
 * Queue an analytics event; attempts flush if storage is ready.
 * Props are stored as JSONB via Supabase (see `flush()`).
 */
export async function track(name: EventName, props?: Record<string, unknown>): Promise<void> {
  const e: Event = {
    id: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`),
    ts: new Date().toISOString(),
    name,
    props: props ?? null,
  }
  const q = await loadQueue()
  q.push(e)
  await saveQueue(q)
  if (storageReady()) void flush().catch(() => {})
}

/**
 * Flush queued events to Supabase (requires authenticated user).
 * Upserts on `id` to avoid duplicates.
 */
export async function flush(): Promise<void> {
  if (!storageReady()) return
  const q = await loadQueue()
  if (!q.length) return

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const rows = q.map(e => ({
    id: e.id,
    created_at: e.ts,
    user_id: user.id,
    name: e.name,
    props: e.props ?? null,
  }))

  const { error } = await supabase.from('events').upsert(rows, { onConflict: 'id' })
  if (error) { console.warn('metrics flush failed', error); return }
  await saveQueue([]) // clear on success
}
