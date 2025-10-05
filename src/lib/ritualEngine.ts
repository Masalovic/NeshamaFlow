// src/lib/ritualEngine.ts

export const MOOD_KEYS = ['😊','🙂','😌','😔','😐','🤔','😫','😠'] as const;
export type MoodKey = typeof MOOD_KEYS[number];
export function isMoodKey(x: unknown): x is MoodKey {
  return typeof x === 'string' && (MOOD_KEYS as readonly string[]).includes(x as MoodKey);
}

export interface Ritual {
  id: string;
  title: string;
  durationSec: number;
  why: string;
  whyBullets: readonly string[];
  steps?: readonly string[];
}

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
    steps: [
      'Sit tall; relax shoulders and jaw.',
      'Inhale through the nose for a count of 4.',
      'Hold the breath for a count of 4.',
      'Exhale gently for a count of 4.',
      'Hold empty for a count of 4. Repeat the 4-step cycle.',
    ],
  },
  '478-pace-2m': {
    id: '478-pace-2m',
    title: '4-7-8 Breathing',
    durationSec: 120,
    why:
      'Lengthened exhale activates the vagus nerve and dampens sympathetic arousal. The 4-7-8 pattern briefly increases CO₂ tolerance and can reduce perceived anxiety and time-to-sleep in small trials.',
    whyBullets: [
      'Long exhale → vagal activation',
      'Builds CO₂ tolerance',
      'Helpful for anxiety & sleep',
    ],
    steps: [
      'Sit comfortably; tip of tongue lightly behind upper teeth (optional).',
      'Inhale quietly through the nose for a count of 4.',
      'Hold the breath for a count of 7.',
      'Exhale audibly/softly through the mouth for a count of 8.',
      'Continue the 4-7-8 cycle at a smooth, unforced pace.',
    ],
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
    steps: [
      'Get comfortable (sit or lie); soften gaze or close eyes.',
      'Bring attention to the feet; notice contact, temperature, tingling.',
      'Move slowly upward—calves, knees, thighs, hips, belly, chest, shoulders, arms, hands, neck, face, scalp.',
      'Label sensations (pressure, warmth, tight/loose, neutral) without judging or changing them.',
      'When the mind wanders, gently return to the last body area.',
    ],
  },
  'ground-54321': {
    id: 'ground-54321',
    title: '5-4-3-2-1 Grounding',
    durationSec: 90,
    why:
      'Orienting to the five senses engages prefrontal attention networks and down-regulates limbic threat appraisal. Widely used in CBT for panic and anger surges to interrupt catastrophizing.',
    whyBullets: [
      'Sensory focus lowers threat response',
      'CBT-friendly, fast to learn',
      'Great for panic/anger spikes',
    ],
    steps: [
      'Look around: name 5 things you can see (silently or aloud).',
      'Notice 4 things you can feel (e.g., chair, clothing, air).',
      'Identify 3 things you can hear (near and far).',
      'Notice 2 things you can smell.',
      'Notice 1 thing you can taste (or take a sip of water).',
    ],
  },
  'compassion-break': {
    id: 'compassion-break',
    title: 'Self-Compassion Break',
    durationSec: 90,
    why:
      'Brief self-kindness statements lower cortisol and reduce self-criticism. Framing difficulty as “common humanity” supports cognitive reappraisal and resilience.',
    whyBullets: [
      'Reduces self-criticism',
      'Promotes cognitive reappraisal',
      'Short script you can memorize',
    ],
    steps: [
      'Acknowledge: “This is a moment of suffering / This is hard.”',
      'Common humanity: “I’m not alone; others feel this way too.”',
      'Kindness: place a hand on the heart (or other soothing touch).',
      'Offer phrases: “May I be kind to myself; may I accept myself as I am; may I be patient.”',
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
    steps: [
      'Bring to mind one specific thing you appreciate today.',
      'Note one sentence about why it matters to you.',
      'Visualize it briefly and feel the “thank-you” in your body.',
      'Repeat for two more specifics (total of three).',
    ],
  },
} as const;

export type RitualId = keyof typeof RITUALS;
export const DEFAULT_RITUAL_ID: RitualId = 'body-scan-1m';
export function isRitualId(x: unknown): x is RitualId {
  return typeof x === 'string' && x in RITUALS;
}

// Mood → suggested ritual
const MOOD_MAP: Record<MoodKey, RitualId> = {
  '😫': 'box-breath-2m',
  '😠': 'ground-54321',
  '😔': 'compassion-break',
  '🤔': 'gratitude-3',
  '😐': '478-pace-2m',
  '😌': 'body-scan-1m',
  '🙂': 'body-scan-1m',
  '😊': 'gratitude-3',
};

// Friendly titles for places where you currently show slugs
export const RITUAL_TITLE_MAP: Record<string, string> = {
  'box-breath-2m': 'Box Breathing',
  '478-pace-2m': '4-7-8 Breathing',
  'body-scan-1m': '1-min Body Scan',
  'ground-54321': '5-4-3-2-1 Grounding',
  'compassion-break': 'Self-Compassion Break',
  'gratitude-3': 'Gratitude ×3',
};

// Fallback prettifier (for any future IDs not in the map)
export function titleForRitualId(id: string): string {
  const known = RITUAL_TITLE_MAP[id];
  if (known) return known;
  let s = id.replace(/-/g, ' ');
  s = s.replace(/\bx(\d)\b/gi, '×$1');
  s = s.replace(/\b\w/g, (m) => m.toUpperCase());
  return s;
}

export const ALL_RITUALS: readonly Ritual[] = Object.values(RITUALS);

export function getRitualForMood(mood: MoodKey): Ritual {
  const id = MOOD_MAP[mood] ?? DEFAULT_RITUAL_ID;
  return RITUALS[id];
}

export function getRitualById(id: string) {
  return isRitualId(id) ? RITUALS[id] : null;
}
