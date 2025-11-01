// src/lib/routines.ts

export type RoutineStepType =
  | "breath"
  | "movement"
  | "gratitude"
  | "plan"
  | "mindful"
  | "winddown"
  | "custom";

export type RoutineStep = {
  id: string;
  title: string;
  summary?: string;
  durationSec?: number; // 60 = 1 min, used for a tiny timer
  type: RoutineStepType;
  prompt?: string; // text user reads / does
  benefit?: string; // “why this matters”
  breath?: {
    inhaleSec: number;
    exhaleSec: number;
    holdSec: number;
    rounds: number; // number of breath cycles
  };
};

export type RoutineDef = {
  id: string;
  title: string;
  when: string; // “Morning”, “Day”, “Night”
  intent: string; // short hero copy
  steps: RoutineStep[]; 
  parts?: number; // number of steps
  tags: string[];
};

export const BUILT_IN_ROUTINES: RoutineDef[] = [
  {
    id: "morning-prime",
    title: "Morning Routine",
    when: "Morning",
    intent: "Wake up, prime your mood, set today's focus.",
    tags: ["morning", "routine"],
    steps: [
      {
        id: "breath-1m",
        title: "1-min Breath to Wake",
        summary: "Slow inhale 4s, exhale 6s.",
        durationSec: 60,
        type: "breath",
        prompt:
          "Inhale through nose for 4s → hold 1s → exhale through mouth for 6s. Repeat.",
        benefit:
          "Downshifts overnight stress and brings you online without jitter.",
      },
      {
        id: "gratitude-quick",
        title: "Gratitude check-in",
        summary: "Name 1–2 things you're glad for.",
        durationSec: 45,
        type: "gratitude",
        prompt:
          "Think of 1 person and 1 opportunity you have today. Say it out loud or type it.",
        benefit:
          "Positive affect first thing → better self-regulation through the day.",
      },
      {
        id: "plan-top1",
        title: "Set today's Top 1",
        summary: "What makes today a win?",
        durationSec: 45,
        type: "plan",
        prompt:
          "Complete the sentence: “If I only do this today, the day is a win: …”",
        benefit:
          "Reduces decision fatigue, locks attention on 1 meaningful outcome.",
      },
      {
        id: "extended-exhale",
        title: "Extended exhale",
        summary: "In 4s — out 8s.",
        durationSec: 40,
        type: "breath",
        breath: {
          inhaleSec: 4,
          exhaleSec: 8,
          holdSec: 0,
          rounds: 4, // 4 breath cycles = ~48s
        },
      },
    ],
  },
  {
    id: "daytime-reset",
    title: "Daytime Reset",
    when: "Day",
    intent: "Break the stress cycle in 3 mins.",
    tags: ["day", "routine"],
    steps: [
      {
        id: "phys-reset",
        title: "Box Breathing 4×4",
        summary: "4 in – 4 hold – 4 out – 4 hold.",
        durationSec: 60,
        type: "breath",
        prompt:
          "Sit tall. Inhale through nose 4s → hold 4s → exhale 4s → hold 4s. Repeat 4 rounds.",
        benefit: "Lowers sympathetic arousal; perfect between meetings.",
      },
      {
        id: "mind-reset",
        title: "Label the tension",
        summary: "Name what’s pulling you.",
        durationSec: 45,
        type: "mindful",
        prompt:
          "Silently label: “planning”, “worrying”, or “replaying”. Then say: “back to task”.",
        benefit:
          "Affect labeling reduces limbic load and makes refocusing easier.",
      },
      {
        id: "extended-exhale",
        title: "Extended exhale",
        summary: "In 4s — out 8s.",
        durationSec: 40,
        type: "breath",
        breath: {
          inhaleSec: 4,
          exhaleSec: 8,
          holdSec: 0,
          rounds: 4, // 4 breath cycles = ~48s
        },
      },
    ],
  },
  {
    id: "night-winddown",
    title: "Night Wind-down",
    when: "Night",
    intent: "Tell the body it’s safe to sleep.",
    tags: ["night", "routine"],
    steps: [
      {
        id: "breath-down",
        title: "Extended exhale",
        summary: "In 4s – out 8s.",
        durationSec: 90,
        type: "breath",
        prompt: "Lie or sit. Inhale 4s, exhale 8s. Relax jaw, shoulders.",
        benefit: "Longer exhale → vagal tone → sleepy.",
      },
      {
        id: "reflect-soft",
        title: "Done for today",
        summary: "Close the loops.",
        durationSec: 45,
        type: "mindful",
        prompt:
          "Mentally list what you DID do today. Say “this was enough for today.”",
        benefit: "Closes cognitive loops that keep the brain scanning.",
      },
      {
        id: "tomorrow-note",
        title: "Park tomorrow",
        summary: "Write 1–3 items for tomorrow.",
        durationSec: 45,
        type: "plan",
        prompt: "Write tomorrow’s 1–3 tasks. Put the note away.",
        benefit: "Tells your brain it doesn’t have to hold it overnight.",
      },
      {
        id: "extended-exhale",
        title: "Extended exhale",
        summary: "In 4s — out 8s.",
        durationSec: 40,
        type: "breath",
        breath: {
          inhaleSec: 4,
          exhaleSec: 8,
          holdSec: 0,
          rounds: 4, // 4 breath cycles = ~48s
        },
      },
    ],
  },
];
