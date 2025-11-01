// src/lib/ritualGuides.ts
import type { Ritual } from './ritualEngine'
import type { TFunction } from 'i18next'

export type RitualGuide = {
  title: string
  steps: string[]
  tip?: string
}

/** Normalize ids/titles so aliases map cleanly */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

/** Canonical guides (evidence-informed, unique per ritual) */
const CANON: Record<string, RitualGuide> = {
  // — Breathing —
  box_breathing: {
    title: 'What to do',
    steps: [
      'Sit upright; relax shoulders and jaw.',
      'Inhale through the nose for 4 seconds.',
      'Hold the breath for 4 seconds.',
      'Exhale through the nose (or pursed lips) for 4 seconds.',
      'Hold empty for 4 seconds. Repeat the 4-4-4-4 “box” 4–8 cycles.',
    ],
    tip: 'If 4 seconds feels long, try 3-3-3-3. Keep the breath smooth, never strained.',
  },
  four_7_8_breathing: {
    title: 'What to do',
    steps: [
      'Sit comfortably; tongue rests on the ridge behind upper teeth.',
      'Inhale quietly through the nose for 4 seconds.',
      'Hold the breath—gently—for 7 seconds.',
      'Exhale audibly through pursed lips for 8 seconds.',
      'Repeat for 4 cycles (beginners). Build up gradually if light-headed.',
    ],
    tip: 'Make the exhale soft and complete; stop if you feel dizzy.',
  },

  // — Interoception / body work —
  body_scan_1m: {
    title: 'What to do',
    steps: [
      'Sit or lie down; close eyes or soften gaze.',
      'Breathe naturally. Start at the feet and notice sensations (pressure, temperature, tingling, neutral).',
      'Move attention up: calves → knees → thighs → hips → belly → chest → shoulders → arms → hands → neck → face → scalp.',
      'If the mind wanders, gently return to the last body part.',
    ],
    tip: 'Observe sensations without trying to change them. “Noticing is enough.”',
  },
  release_tension: {
    title: 'What to do',
    steps: [
      'Roll shoulders; unclench jaw; soften forehead.',
      'Inhale, gently tense fists/forearms for ~3 seconds; exhale and fully release. Repeat 3–5 rounds.',
      'Add a slow neck turn left/right; pause anywhere tight and breathe there.',
    ],
    tip: 'Keep it gentle—no pain. The exhale is the “let go.”',
  },

  // — Cognitive/affect —
  gratitude_x3: {
    title: 'What to do',
    steps: [
      'Bring to mind one specific thing you appreciate (e.g., “sun on the kitchen table”).',
      'Name why it matters in one sentence.',
      'Repeat with two more specifics (total of three).',
    ],
    tip: 'Specific beats general. Picture it and notice how the body feels.',
  },
  name_it_to_tame_it: {
    title: 'What to do',
    steps: [
      'Ask: “What am I feeling right now?”',
      'Label it in 1–3 words (e.g., “tired,” “antsy,” “okay,” “hopeful”).',
      'Notice where it sits in the body; let the label be enough.',
    ],
    tip: 'Accurate labeling tends to reduce intensity.',
  },
  self_compassion_break: {
    title: 'What to do',
    steps: [
      'Mindfulness: “This is a moment of suffering.”',
      'Common humanity: “I’m not alone; others feel this way.”',
      'Self-kindness + soothing touch (e.g., hand on heart): “May I be kind to myself,” “May I be patient.”',
    ],
    tip: 'Use words that feel natural. Keep the tone warm and supportive.',
  },

  // — Grounding / movement —
  grounding_54321: {
    title: 'What to do',
    steps: [
      'Look around you and breathe normally.',
      'Notice 5 things you can see.',
      'Notice 4 things you can feel (contact, clothing, air).',
      'Notice 3 things you can hear.',
      'Notice 2 things you can smell.',
      'Notice 1 thing you can taste.',
    ],
    tip: 'If a sense is hard, skip or substitute another; go at your own pace.',
  },
  mindful_walk: {
    title: 'What to do',
    steps: [
      'Stand tall, start the timer, and begin walking slowly (or march in place).',
      'Match steps to the breath; notice feet, temperature, sounds.',
      'When the mind drifts, come back to the next step.',
    ],
    tip: 'No space? Walk a small loop or in place.',
  },

  // — Coherence —
  coherent_breathing: {
    title: 'What to do',
    steps: [
      'Sit upright; relax shoulders.',
      'Inhale for ~5–6 seconds.',
      'Exhale for ~5–6 seconds (no breath-holding).',
      'Continue at ~5–6 breaths per minute for the duration.',
    ],
    tip: 'Even, comfortable breaths help balance the autonomic nervous system.',
  },

  // — Generic fallback —
  generic_2m_checkin: {
    title: 'What to do',
    steps: [
      'While standing or sitting, draw your elbows back slightly to allow your chest to expand.',
      'Take a deep inhalation through your nose.',
      'Retain your breath for a count of 5.',
      'Slowly release your breath by exhaling through your nose.',
    ],
    tip: 'When the timer ends, ask: “What is it I need right now?”',
  },
}

