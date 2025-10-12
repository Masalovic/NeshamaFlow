import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { loadHistory, type LogItem } from "../lib/history";
import { loadSettings } from "../lib/settings";
import { setItem as sSet } from "../lib/secureStorage";
import { Sparkles, Sun, Moon, Coffee } from "lucide-react";
import { useTranslation } from "react-i18next";
import { localizedTitleForRitualId } from "../lib/ritualEngine";
import type { RitualId } from "../lib/ritualEngine";

function greetingKey(): { key: string; Icon: React.ComponentType<any> } {
  const h = dayjs().hour();
  if (h < 5) return { key: "lateNight", Icon: Moon };
  if (h < 12) return { key: "goodMorning", Icon: Sun };
  if (h < 17) return { key: "goodAfternoon", Icon: Coffee };
  return { key: "goodEvening", Icon: Moon };
}

function suggestId(): RitualId {
  const h = dayjs().hour();
  if (h < 12) return "box-breath-2m";
  if (h < 18) return "body-scan-1m";
  return "gratitude-3";
}

export default function TodayPanel() {
  const { t } = useTranslation(["common"]);
  const nav = useNavigate();
  const [list, setList] = useState<LogItem[] | null>(null);
  const [goalMin, setGoalMin] = useState<number>(2);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [items, s] = await Promise.all([loadHistory(), loadSettings()]);
      if (!alive) return;
      setList(items);
      setGoalMin(s.goalMin ?? 2);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const { minutesToday, last } = useMemo(() => {
    const items = Array.isArray(list) ? list : [];
    const start = dayjs().startOf("day");
    const today = items.filter((i) => dayjs(i.ts).isAfter(start));
    const mins = today.reduce((m, i) => m + Math.max(0, i.durationSec) / 60, 0);
    const lastItem = items.length ? items[0] : null;
    return { minutesToday: Math.round(mins * 10) / 10, last: lastItem };
  }, [list]);

  const donePct = Math.min(
    100,
    Math.round((minutesToday / Math.max(1, goalMin)) * 100)
  );

  const { key: greetKey, Icon } = greetingKey();
  const suggestionId = suggestId();
  const suggestionTitle = localizedTitleForRitualId(t, suggestionId);

  async function quickStart() {
    if (last) {
      await sSet("mood", last.mood);
      await sSet("note", "");
      nav("/ritual");
    } else {
      nav("/log");
    }
  }

  return (
    <section className="card p-4">
      <div className="mb-1 flex items-center gap-2">
        <Icon size={16} style={{ color: "var(--accent-500)" }} />
        <div className="text-sm font-medium text-main">
          {t(`common:todayPanel.greetings.${greetKey}`, "Hello")}
        </div>
      </div>

      <div className="text-sm text-muted">
        {t("common:todayPanel.suggestedToday", "Suggested today: {{suggestion}}", {
          suggestion: suggestionTitle,
        })}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="text-xs text-muted">
          <span
            dangerouslySetInnerHTML={{
              __html: t(
                "common:todayPanel.goalDone",
                "Goal: {{goalMin}} min · <strong>{{minutesToday}} min</strong> done",
                { goalMin, minutesToday }
              ),
            }}
          />
          <div
            className="mt-1 h-2 w-40 overflow-hidden rounded-full"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <div
              className="h-full"
              style={{ width: `${donePct}%`, background: "var(--accent-300)" }}
              aria-label={`Progress ${donePct}%`}
            />
          </div>
        </div>

        <button
          className="btn btn-secondary flex-none items-center gap-1"
          onClick={quickStart}
        >
          <Sparkles size={16} />
          {t("common:buttons.startSuggestion", "Start suggestion")}
        </button>
      </div>
    </section>
  );
}
