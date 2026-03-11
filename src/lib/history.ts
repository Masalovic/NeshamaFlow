// src/lib/history.ts
import { getItem as sGet, setItem as sSet, ready as sReady } from "./secureStorage";
import type { MoodKey } from "./ritualEngine";

export type PracticeKind = "ritual" | "meditation" | "routine";

export type LogItem = {
  id: string;
  ts: string; // ISO (second precision)
  mood: MoodKey;
  ritualId: string;
  durationSec: number;
  note?: string | null;
  source?: "local" | "remote";
  kind?: PracticeKind; // optional for backward compatibility
};

const MAX_ITEMS = 500;

let scope: string = "anon";
export function setHistoryScope(next: string | null | undefined) {
  scope = next && next.trim() ? next : "anon";
}
function KEY(): string {
  return `history:${scope}`;
}

function toSecondISO(iso: string): string {
  const ms = Math.floor(new Date(iso).getTime() / 1000) * 1000;
  return new Date(ms).toISOString();
}

/** ✅ Normalize kind for backward compatibility + safety */
function normalizeKind(k: unknown): PracticeKind {
  return k === "meditation" || k === "routine" || k === "ritual" ? k : "ritual";
}

/** Natural key to dedupe across sources: kind + ritual + second. */
function secondKey(x: { ts: string; ritualId: string; kind?: PracticeKind }): string {
  const k = x.kind ?? "ritual";
  return `${k}|${x.ritualId}|${toSecondISO(x.ts)}`;
}

export async function loadHistory(): Promise<LogItem[]> {
  if (!sReady()) return [];
  try {
    const data = await sGet<LogItem[]>(KEY());
    const list = Array.isArray(data) ? data.slice(0, MAX_ITEMS) : [];

    list.forEach((it) => {
      it.ts = toSecondISO(it.ts);
      it.kind = normalizeKind(it.kind); // ✅ old logs become "ritual"
    });

    list.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    return list;
  } catch {
    return [];
  }
}

export async function saveHistory(items: LogItem[]): Promise<void> {
  if (!sReady()) throw new Error("secureStorage not ready (locked)");
  try {
    const copy = (items ?? []).map((it) => ({
      ...it,
      ts: toSecondISO(it.ts),
      kind: normalizeKind(it.kind), // ✅ keep consistent
    }));
    copy.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    await sSet(KEY(), copy.slice(0, MAX_ITEMS));
  } catch {
    // ignore write errors
  }
}

export async function logLocal(input: {
  mood: MoodKey;
  ritualId: string;
  durationSec: number;
  note?: string | null;
  kind?: PracticeKind;
}): Promise<LogItem> {
  const items = await loadHistory();

  const ts = toSecondISO(new Date().toISOString());
  const row: LogItem = {
    id: crypto.randomUUID(),
    ts,
    mood: input.mood,
    ritualId: input.ritualId,
    durationSec: input.durationSec,
    note: input.note ?? null,
    source: "local",
    kind: normalizeKind(input.kind), // ✅ default to ritual if undefined/invalid
  };

  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const merged = [row, ...items].filter((it) => {
    const k = secondKey(it);
    if (seenIds.has(it.id) || seenKeys.has(k)) return false;
    seenIds.add(it.id);
    seenKeys.add(k);
    return true;
  });

  await saveHistory(merged);
  return row;
}

export async function mergeRemote(incoming: LogItem[]): Promise<number> {
  if (!incoming?.length) return 0;
  const current = await loadHistory();

  const sanitized = incoming.map((r) => ({
    ...r,
    ts: toSecondISO(r.ts),
    source: "remote" as const,
    kind: normalizeKind(r.kind), // ✅ remote rows without kind become ritual
  }));

  const byId = new Set(current.map((x) => x.id));
  const byKey = new Set(current.map((x) => secondKey(x)));

  const additions: LogItem[] = [];
  for (const r of sanitized) {
    const k = secondKey(r);
    if (byId.has(r.id) || byKey.has(k)) continue;
    additions.push(r);
    byId.add(r.id);
    byKey.add(k);
  }

  if (!additions.length) return 0;
  await saveHistory([...additions, ...current]);
  return additions.length;
}

export async function clearHistory(): Promise<void> {
  if (!sReady()) return;
  await sSet(KEY(), []);
}