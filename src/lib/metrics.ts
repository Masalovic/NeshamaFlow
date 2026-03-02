// src/lib/metrics.ts
import { getItem as sGet, setItem as sSet, ready as storageReady } from "./secureStorage";
import { supabase } from "./supabase";

// Expanded event set (adds ritual_started, ritual_paused, ritual_rest, library_*, suggestion_*).
export type EventName =
  | "app_open"
  | "upgrade_click"
  | "pro_enabled"
  | "mood_selected"
  | "first_mood"
  | "ritual_started"
  | "ritual_paused"
  | "ritual_rest"
  | "ritual_completed"
  | "first_ritual"
  | "library_opened"
  | "library_detail_viewed"
  | "library_start_clicked"
  | "suggestion_steps_opened"
  | "suggestion_why_opened"
  | "slash_quick_used"
  | "streak_repair_used"
  | "streak_repair_ineligible"
  | "streak_repair_failed"
  | "nudge_shown"
  | "nudge_tapped"
  | "export_json"
  | "export_csv"
  | "app_error";

type Event = {
  id: string;
  ts: string; // ISO
  name: EventName;
  props?: Record<string, unknown> | null;
};

const KEY = "events.queue";
const MAX_QUEUE = 300;

let memQueue: Event[] = [];
let flushing = false;

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeProps(
  props?: Record<string, unknown> | null
): Record<string, unknown> {
  // ✅ never return null
  if (!props) return {};
  if (typeof props === "object" && !Array.isArray(props)) return props;
  return { value: props as unknown };
}

async function loadQueue(): Promise<Event[]> {
  if (!storageReady()) return memQueue;
  return (await sGet<Event[]>(KEY)) ?? [];
}

async function saveQueue(list: Event[]): Promise<void> {
  const capped = list.slice(-MAX_QUEUE);
  if (!storageReady()) {
    memQueue = capped;
    return;
  }
  await sSet(KEY, capped);
}

/**
 * Queue an analytics event; attempts flush if storage is ready.
 * Props are stored as JSONB via Supabase (see `flush()`).
 */
export async function track(
  name: EventName,
  props?: Record<string, unknown>
): Promise<void> {
  const e: Event = {
    id: makeId(),
    ts: new Date().toISOString(),
    name,
    props: normalizeProps(props),
  };

  const q = await loadQueue();
  q.push(e);
  await saveQueue(q);

  // best-effort flush
  if (storageReady()) void flush().catch(() => {});
}

/**
 * Flush queued events to Supabase (requires authenticated user).
 * Upserts on `id` to avoid duplicates.
 *
 * Important:
 * - Never sends props=null (avoids NOT NULL violations)
 * - Prevents concurrent flush calls
 * - Keeps queue intact if request fails
 */
export async function flush(): Promise<void> {
  if (!storageReady()) return;
  if (flushing) return;

  flushing = true;
  try {
    const q = await loadQueue();
    if (!q.length) return;

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) return;

    const rows = q.map((e) => ({
      id: e.id,
      created_at: e.ts,
      user_id: user.id,
      name: e.name,
      props: normalizeProps(e.props ?? undefined), // ✅ never null
    }));

    const { error } = await supabase
      .from("events")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.warn("metrics flush failed", error);
      return;
    }

    await saveQueue([]); // clear on success
  } finally {
    flushing = false;
  }
}