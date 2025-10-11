import type { TFunction } from "i18next";

/** Emoji moods (shown in the EmojiGrid) */
export const MOOD_KEYS = ["😊","🙂","😌","😔","😐","🤔","😫","😠"] as const;
export type MoodKey = (typeof MOOD_KEYS)[number];
export function isMoodKey(x: unknown): x is MoodKey {
  return typeof x === "string" && (MOOD_KEYS as readonly string[]).includes(x);
}

/** Minimal ritual shape — textual copy comes from i18n */
export interface Ritual {
  id: RitualId;
  title: string;          // English fallback
  durationSec: number;
  tags?: readonly string[];
  // (Optional legacy fields; kept to avoid breakage if referenced)
  why?: string;
  whyBullets?: readonly string[];
  steps?: readonly string[];
}

/** Friendly titles for slugs (English fallback) */
export const RITUAL_TITLE_MAP: Record<string, string> = {
  "box-breath-2m": "Box Breathing",
  "478-pace-2m": "4-7-8 Breathing",
  "body-scan-1m": "1-min Body Scan",
  "ground-54321": "5-4-3-2-1 Grounding",
  "compassion-break": "Self-Compassion Break",
  "gratitude-3": "Gratitude ×3",
};

export function titleForRitualId(id: string): string {
  const known = RITUAL_TITLE_MAP[id];
  if (known) return known;
  let s = id.replace(/-/g, " ");
  s = s.replace(/\bx(\d)\b/gi, "×$1");
  s = s.replace(/\b\w/g, (m) => m.toUpperCase());
  return s;
}

/** i18n title helper (falls back to English) */
export function localizedTitleForRitualId(t: TFunction, id: RitualId): string {
  const loc = t(`ritual:titles.${id}`, "");
  return typeof loc === "string" && loc ? loc : titleForRitualId(id);
}

/** Lightweight catalog; copy lives in i18n */
const META = {
  "box-breath-2m":  { id: "box-breath-2m",  title: "Box Breathing",        durationSec: 120, tags: ["breath","calm"] },
  "478-pace-2m":    { id: "478-pace-2m",    title: "4-7-8 Breathing",       durationSec: 120, tags: ["breath","sleep"] },
  "body-scan-1m":   { id: "body-scan-1m",   title: "1-min Body Scan",       durationSec: 60,  tags: ["awareness"] },
  "ground-54321":   { id: "ground-54321",   title: "5-4-3-2-1 Grounding",   durationSec: 90,  tags: ["grounding","panic"] },
  "compassion-break": { id: "compassion-break", title: "Self-Compassion Break", durationSec: 90, tags: ["kindness"] },
  "gratitude-3":    { id: "gratitude-3",    title: "Gratitude ×3",          durationSec: 120, tags: ["gratitude"] },
} as const;

export type RitualId = keyof typeof META;
export const ALL_RITUALS: readonly Ritual[] = Object.values(META);
export const DEFAULT_RITUAL_ID: RitualId = "body-scan-1m";

export function isRitualId(x: unknown): x is RitualId {
  return typeof x === "string" && x in META;
}

const MOOD_MAP: Record<MoodKey, RitualId> = {
  "😫": "box-breath-2m",
  "😠": "ground-54321",
  "😔": "compassion-break",
  "🤔": "gratitude-3",
  "😐": "478-pace-2m",
  "😌": "body-scan-1m",
  "🙂": "body-scan-1m",
  "😊": "gratitude-3",
};

export function getRitualForMood(mood: MoodKey): Ritual {
  const id = MOOD_MAP[mood] ?? DEFAULT_RITUAL_ID;
  return META[id];
}

export function getRitualById(id: string): Ritual | null {
  return isRitualId(id) ? META[id] : null;
}
