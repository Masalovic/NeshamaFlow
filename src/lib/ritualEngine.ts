// 1) Single source of truth for moods + guard
export const MOOD_KEYS = ['😊','🙂','😌','😔','😐','🤔','😫','😠'] as const;
export type MoodKey = typeof MOOD_KEYS[number];
export function isMoodKey(x: unknown): x is MoodKey {
  return typeof x === 'string' && (MOOD_KEYS as readonly string[]).includes(x as MoodKey);
}

// 2) Ritual shape (keeps your fields, adds whyBullets for UI)
export interface Ritual {
  id: string;
  title: string;
  durationSec: number;
  why: string;            // long summary paragraph
  whyBullets: string[];   // short bullets for “Why it works”
  steps?: string[];
}

// 3) Ritual catalog (type-safe, ids stay literal)
const RITUALS = {
  'box-breath-2m': {
    id: 'box-breath-2m',
    title: 'Box Breathing (2 min)',
    durationSec: 120,
    why:
      'Slow, equal-length inhales/holds/exhales target ~6 breaths/min, increasing vagal tone and shifting the autonomic balance toward parasympathetic “rest-and-digest”. Clinicians use it for acute stress to reduce amygdala reactivity and stabilize HRV.',
    whyBullets: [
      'Activates parasympathetic (“rest & digest”)',
      'Stabilizes HRV under stress',
      'Simple 4-4-4-4 cadence',
    ],
    steps: ['Inhale 4s', 'Hold 4s', 'Exhale 4s', 'Hold 4s – repeat'],
  },
  '478-pace-2m': {
    id: '478-pace-2m',
    title: '4-7-8 Breathing',
    durationSec: 120,
    why:
      'Lengthened exhale activates the vagus nerve and dampens sympathetic arousal. The 4-7-8 pattern increases CO₂ tolerance briefly and can reduce perceived anxiety and time-to-sleep in small trials.',
    whyBullets: [
      'Long exhale → vagal activation',
      'Builds CO₂ tolerance',
      'Helpful for anxiety & sleep',
    ],
    steps: ['Inhale 4', 'Hold 7', 'Exhale 8 – repeat'],
  },
  'body-scan-1m': {
    id: 'body-scan-1m',
    title: '1-min Body Scan',
    durationSec: 60,
    why:
      'Rapid interoceptive check-in recruits somatosensory networks and shifts attention from ruminative loops. Brief body scans are associated with reduced perceived stress and improved emotion regulation.',
    whyBullets: [
      'Interrupts rumination quickly',
      'Improves interoceptive awareness',
      'Works anywhere, no tools',
    ],
  },
  'ground-54321': {
    id: 'ground-54321',
    title: '5-4-3-2-1 Grounding',
    durationSec: 90,
    why:
      'Orienting to five senses engages prefrontal attention networks and down-regulates limbic threat appraisal. Widely used in CBT for panic and anger surges to interrupt catastrophizing.',
    whyBullets: [
      'Sensory focus lowers threat response',
      'CBT-friendly, fast to learn',
      'Great for panic/anger spikes',
    ],
  },
  'compassion-break': {
    id: 'compassion-break',
    title: 'Self-Compassion Break',
    durationSec: 90,
    why:
      'Brief self-kindness statements lower cortisol and reduce self-criticism. Reframing difficulty as “common humanity” supports cognitive reappraisal and resilience.',
    whyBullets: [
      'Reduces self-criticism',
      'Promotes cognitive reappraisal',
      'Short script you can memorize',
    ],
  },
  'gratitude-3': {
    id: 'gratitude-3',
    title: 'Gratitude ×3',
    durationSec: 120,
    why:
      'Micro-gratitude exercises increase positive affect and broaden attentional scope. Repeated practice correlates with improved mood and sleep quality in multiple RCTs.',
    whyBullets: [
      'Boosts positive affect',
      'Widens attentional scope',
      'Easy daily micro-practice',
    ],
  },
} as const satisfies Record<string, Ritual>;

// 4) Strong ID type derived from the catalog
export type RitualId = keyof typeof RITUALS;
export const RITUAL_IDS = Object.keys(RITUALS) as RitualId[];
export function isRitualId(x: unknown): x is RitualId {
  return typeof x === 'string' && x in RITUALS;
}
export const DEFAULT_RITUAL_ID: RitualId = 'body-scan-1m';

// 5) Mood → ritual mapping (typed)
const MOOD_MAP: Record<MoodKey, RitualId> = {
  '😫': 'box-breath-2m',     // stressed
  '😠': 'ground-54321',      // angry
  '😔': 'compassion-break',  // sad
  '🤔': 'gratitude-3',       // reflective
  '😐': '478-pace-2m',       // neutral
  '😌': 'body-scan-1m',      // calm
  '🙂': 'body-scan-1m',      // content
  '😊': 'gratitude-3',       // happy
};

// 6) Public API
export const ALL_RITUALS: Ritual[] = Object.values(RITUALS);

export function getRitualForMood(mood: MoodKey): Ritual {
  const id = MOOD_MAP[mood] ?? DEFAULT_RITUAL_ID;
  return RITUALS[id];
}

export function getRitualById(id: string): Ritual | null {
  return (RITUALS as Record<string, Ritual>)[id] ?? null;
}
