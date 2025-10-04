import React, { useEffect, useState } from 'react';
import Header from '../components/ui/Header';
import Button from '../components/ui/Button';
import { setSetting, loadSettings } from '../lib/settings';
import { isEnabled as remindersEnabled, toggleEnabled as toggleReminders } from '../lib/reminders';
import { completeOnboarding } from '../lib/onboarding';
import { track } from '../lib/metrics';
import { useNavigate } from 'react-router-dom';

const GOALS = ['Reduce stress', 'Build a habit', 'Sleep better', 'Feel steadier'] as const;
type Goal = typeof GOALS[number];

export default function Welcome() {
  const nav = useNavigate();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [haptics, setHaptics] = useState(true);
  const [remOn, setRemOn] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await loadSettings();
      if (!alive) return;
      setHaptics(s.haptics);
      setRemOn(remindersEnabled());
    })();
    return () => { alive = false; };
  }, []);

  async function finish() {
    if (busy) return;
    setBusy(true);
    try {
      await setSetting('haptics', haptics);
      // Toggle reminders only if user changed the current state
      if (remOn !== remindersEnabled()) toggleReminders();
      await completeOnboarding();
      track('app_open'); // first launch after onboarding lands here next time
      nav('/log', { replace: true });
    } finally { setBusy(false); }
  }

  return (
    <div className="flex h-full flex-col">
      <Header title="Welcome" />
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[420px] mx-auto space-y-6">
          <div className="rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold mb-1">What’s your main goal?</h2>
            <p className="text-sm text-gray-600 mb-3">This helps tailor guidance.</p>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map(g => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  className={
                    'h-10 rounded-xl px-3 text-sm border transition ' +
                    (goal === g ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-gray-200 hover:bg-gray-50')
                  }
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <h3 className="text-sm font-medium mb-2">Haptic cues</h3>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Small vibration at start/end</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={haptics}
                onChange={e => setHaptics(e.target.checked)}
              />
            </label>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <h3 className="text-sm font-medium mb-2">Smart reminder</h3>
            <p className="text-xs text-gray-500 mb-2">
              A gentle nudge near your usual practice time. Fully on-device.
            </p>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Enable reminder</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={remOn}
                onChange={e => setRemOn(e.target.checked)}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="ghost" onClick={finish}>Skip for now</Button>
            <Button variant="primary" onClick={finish} aria-busy={busy}>
              {busy ? 'Saving…' : 'Continue'}
            </Button>
          </div>

          <p className="text-[12px] text-gray-500 text-center">
            You can change these anytime in <em>Settings</em>.
          </p>
        </div>
      </main>
    </div>
  );
}
