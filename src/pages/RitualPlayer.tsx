// src/screens/RitualPlayer.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getRitualForMood,
  getRitualById,
  isMoodKey,
  type Ritual,
  type MoodKey,
  type RitualId,
} from "../lib/ritualEngine";
import { guideFor } from "../lib/ritualGuides";
import Header from "../components/ui/Header";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { getItem as sGet, setItem as sSet } from "../lib/secureStorage";
import { track } from "../lib/metrics";
import { logLocal, loadHistory } from "../lib/history";
import { syncHistoryUp } from "../lib/sync";
import { loadSettings } from "../lib/settings";
import { useTranslation } from "react-i18next";
import { tRitualTitle, tGuide } from "../lib/i18nRitual";

function vibrate(pattern: number[] | number, enabled: boolean) {
  if (!enabled) return;
  if ("vibrate" in navigator) {
    try {
      // @ts-ignore
      navigator.vibrate(pattern);
    } catch {}
  }
}

export default function RitualPlayer() {
  const navigate = useNavigate();
  const { t } = useTranslation(["ritual", "common"]);

  const [mood, setMood] = useState<MoodKey | null>(null);
  const [note, setNote] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [haptics, setHaptics] = useState(true);
  const [draftRitualId, setDraftRitualId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await loadSettings();
      if (alive) setHaptics(s.haptics);

      const rawMood = await sGet<unknown>("mood");
      const n = (await sGet<string>("note")) || "";
      const draft = await sGet<string>("draft.ritual");

      if (!isMoodKey(rawMood)) {
        navigate("/log", { replace: true });
        return;
      }
      if (!alive) return;
      setMood(rawMood);
      setNote(n);
      setDraftRitualId(draft || null);
      if (draft) {
        sSet("draft.ritual", "").catch(() => {});
      }
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [navigate]);

  const ritual: Ritual | null = useMemo(() => {
    return draftRitualId
      ? getRitualById(draftRitualId)
      : mood
      ? getRitualForMood(mood)
      : null;
  }, [draftRitualId, mood]);

  const total = ritual?.durationSec ?? 120;
  const [remaining, setRemaining] = useState<number>(total);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  const REST_LEN = 20;
  const [resting, setResting] = useState(false);
  const [restRemaining, setRestRemaining] = useState(REST_LEN);

  useEffect(() => {
    setRemaining(total);
  }, [total]);

  const doneRef = useRef(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (loaded && !ritual) navigate("/log", { replace: true });
  }, [loaded, ritual, navigate]);

  // main timer
  useEffect(() => {
    if (!running || resting) return;
    vibrate(24, haptics);
    timerRef.current = window.setInterval(() => {
      setRemaining((r) => {
        const next = Math.max(0, r - 1);
        if (next > 0 && next % 60 === 0) vibrate(10, haptics);
        if (next === 0 && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return next;
      });
    }, 1000) as unknown as number;
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [running, resting, haptics]);

  // rest timer
  useEffect(() => {
    if (!resting) return;
    const id = window.setInterval(() => {
      setRestRemaining((r) => {
        const next = Math.max(0, r - 1);
        if (next === 0) {
          window.clearInterval(id);
          setResting(false);
          setRestRemaining(REST_LEN);
          vibrate(16, haptics);
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [resting, haptics]);

  // pause on background
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && running) setRunning(false);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [running]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (remaining <= 0 && !completing) {
      setRunning(false);
      void onComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  async function onComplete() {
    if (doneRef.current) return;
    doneRef.current = true;
    setCompleting(true);
    vibrate([60, 40, 60], haptics);
    try {
      if (mood && ritual) {
        const durationSec = Math.max(0, Math.min(total, total - remaining));
        await logLocal({ mood, ritualId: ritual.id, durationSec, note });
        track("ritual_completed", {
          ritualId: ritual.id,
          durationSec,
          source: draftRitualId ? "library" : "suggestion",
        });
        try {
          const list = await loadHistory();
          if (list.length === 1) track("first_ritual", { ritualId: ritual.id });
        } catch {}
        await syncHistoryUp().catch(() => {});
      }
    } finally {
      navigate("/ritual/done", { replace: true });
    }
  }

  function onStartPause() {
    setRunning((v) => {
      const next = !v;
      if (next) {
        vibrate(18, haptics);
        if (ritual)
          track("ritual_started", {
            ritualId: ritual.id,
            source: draftRitualId ? "library" : "suggestion",
          });
      }
      return next;
    });
  }
  function onPause() {
    setRunning(false);
    vibrate([20, 30, 20], haptics);
    if (ritual) track("ritual_paused", { ritualId: ritual.id });
  }
  function onRest() {
    if (!running || resting) return;
    vibrate(14, haptics);
    setResting(true);
    if (ritual) track("ritual_rest", { ritualId: ritual.id, len: REST_LEN });
  }

  if (!loaded || !ritual) return null;

  const rid = ritual.id as RitualId;
  const headerTitle = tRitualTitle(t, rid, ritual.title);
  const g = tGuide(t, rid, guideFor(ritual));

  // pct for the svg
  const pct =
    total > 0 ? Math.min(100, ((total - remaining) / total) * 100) : 0;

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex h-full flex-col">
      <Header title={headerTitle} back />

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[540px] mx-auto space-y-4">
          {/* UPLIFTED CARD (copied style from meditation) */}
          <Card className="p-6 bg-[rgba(255,255,255,0.35)] backdrop-blur rounded-3xl space-y-5">
            {/* circle */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-40 h-40">
                <svg
                    viewBox="0 0 120 120"
                    className="w-full h-full"
                    style={{ transform: "rotate(-90deg)" }} // rotate ONLY path
                  >
                    {/* base ring */}
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    {/* progress ring */}
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      stroke="rgba(253,84,142,1)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 52}
                      strokeDashoffset={
                        (1 - pct / 100) * (2 * Math.PI * 52)
                      }
                    />
                  </svg>

                {/* text stays normal */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-dim">
                    {t("meditation:remaining", "Remaining")}
                  </span>
                  <span className="text-lg font-semibold text-main tabular-nums">
                    {resting ? formatTime(restRemaining) : formatTime(remaining)}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <h1 className="text-base font-semibold text-main">
                  {headerTitle}
                </h1>
                {resting ? (
                  <p className="text-sm text-muted mt-1 max-w-[360px]">
                    {t(
                      "ritual:player.restMsg",
                      "Rest — close your eyes and breathe."
                    )}
                  </p>
                ) : g.title ? (
                  <p className="text-sm text-muted mt-1 max-w-[360px]">
                    {g.title}
                  </p>
                ) : null}
              </div>
            </div>

            {/* controls (ritual-specific) */}
            <div className="flex gap-3 justify-center flex-wrap">
              {!running ? (
                <Button className="min-w-[120px]"
                  variant="outline"
                  onClick={onStartPause}>
                  {t("common:start", "Start")}
                </Button>
              ) : (
                <Button
                  className="min-w-[120px]"
                  variant="outline"
                  onClick={onPause}
                >
                  {t("common:pause", "Pause")}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={onRest}
                disabled={!running || resting}
              >
                {t("ritual:player.rest20", "Rest 20s")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (timerRef.current) {
                    clearInterval(timerRef.current);
                  }
                  setRunning(false);
                  void onComplete();
                }}
                disabled={completing}
              >
                {completing
                  ? t("common:saving", "Saving…")
                  : t("ritual:player.finishNow", "Finish Now")}
              </Button>
            </div>
          </Card>

          {/* guidance card under, like your original ritual */}
          <Card className="p-5 bg-[rgba(255,255,255,0.15)] backdrop-blur rounded-3xl space-y-3">
            <div className="text-xs uppercase tracking-wide text-dim">
              {t("ritual:player.whatToDo", "What to do")}
            </div>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-main">
              {(g.steps ?? []).map((s: string, i: number) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            {g.tip ? (
              <p className="text-xs text-muted mt-2 italic">{g.tip}</p>
            ) : null}
          </Card>
        </div>
      </main>
    </div>
  );
}
