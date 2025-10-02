import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getRitualForMood,
  isMoodKey,
  type Ritual,
  type MoodKey,
} from '../lib/ritualEngine';
import Header from '../components/ui/Header';
import Button from '../components/ui/Button';
import ProgressRing from '../components/ProgressRing';
import { track } from '../lib/metrics';
import { logLocal } from '../lib/history';
import { loadHistory } from '../lib/history'
import { syncHistoryUp } from '../lib/sync';
import { getItem as sGet } from '../lib/secureStorage';
import { loadSettings } from '../lib/settings';

function vibrate(pattern: number[] | number, enabled: boolean) {
  if (!enabled) return;
  if ('vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
}

export default function RitualPlayer() {
  const navigate = useNavigate();

  const [mood, setMood] = useState<MoodKey | null>(null);
  const [note, setNote] = useState<string>('');
  const [loaded, setLoaded] = useState(false);
  const [haptics, setHaptics] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await loadSettings();
      if (alive) setHaptics(s.haptics);
      const rawMood = await sGet<unknown>('mood');
      if (!isMoodKey(rawMood)) {
        navigate('/log', { replace: true });
        return;
      }
      const n = (await sGet<string>('note')) || '';
      if (!alive) return;
      setMood(rawMood);
      setNote(n);
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, [navigate]);

  const ritual: Ritual | null = useMemo(
    () => (mood ? getRitualForMood(mood) : null),
    [mood]
  );

  // timer state
  const total = ritual?.durationSec ?? 120;
  const [remaining, setRemaining] = useState<number>(total);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setRemaining(total);
  }, [total]);

  const doneRef = useRef(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (loaded && !ritual) navigate('/log', { replace: true });
  }, [loaded, ritual, navigate]);

  // ticking
  useEffect(() => {
    if (!running) return;
    vibrate(30, haptics); // small cue on start
    timerRef.current = window.setInterval(() => {
      setRemaining((r) => {
        const next = Math.max(0, r - 1);
        if (next === 0 && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [running, haptics]);

  // auto-complete when timer hits zero
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
    vibrate([60, 40, 60], haptics); // completion cue
    try {
      if (mood && ritual) {
        const durationSec = Math.max(0, Math.min(total, total - remaining));
        await logLocal({ mood, ritualId: ritual.id, durationSec, note });
        await logLocal({ mood, ritualId: ritual.id, durationSec, note });
        track('ritual_completed', { ritualId: ritual.id, durationSec });
        try {
          const list = await loadHistory();
          if (list.length === 1) track('first_ritual', { ritualId: ritual.id });
        } catch {}
        await syncHistoryUp().catch(() => {});
      }
    } finally {
      navigate('/ritual/done', { replace: true });
    }
  }

  if (!loaded || !ritual) return null;

  const progress = total > 0 ? 1 - remaining / total : 0;

  return (
    <div className="flex h-full flex-col">
      <Header title={ritual.title} back />
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[380px] mx-auto">
          <div className="rounded-2xl bg-white shadow p-6 flex flex-col items-center">
            <ProgressRing progress={progress}>
              <span aria-live="polite" aria-atomic="true">{remaining}</span>
            </ProgressRing>

            <div className="mt-4 text-gray-600 text-sm">{ritual.why}</div>

            <div className="mt-8 w-full flex gap-3">
              {!running ? (
                <Button
                  className="flex-1"
                  variant="primary"
                  onClick={() => { setRunning(true); }}
                >
                  Start
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  variant="ghost"
                  onClick={() => { setRunning(false); vibrate([20, 30, 20], haptics); }}
                >
                  Pause
                </Button>
              )}
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => {
                  if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
                  setRunning(false);
                  void onComplete();
                }}
                disabled={completing}
                aria-busy={completing}
              >
                {completing ? 'Saving…' : 'Finish Now'}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
