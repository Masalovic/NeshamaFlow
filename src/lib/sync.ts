import { supabase } from './supabase'
import { loadHistory } from './history'

export async function syncHistoryUp() {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return

  const local = loadHistory()
  if (!local.length) return

  // upsert by (user_id, ts)
  const rows = local.map(h => ({
    user_id: user.id,
    ts: new Date(h.ts).toISOString(),
    mood: h.mood,
    note: h.note,
    ritual_id: h.ritualId,
    duration_sec: h.durationSec
  }))

  const chunk = 100
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk)
    const { error } = await supabase.from('mood_logs').upsert(slice, { onConflict: 'user_id,ts' })
    if (error) console.error('sync error', error.message)
  }
}