/** Aliases so we hit exact ritual ids/titles from the engine */
const ALIAS: Record<string, string> = {
  // 4-7-8
  '4_7_8_breathing': 'four_7_8_breathing',
  '4-7-8_breathing': 'four_7_8_breathing',
  '478_breathing': 'four_7_8_breathing',
  // box
  'box_breathing_2_min': 'box_breathing',
  'box_breath': 'box_breathing',
  'square_breathing': 'box_breathing',
  // body scan
  '1_min_body_scan': 'body_scan_1m',
  'one_min_body_scan': 'body_scan_1m',
  // 5-4-3-2-1
  '5_4_3_2_1_grounding': 'grounding_54321',
  '54321_grounding': 'grounding_54321',
  // new ids mapping straight to CANON keys
  'release_tension_2m': 'release_tension',
  'coherent_5m': 'coherent_breathing',
  'mindful_walk_2m': 'mindful_walk',
  'name_it_2m': 'name_it_to_tame_it',
}

/** Pattern fallbacks when id/title is unknown but clearly indicates the ritual */
const PATTERNS: Array<{ re: RegExp; key: keyof typeof CANON }> = [
  { re: /\bbox|square\b/i,                 key: 'box_breathing' },
  { re: /4[^a-z0-9]*7[^a-z0-9]*8/i,        key: 'four_7_8_breathing' },
  { re: /\b(self|self-)\s*compassion/i,    key: 'self_compassion_break' },
  { re: /\bbody.*scan\b/i,                 key: 'body_scan_1m' },
  { re: /5.*4.*3.*2.*1|54321/i,            key: 'grounding_54321' },
  { re: /\bgratitude\b/i,                  key: 'gratitude_x3' },
  { re: /\brelease|tension|stretch/i,      key: 'release_tension' },
  { re: /\bwalk/i,                         key: 'mindful_walk' },
  { re: /\bcoherent|resonant/i,            key: 'coherent_breathing' },
  { re: /\bname|label\b/i,                 key: 'name_it_to_tame_it' },
]

/** Existing (language-agnostic) export – unchanged */
export function guideFor(ritual: Ritual | null | undefined): RitualGuide {
  if (!ritual) return CANON.generic_2m_checkin
  const byId = norm(ritual.id)
  if (CANON[byId]) return CANON[byId]
  const alias = ALIAS[byId]
  if (alias && CANON[alias]) return CANON[alias]

  const byTitle = norm(ritual.title)
  if (CANON[byTitle]) return CANON[byTitle]
  const alias2 = ALIAS[byTitle]
  if (alias2 && CANON[alias2]) return CANON[alias2]

  const titleRaw = ritual.title.toLowerCase()
  for (const p of PATTERNS) {
    if (p.re.test(titleRaw)) return CANON[p.key]
  }
  return CANON.generic_2m_checkin
}

/** NEW: localized guide using i18n keys with fallbacks to CANON */
export function guideForLocalized(t: TFunction, ritual: Ritual | null | undefined): RitualGuide {
  const base = guideFor(ritual) // pick which guide shape first
  const key = Object.entries(CANON).find(([, v]) => v === base)?.[0] ?? 'generic_2m_checkin'
  const title = t('ritual:player.whatToDo', base.title)

  // steps: ritual:guides.<key>.steps.0/1/2...
  const steps: string[] = base.steps.map((def, idx) =>
    t(`ritual:guides.${key}.steps.${idx}`, def)
  )

  const tip = base.tip ? t(`ritual:guides.${key}.tip`, base.tip) : undefined
  return { title, steps, tip }
}

export const DEFAULT_GUIDE: RitualGuide = CANON.generic_2m_checkin
