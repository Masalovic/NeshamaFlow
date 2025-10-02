// src/lib/sync.ts
import { supabase } from './supabase';
import { loadHistory, saveHistory, type LogItem } from './history';

// Build the same second-precision key both locally and for remote rows
const SECOND_KEY = (x: { ts: string; ritualId: string }) =>
  `${x.ritualId}|${new Date(Math.floor(new Date(x.ts).getTime() / 1000) * 1000).toISOString()}`;

const TABLE = 'mood_logs';

/**
 * Push local, unsynced rows to Supabase.
 * Marks rows as source='remote' after a successful upsert.
 * If auth is stale or RLS blocks, we keep local rows and retry later.
 */
export async function syncHistoryUp(): Promise<void> {
  const local = await loadHistory();
  const localUnsynced = local.filter((x) => x.source === 'local');
  if (!localUnsynced.length) return;

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return;

  const rows = localUnsynced.map((x) => ({
    id: x.id,
    created_at: new Date(
      Math.floor(new Date(x.ts).getTime() / 1000) * 1000
    ).toISOString(), // seconds precision
    mood: x.mood,
    ritual_id: x.ritualId,
    duration_sec: Number(x.durationSec) || 0,
    note: x.note ?? null,
    user_id: user.id,
  }));

  const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id' });
  if (error) {
    // Most common when refresh token is invalid / user signed out / RLS
    console.warn('syncHistoryUp upsert failed:', error);
    return;
  }

  // Refresh local and mark successfully upserted rows as remote
  const after = await loadHistory();
  const updated = after.map((x) =>
    rows.some((r) => r.id === x.id) ? ({ ...x, source: 'remote' as const }) : x
  );

  await saveHistory(updated);
}

/**
 * Pull recent rows from Supabase and merge with local (dedupe by id and second key).
 * Prefers remote rows on collision.
 */
export async function syncHistoryDown(limit = 200): Promise<void> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, created_at, mood, ritual_id, duration_sec, note')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('syncHistoryDown failed:', error);
    return;
  }

  const remote: LogItem[] = (data ?? []).map((r: any) => {
    // normalize remote created_at to second precision too
    const ts = new Date(
      Math.floor(new Date(String(r.created_at)).getTime() / 1000) * 1000
    ).toISOString();
    return {
      id: String(r.id),
      ts,
      mood: r.mood,
      ritualId: r.ritual_id,
      durationSec: Number(r.duration_sec) || 0,
      note: r.note ?? null,
      source: 'remote',
    };
  });

  const local = await loadHistory();

  // De-dupe by id **and** second-precision natural key; prefer remote on collision
  const seenIds = new Set<string>();
  const seenKey = new Set<string>();

  const merged = [...remote, ...local].filter((row) => {
    const idHit = seenIds.has(row.id);
    const k = SECOND_KEY(row);
    const keyHit = seenKey.has(k);
    if (idHit || keyHit) return false;
    seenIds.add(row.id);
    seenKey.add(k);
    return true;
  });

  // newest first
  merged.sort((a, b) => (a.ts < b.ts ? 1 : -1));
  await saveHistory(merged);
}
