import type { TFunction } from "i18next";

/** Emoji moods (shown in the EmojiGrid) — extended with 4 new ones */
export const MOOD_KEYS = [
  "😊","🙂","😌","😔","😐","🤔","😫","😠", // original 8
  "😟","😞","😴","😵"                  // new: anxious, depressed, tired, unfocused
] as const;
export type MoodKey = (typeof MOOD_KEYS)[number];
export function isMoodKey(x: unknown): x is MoodKey {
  return typeof x === "string" && (MOOD_KEYS as readonly string[]).includes(x);
}

/**
 * Optional textual “feelings” layer you mentioned (anxious, depressed, tired, unfocused).
 * You can drive suggestions from these without touching the emoji UI.
 */
export const FEELING_KEYS = ["anxious","depressed","tired","unfocused","anger","neutral","calm","happy"] as const;
export type FeelingKey = (typeof FEELING_KEYS)[number];

/** Minimal ritual shape — textual copy comes from i18n */
export interface Ritual {
  id: RitualId;
  title: string;          // English fallback
  durationSec: number;
  tags?: readonly string[]; // e.g., ["breath","calm","anxious"]
  // (Optional legacy fields; kept to avoid breakage if referenced)
  why?: string;
  whyBullets?: readonly string[];
  steps?: readonly string[];
}

/** Friendly titles for slugs (English fallback) */
export const RITUAL_TITLE_MAP: Record<string, string> = {
  // existing
  "box-breath-2m": "Box Breathing",
  "478-pace-2m": "4-7-8 Breathing",
  "body-scan-1m": "1-min Body Scan",
  "ground-54321": "5-4-3-2-1 Grounding",
  "compassion-break": "Self-Compassion Break",
  "gratitude-3": "Gratitude ×3",
  // new
  "release-tension-2m": "Release Tension",
  "coherent-5m": "Coherent Breathing (5:5)",
  "mindful-walk-2m": "Mindful Walk",
  "name-it-2m": "Name It to Tame It"
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
  // — existing —
  "box-breath-2m":  { id: "box-breath-2m",  title: "Box Breathing",        durationSec: 120, tags: ["breath","calm","anxious"] },
  "478-pace-2m":    { id: "478-pace-2m",    title: "4-7-8 Breathing",      durationSec: 120, tags: ["breath","sleep","anxious"] },
  "body-scan-1m":   { id: "body-scan-1m",   title: "1-min Body Scan",      durationSec: 60,  tags: ["awareness","calm"] },
  "ground-54321":   { id: "ground-54321",   title: "5-4-3-2-1 Grounding",  durationSec: 90,  tags: ["grounding","panic","anxious","anger"] },
  "compassion-break": { id: "compassion-break", title: "Self-Compassion Break", durationSec: 90, tags: ["kindness","depressed","self-critic"] },
  "gratitude-3":    { id: "gratitude-3",    title: "Gratitude ×3",         durationSec: 120, tags: ["gratitude","mood","happy","neutral"] },

  // — new additions aligned to your request —
  "release-tension-2m": { id: "release-tension-2m", title: "Release Tension", durationSec: 120, tags: ["tired","stiff","reset","movement"] },
  "coherent-5m":        { id: "coherent-5m",        title: "Coherent Breathing (5:5)", durationSec: 300, tags: ["breath","focus","neutral","anxious"] },
  "mindful-walk-2m":    { id: "mindful-walk-2m",    title: "Mindful Walk", durationSec: 120, tags: ["grounding","unfocused","tired","reset"] },
  "name-it-2m":         { id: "name-it-2m",         title: "Name It to Tame It", durationSec: 120, tags: ["labeling","unfocused","anxious","depressed"] },
} as const;

export type RitualId = keyof typeof META;
export const ALL_RITUALS: readonly Ritual[] = Object.values(META);
export const DEFAULT_RITUAL_ID: RitualId = "body-scan-1m";

export function isRitualId(x: unknown): x is RitualId {
  return typeof x === "string" && x in META;
}

/** Emoji → ritual mapping (now includes the 4 new emojis) */
const MOOD_MAP: Record<MoodKey, RitualId> = {
  // originals
  "😫": "release-tension-2m", // tired/overwhelmed → quick physical downshift
  "😠": "ground-54321",       // anger/agitation → sensory grounding
  "😔": "compassion-break",   // low/depressed → self-kindness script
  "🤔": "name-it-2m",         // unfocused/uncertain → affect labeling
  "😐": "coherent-5m",        // flat/neutral → gentle coherence to engage
  "😌": "body-scan-1m",       // calm → short interoceptive scan
  "🙂": "gratitude-3",        // mild positive → savor micro-gratitude
  "😊": "gratitude-3",        // positive → amplify with gratitude
  // new
  "😟": "box-breath-2m",      // anxious
  "😞": "compassion-break",   // depressed
  "😴": "release-tension-2m", // tired/sleepy
  "😵": "name-it-2m",       // unfocused/dizzy
};

export function getRitualForMood(mood: MoodKey): Ritual {
  const id = MOOD_MAP[mood] ?? DEFAULT_RITUAL_ID;
  return META[id];
}

/** New: feelings → ranked ritual suggestions (first item can be your default pick) */
const FEELING_TO_RITUALS: Record<FeelingKey, RitualId[]> = {
  anxious:   ["box-breath-2m","ground-54321","coherent-5m","name-it-2m"],
  depressed: ["compassion-break","gratitude-3","body-scan-1m","mindful-walk-2m"],
  tired:     ["release-tension-2m","coherent-5m","body-scan-1m","mindful-walk-2m"],
  unfocused: ["name-it-2m","coherent-5m","mindful-walk-2m","box-breath-2m"],
  anger:     ["ground-54321","release-tension-2m","box-breath-2m","coherent-5m"],
  neutral:   ["coherent-5m","gratitude-3","body-scan-1m","mindful-walk-2m"],
  calm:      ["body-scan-1m","gratitude-3","coherent-5m","mindful-walk-2m"],
  happy:     ["gratitude-3","body-scan-1m","coherent-5m","mindful-walk-2m"],
};

export function getRitualsForFeeling(feeling: FeelingKey): Ritual[] {
  const ids = FEELING_TO_RITUALS[feeling] ?? [DEFAULT_RITUAL_ID];
  return ids.map(id => META[id]);
}

/** Convenience getters you already use elsewhere */
export function getRitualById(id: string): Ritual | null {
  return isRitualId(id) ? META[id] : null;
}
