// src/lib/goal.ts
import { getItem as sGet, setItem as sSet, ready as storageReady } from "./secureStorage";

export type GoalId = "reduceStress" | "buildHabit" | "sleepBetter" | "feelSteadier";

export type GoalState = {
  goal: GoalId;
  setAt: string; // ISO
  /** Previous goals (most recent first) */
  history: Array<{ goal: GoalId; at: string }>;
};

export const DEFAULT_GOAL: GoalId = "reduceStress";

// ✅ user scope for storage key
let scope = "anon";
export function setGoalScope(next: string | null | undefined) {
  scope = next && next.trim() ? next : "anon";
}
function KEY() {
  return `goal:${scope}`;
}

function nowISO() {
  return new Date().toISOString();
}

function isGoalId(x: unknown): x is GoalId {
  return x === "reduceStress" || x === "buildHabit" || x === "sleepBetter" || x === "feelSteadier";
}

export async function getGoal(): Promise<GoalState> {
  const fallback: GoalState = { goal: DEFAULT_GOAL, setAt: nowISO(), history: [] };

  if (!storageReady()) return fallback;

  try {
    const v = (await sGet<GoalState>(KEY())) ?? null;
    if (!v || !isGoalId(v.goal)) return fallback;

    return {
      goal: v.goal,
      setAt: typeof v.setAt === "string" && v.setAt ? v.setAt : nowISO(),
      history: Array.isArray(v.history)
        ? v.history.filter((h) => h && isGoalId(h.goal) && typeof h.at === "string")
        : [],
    };
  } catch {
    return fallback;
  }
}

export async function setGoal(next: GoalId): Promise<void> {
  if (!storageReady()) throw new Error("secureStorage not ready");

  const prev = await getGoal();
  if (prev.goal === next) return;

  const now = nowISO();

  // ✅ history keeps previous goals (not the new one)
  const history = [{ goal: prev.goal, at: prev.setAt }, ...(prev.history ?? [])].slice(0, 30);

  await sSet(KEY(), { goal: next, setAt: now, history });
}

export async function resetGoalToDefault(): Promise<void> {
  await setGoal(DEFAULT_GOAL);
}

/** For debugging / clear-all flows */
export async function clearGoal(): Promise<void> {
  if (!storageReady()) return;
  await sSet(KEY(), { goal: DEFAULT_GOAL, setAt: nowISO(), history: [] });
}