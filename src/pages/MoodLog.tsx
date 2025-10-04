import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import EmojiGrid from "../components/EmojiGrid";
import TodayPanel from '../components/TodayPanel';
import Header from "../components/ui/Header";
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
  const nav = useNavigate();

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
      if (!items.length) (track as any)("first_mood", { mood });
    } catch {}
    nav("/ritual");
  }

  async function quickSave() {
    if (!hasMood) return;
    // If user typed /quick message, strip the prefix for the saved note
    const cleanedNote = isSlashQuick ? (slash?.rest ?? "").trim() : note.trim();

    logLocal({
      mood: mood as MoodKey,
      ritualId: "quick",
      durationSec: 0,
      note: cleanedNote || null,
    });
    (track as any)("slash_quick_used", { mood });
    syncHistoryUp().catch(() => {});
    setNote("");
    setMood("");
    nav("/history", { replace: true });
  }

  // Keyboard: Ctrl/⌘ + Enter = Quick Save
  function onNoteKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void quickSave();
    }
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <Header title="How are you feeling?" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[420px] mx-auto p-4 space-y-4">
          <TodayPanel />
          <SmartReminderBanner />
          <StreakCard />

          {/* Mood picker */}
          <div className="rounded-2xl bg-white shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Select your mood</div>
              <button
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                onClick={() => nav("/settings")}
                aria-label="Settings"
                title="Settings"
              >
                <SlidersHorizontal size={14} />
                Settings
              </button>
            </div>
            <EmojiGrid selected={mood} onSelect={setMood} />
          </div>

          {/* Note + explanation */}
          <div className="rounded-2xl bg-white shadow p-4">
            <label className="block text-sm text-gray-600 mb-2">
              Add a note (optional)
            </label>
            <textarea
              className="w-full min-h-[92px] rounded-xl border px-3 py-2 text-sm"
              placeholder="What’s on your mind?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={onNoteKeyDown}
            />

            <div className="mt-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-2">
                <Zap size={14} className="opacity-70" />
                <span>
                  <strong>Quick Save</strong> logs your mood instantly and skips
                  the ritual. We’ll save your selected mood and optional note to{" "}
                  <em>History</em>.
                </span>
              </span>
            </div>

            {last && (
              <p className="text-xs text-gray-500 px-1 mt-3">
                Last Logged Mood: <span className="text-base">{last.emoji}</span>{" "}
                on {last.date}
              </p>
            )}
          </div>

          {/* Primary actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={startRitual}
              disabled={!hasMood}
              className="btn btn-primary w-full disabled:opacity-40"
            >
              Start Ritual
            </button>

            {/* Outline only on hover (not initially) */}
            <button
              onClick={quickSave}
              disabled={!hasMood}
              className="btn w-full bg-white text-gray-700 border border-transparent
                         hover:border-gray-300 hover:ring-1 hover:ring-gray-200
                         focus-visible:ring-2 focus-visible:ring-brand-300
                         disabled:opacity-40"
            >
              Quick Save
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
