import React, { useEffect, useState } from 'react';
import Header from '../components/ui/Header';
import Button from '../components/ui/Button';
import { setSetting, loadSettings } from '../lib/settings';
import { isEnabled as remindersEnabled, toggleEnabled as toggleReminders } from '../lib/reminders';
import { completeOnboarding } from '../lib/onboarding';
import { track } from '../lib/metrics';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const GOAL_KEYS = ['reduceStress','buildHabit','sleepBetter','feelSteadier'] as const;
type GoalKey = typeof GOAL_KEYS[number];

export default function Welcome() {
  const nav = useNavigate();
  const { t } = useTranslation(['onboarding', 'common']);
  const [goal, setGoal] = useState<GoalKey | null>(null);
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
      if (goal) await setSetting('onboardingGoal', goal);
      await setSetting('haptics', haptics);
      if (remOn !== remindersEnabled()) toggleReminders();
      await completeOnboarding();
      track('app_open');
      nav('/log', { replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Header title={t('onboarding:welcome.title', 'Welcome')} />
      <main className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-[420px] space-y-6">

          {/* Goals */}
          <section className="card p-5">
            <h2 className="text-lg font-semibold text-main mb-1">{t('onboarding:goals.title', 'What’s your main goal?')}</h2>
            <p className="text-sm text-muted mb-3">{t('onboarding:goals.subtitle', 'This helps tailor guidance.')}</p>

            <div className="grid grid-cols-2 gap-2">
              {GOAL_KEYS.map((k) => {
                const active = goal === k;
                return (
                  <button
                    key={k}
                    onClick={() => setGoal(k)}
                    aria-pressed={active}
                    className="h-10 rounded-xl px-3 text-sm border transition"
                    style={{
                      background: active ? 'var(--accent-200)' : 'var(--surface-2)',
                      borderColor: 'var(--border)',
                      color: active ? '#000' : 'var(--text)',
                    }}
                  >
                    {t(`onboarding:goals.${k}`, {
                      reduceStress: 'Reduce stress',
                      buildHabit: 'Build a habit',
                      sleepBetter: 'Sleep better',
                      feelSteadier: 'Feel steadier'
                    }[k] as string)}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Haptics */}
          <section className="card p-5">
            <h3 className="text-sm font-medium text-main mb-2">{t('onboarding:haptics.title', 'Haptic cues')}</h3>
            <label className="flex items-center justify-between">
              <span className="text-sm text-dim">{t('onboarding:haptics.desc', 'Small vibration at start/end')}</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={haptics}
                onChange={(e) => setHaptics(e.target.checked)}
                aria-label={t('onboarding:haptics.title', 'Haptic cues')}
              />
            </label>
          </section>

          {/* Smart reminder */}
          <section className="card p-5">
            <h3 className="text-sm font-medium text-main mb-2">{t('onboarding:reminder.title', 'Smart reminder')}</h3>
            <p className="text-xs text-muted mb-2">
              {t('onboarding:reminder.desc', 'A gentle nudge near your usual practice time. Fully on-device.')}
            </p>
            <label className="flex items-center justify-between">
              <span className="text-sm text-dim">{t('onboarding:reminder.enable', 'Enable reminder')}</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={remOn}
                onChange={(e) => setRemOn(e.target.checked)}
                aria-label={t('onboarding:reminder.enable', 'Enable reminder')}
              />
            </label>
          </section>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="ghost" onClick={finish}>{t('onboarding:actions.skip', 'Skip for now')}</Button>
            <Button variant="primary" onClick={finish} aria-busy={busy}>
              {busy ? t('common:saving', 'Saving…') : t('onboarding:actions.continue', 'Continue')}
            </Button>
          </div>

          <p className="text-[12px] text-muted text-center">
            {t('onboarding:footer.changeAnytime', 'You can change these anytime in')} <em>{t('common:nav.settings', 'Settings')}</em>.
          </p>
        </div>
      </main>
    </div>
  );
}
