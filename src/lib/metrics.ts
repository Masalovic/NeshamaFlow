// src/lib/metrics.ts
/* Minimal, privacy-friendly event tracker.
 * Stores a small queue (encrypted when storage is ready) and best-effort flushes to Supabase.
 */
import { getItem as sGet, setItem as sSet, ready as storageReady } from './secureStorage'
import { supabase } from './supabase'

export type EventName =
  | 'app_open'
  | 'mood_selected'
  | 'ritual_completed'
  | 'first_mood'
  | 'first_ritual'
  | 'upgrade_click'
  | 'pro_enabled'

type Event = {
  id: string
  ts: string // ISO
  name: EventName
  props?: Record<string, unknown> | null
}

const KEY = 'events.queue'

// Fallback queue used before secureStorage has a key (eg. before unlock)
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

export async function track(name: EventName, props?: Record<string, unknown>): Promise<void> {
  const e: Event = { id: crypto.randomUUID(), ts: new Date().toISOString(), name, props: props ?? null }
  const q = await loadQueue()
  q.push(e)
  await saveQueue(q)
  if (storageReady()) void flush().catch(() => {})
}

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
