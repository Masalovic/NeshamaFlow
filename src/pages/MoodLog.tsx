// src/pages/Home.tsx (a.k.a. MoodLog)
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

export default function MoodLog() {
  const [mood, setMood] = useState("");
  const [note, setNote] = useState("");
  const [last, setLast] = useState<{ emoji: string; date: string } | null>(
    null
  );
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
    return () => {
      alive = false;
    };
  }, []);

  const hasMood = isMoodKey(mood);
  const slash = parseSlashCommand(note);
  const isSlashQuick = slash?.name === "quick";

  async function startRitual() {
    if (!hasMood) return;
    await sSet("mood", mood);
    await sSet("note", note.trim());
    track("mood_selected", { mood });

    try {
      const items = await loadHistory();
      if (!items.length) track("first_mood", { mood });
    } catch {}

    navigate("/ritual");
  }

  async function quickSave() {
    if (!hasMood) return;
    const cleanedNote = isSlashQuick ? (slash?.rest ?? "").trim() : note.trim();

    await logLocal({
      mood: mood as MoodKey,
      ritualId: "quick",
      durationSec: 0,
      note: cleanedNote || null,
    });

    track("slash_quick_used", { mood });
    void syncHistoryUp().catch(() => {});

    setNote("");
    setMood("");
    navigate("/history", { replace: true });
  }

  // Keyboard: Ctrl/⌘ + Enter = Quick Save
  function onNoteKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void quickSave();
    }
  }

  return (
    <div className="flex h-full flex-col bg-app">
      <Header title="How are you feeling?" />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[420px] space-y-4 p-4">
          <TodayPanel />
          <SmartReminderBanner />
          <StreakCard />
          <InsightChips />

          {/* Mood picker */}
          <section className="card space-y-3">
            <div className="mb-1 flex items-center justify-between">
              <div className="font-medium text-main">Select your mood</div>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-main"
                onClick={() => navigate("/settings")}
                aria-label="Settings"
                title="Settings"
              >
                <SlidersHorizontal size={14} />
                Settings
              </button>
            </div>
            <EmojiGrid selected={mood} onSelect={setMood} />
          </section>

          {/* Note + explanation */}
          <section className="card">
            <label className="mb-2 block text-sm text-dim">
              Add a note (optional)
            </label>
            <textarea
              className="input w-full min-h-[92px] text-sm"
              placeholder="What’s on your mind?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={onNoteKeyDown}
            />

            <div className="mt-2 text-xs text-muted">
              <span className="inline-flex items-center gap-2">
                <Zap size={14} className="opacity-70" />
                <span className="text-brand-400">
                  <strong>Quick Save</strong> logs your mood instantly and skips
                  the ritual. We’ll save your selected mood and optional note to{" "}
                  <em>History</em>.
                </span>
              </span>
            </div>

            {last && (
              <p className="mt-3 px-1 text-xs text-muted">
                Last Logged Mood:{" "}
                <span className="text-base">{last.emoji}</span> on {last.date}
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
              Start Ritual
            </button>

            <button
              type="button"
              onClick={quickSave}
              disabled={!hasMood}
              className="btn btn-secondary w-full disabled:opacity-40"
            >
              Quick Save
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
