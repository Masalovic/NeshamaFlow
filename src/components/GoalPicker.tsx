// src/components/GoalPicker.tsx
import React from "react";
import type { GoalId } from "../lib/goal";
import { useTranslation } from "react-i18next";

const GOALS: Array<{ id: GoalId; icon: string }> = [
  { id: "reduceStress", icon: "🧘" },
  { id: "buildHabit", icon: "📈" },
  { id: "sleepBetter", icon: "🌙" },
  { id: "feelSteadier", icon: "🌿" },
];

export default function GoalPicker({
  value,
  onSelect,
  onClose,
}: {
  value: GoalId;
  onSelect: (g: GoalId) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation(["onboarding", "settings", "common"]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-[420px] rounded-2xl border border-token bg-surface-1 p-4 shadow-soft">
        <div className="mb-3 text-sm font-medium text-main">
          {t("settings:goal.title", "Primary goal")}
        </div>

        <div className="space-y-2">
          {GOALS.map((g) => {
            const active = value === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => onSelect(g.id)}
                className={
                  "w-full rounded-2xl border border-token p-3 text-left transition-colors " +
                  (active ? "bg-surface-2" : "bg-surface-1 hover:bg-[var(--hover)]")
                }
                aria-pressed={active}
              >
                <div className="flex items-center gap-2">
                  <div className="text-lg leading-none" aria-hidden>
                    {g.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-main">
                      {t(`welcome:goals.${g.id}`, g.id)}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {t(`settings:goal.desc.${g.id}`, "") || t(`welcome:goals.${g.id}`, g.id)}
                    </div>
                  </div>
                  {active && <span className="ml-auto text-xs text-accent">Selected</span>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-token bg-surface-2 px-3 py-2 text-sm text-main"
            onClick={onClose}
          >
            {t("common:buttons.close", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}