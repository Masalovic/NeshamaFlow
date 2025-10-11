import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRitualForMood, getRitualById, isMoodKey, type Ritual, type MoodKey, type RitualId } from "../lib/ritualEngine";
import { guideFor } from "../lib/ritualGuides";
import Header from "../components/ui/Header";
import Button from "../components/ui/Button";
import ProgressRing from "../components/ProgressRing";
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
    try { navigator.vibrate(pattern); } catch {}
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
      if (draft) { sSet("draft.ritual", "").catch(() => {}); }
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, [navigate]);

  const ritual: Ritual | null = useMemo(() => {
    return draftRitualId ? getRitualById(draftRitualId) : (mood ? getRitualForMood(mood) : null);
  }, [draftRitualId, mood]);

  const total = ritual?.durationSec ?? 120;
  const [remaining, setRemaining] = useState<number>(total);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  const REST_LEN = 20;
  const [resting, setResting] = useState(false);
  const [restRemaining, setRestRemaining] = useState(REST_LEN);

  useEffect(() => { setRemaining(total); }, [total]);

  const doneRef = useRef(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => { if (loaded && !ritual) navigate("/log", { replace: true }); }, [loaded, ritual, navigate]);

  useEffect(() => {
    if (!running || resting) return;
    vibrate(24, haptics);
    timerRef.current = window.setInterval(() => {
      setRemaining((r) => {
        const next = Math.max(0, r - 1);
        if (next > 0 && next % 60 === 0) vibrate(10, haptics);
        if (next === 0 && timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        return next;
      });
    }, 1000) as unknown as number;
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [running, resting, haptics]);

  useEffect(() => {
    if (!resting) return;
    const id = window.setInterval(() => {
      setRestRemaining((r) => {
        const next = Math.max(0, r - 1);
        if (next === 0) { window.clearInterval(id); setResting(false); setRestRemaining(REST_LEN); vibrate(16, haptics); }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [resting, haptics]);

  useEffect(() => {
    const onVis = () => { if (document.hidden && running) setRunning(false); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [running]);

  useEffect(() => { return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }; }, []);

  useEffect(() => { if (remaining <= 0 && !completing) { setRunning(false); void onComplete(); } }, [remaining]); // eslint-disable-line

  async function onComplete() {
    if (doneRef.current) return;
    doneRef.current = true;
    setCompleting(true);
    vibrate([60, 40, 60], haptics);
    try {
      if (mood && ritual) {
        const durationSec = Math.max(0, Math.min(total, total - remaining));
        await logLocal({ mood, ritualId: ritual.id, durationSec, note });
        track("ritual_completed", { ritualId: ritual.id, durationSec, source: draftRitualId ? "library" : "suggestion" });
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
        if (ritual) track("ritual_started", { ritualId: ritual.id, source: draftRitualId ? "library" : "suggestion" });
      }
      return next;
    });
  }
  function onPause() { setRunning(false); vibrate([20, 30, 20], haptics); if (ritual) track("ritual_paused", { ritualId: ritual.id }); }
  function onRest() { if (!running || resting) return; vibrate(14, haptics); setResting(true); if (ritual) track("ritual_rest", { ritualId: ritual.id, len: REST_LEN }); }

  if (!loaded || !ritual) return null;

  const progress = total > 0 ? 1 - remaining / total : 0;
  const rid = ritual.id as RitualId;
  const headerTitle = tRitualTitle(t, rid, ritual.title);
  const g = tGuide(t, rid, guideFor(ritual));

  return (
    <div className="flex h-full flex-col">
      <Header title={headerTitle} back />
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[380px] mx-auto">
          <div className="rounded-2xl bg-white shadow p-6 flex flex-col items-center">
            {/* Timer */}
            <div role="timer" aria-live="polite" aria-atomic="true">
              <ProgressRing progress={progress}>{resting ? restRemaining : remaining}</ProgressRing>
            </div>

            {/* Guidance */}
            <div className="mt-4 w-full text-gray-700 text-sm text-center">
              {resting ? (
                <div>{t("ritual:player.restMsg", "Rest — close your eyes and breathe.")}</div>
              ) : (
                <div className="text-left">
                  <div className="font-medium mb-1">{g.title}</div>
                  <ol className="list-decimal pl-5 space-y-1">
                    {(g.steps ?? []).map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ol>
                  {g.tip && <p className="text-xs text-gray-500 mt-2">{g.tip}</p>}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="mt-8 w-full grid grid-cols-3 gap-3">
              {!running ? (
                <Button className="col-span-1" variant="primary" onClick={onStartPause}>
                  {t("common:start", "Start")}
                </Button>
              ) : (
                <Button className="col-span-1" variant="ghost" onClick={onPause}>
                  {t("common:pause", "Pause")}
                </Button>
              )}
              <Button className="col-span-1" variant="outline" onClick={onRest} disabled={!running || resting}
                title={t("ritual:player.restHint", "Take a 20s breathing break")}>
                {t("ritual:player.rest20", "Rest 20s")}
              </Button>
              <Button className="col-span-1" variant="outline" onClick={() => {
                if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
                setRunning(false);
                void onComplete();
              }} disabled={completing} aria-busy={completing}>
                {completing ? t("common:saving", "Saving…") : t("ritual:player.finishNow", "Finish Now")}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
