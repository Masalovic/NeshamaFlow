// src/pages/Home.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import EmojiGrid from "../components/EmojiGrid";
import TodayPanel from "../components/TodayPanel";
import Header from "../components/ui/Header";
import InsightChips from "../components/InsightChips";
import StreakCard from "../components/StreakCard";
import SmartReminderBanner from "../components/SmartReminderBanner";
import { loadHistory, logLocal, type LogItem } from "../lib/history";
import { track } from "../lib/metrics";
import { setItem as sSet } from "../lib/secureStorage";
import { parseSlashCommand } from "../lib/commands";
import { isMoodKey, type MoodKey } from "../lib/ritualEngine";
import { syncHistoryUp } from "../lib/sync";
import { SlidersHorizontal, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function MoodLog() {
  const { t } = useTranslation(["common", "home"]);
  // MULTI-SELECT: store an array of emoji
  const [moods, setMoods] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [last, setLast] = useState<{ emoji: string; date: string } | null>(null);
  const navigate = useNavigate();

  // Last logged item (from encrypted local history)
  useEffect(() => {
    let alive = true;
    (async () => {
      const items: LogItem[] = await loadHistory();
      if (!alive || !items.length) return;
      const it = items[0];
      setLast({
        emoji: String(it.mood),
        date: dayjs(it.ts).format("DD MMM, HH:mm"),
      });
    })();
    return () => { alive = false; };
  }, []);

  // primary mood = first selection (back-compat with engine + history)
  const primaryMood = moods[0];
  const hasMood = isMoodKey(primaryMood);
  const slash = parseSlashCommand(note);
  const isSlashQuick = slash?.name === "quick";

  async function startRitual() {
    if (!hasMood) return;
    // Persist primary (legacy) + full selection (new)
    await sSet("mood", primaryMood);
    await sSet("moods", JSON.stringify(moods));
    await sSet("note", note.trim());

    track("mood_selected", { mood: primaryMood, selected: moods });

    try {
      const items = await loadHistory();
      if (!items.length) track("first_mood", { mood: primaryMood });
    } catch {}

    navigate("/ritual");
  }

  async function quickSave() {
    if (!hasMood) return;
    const cleanedNote = isSlashQuick ? (slash?.rest ?? "").trim() : note.trim();

    await logLocal({
      mood: primaryMood as MoodKey,             // use primary for history schema
      ritualId: "quick",
      durationSec: 0,
      note: cleanedNote || null,
      // if your LogItem supports metadata, you could also attach the array:
      // meta: { moods }
    });

    track("slash_quick_used", { mood: primaryMood, selected: moods });
    void syncHistoryUp().catch(() => {});

    setNote("");
    setMoods([]);
    navigate("/history", { replace: true });
  }

  // Keyboard: Ctrl/⌘ + Enter = Quick Save
  function onNoteKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void quickSave();
    }
  }

  const noteId = "home-note";

  return (
    <div className="flex h-full flex-col">
      <Header title={t("home:title")} />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[420px] space-y-4 p-4">
          <TodayPanel />
          <SmartReminderBanner />
          <StreakCard />
          <InsightChips />

          {/* Mood picker */}
          <section className="card space-y-3">
            <div className="mb-1 flex items-center justify-between">
              <div className="font-medium text-main">{t("home:selectMood")}</div>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-main"
                onClick={() => navigate("/settings")}
                aria-label={t("common:a11y.openSettings")}
                title={t("common:a11y.openSettings")}
              >
                <SlidersHorizontal size={14} />
                {t("common:nav.settings")}
              </button>
            </div>

            {/* Multi-select grid (max 3) */}
            <EmojiGrid selected={moods} onChange={setMoods} maxSelections={3} />

            {/* Optional tiny helper text (keeps tokens) */}
            <div className="text-[11px] text-muted px-1">
              {moods.length}/3
            </div>
          </section>

          {/* Note + explanation */}
          <section className="card">
            <label className="mb-2 block text-sm text-dim" htmlFor={noteId}>
              {t("home:noteLabelOptional")}
            </label>
            <textarea
              id={noteId}
              className="input w-full min-h-[92px] text-sm"
              placeholder={t("home:notePlaceholder")}
              aria-label={t("home:noteLabelOptional")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={onNoteKeyDown}
            />

            <div className="mt-2 text-xs text-muted">
              <span className="inline-flex items-center gap-2">
                <Zap size={14} className="opacity-70" />
                <span className="text-brand-400">
                  <strong>{t("home:quickSave")}</strong>{" "}
                  {t("home:quickSaveHelpPrefix")} <em>{t("common:nav.history")}</em>.
                </span>
              </span>
            </div>

            {last && (
              <p className="mt-3 px-1 text-xs text-muted">
                {t("home:lastLogged", { emoji: last.emoji, date: last.date })}
              </p>
            )}
          </section>

          {/* Primary actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={startRitual}
              disabled={!hasMood}
              className="btn btn-primary w-full disabled:opacity-40"
            >
              {t("home:startRitual")}
            </button>

            <button
              type="button"
              onClick={quickSave}
              disabled={!hasMood}
              className="btn btn-secondary w-full disabled:opacity-40"
            >
              {t("home:quickSave")}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
