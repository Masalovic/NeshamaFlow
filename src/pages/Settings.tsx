import React, { useEffect, useState } from 'react';
import Header from '../components/ui/Header';
import { clearLock, setLockPIN } from '../lib/appLock';
import {
  clearAll as secureClearAll,
  getItem as sGet,
  setItem as sSet,
  setEncryptionPassphrase,
} from '../lib/secureStorage';
import { supabase } from '../lib/supabase';
import { loadSettings, setSetting } from '../lib/settings';
import { isPro, setPro } from '../lib/pro';
import { isEnabled as remindersOn, toggleEnabled } from '../lib/reminders';
import { loadTheme, saveTheme, type Appearance, type Accent } from '../lib/theme';

// Use one device-local secret when no PIN is set (so secureStorage still works)
function getOrCreateDeviceSecret(): string {
  let s = localStorage.getItem('secure.device_secret.v1');
  if (!s) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    s = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('secure.device_secret.v1', s);
  }
  return s;
}

// Keys we want to preserve when we re-key storage
const REKEY_KEYS = [
  'history',
  'settings',
  'mood',
  'note',
  'draft.ritual',
  'events.queue',
  'entitlement.pro',
];

export default function Settings() {
  async function clearAll() {
    secureClearAll();
    try { await supabase.auth.signOut(); } catch {}
    alert('All local data cleared.');
  }

  // ----- Preferences (encrypted) -----
  const [haptics, setHaptics] = useState(true);

  // ----- Practice & reminders (from onboarding) -----
  const [goalMin, setGoalMin] = useState<number>(2);
  const [reminderTime, setReminderTime] = useState<string>('20:00');
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(remindersOn());

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await loadSettings();
      if (!alive) return;
      setHaptics(s.haptics);
      setGoalMin(s.goalMin ?? 2);
      setReminderTime(s.reminderTime ?? '20:00');
      setRemindersEnabled(remindersOn());
    })();
    return () => { alive = false; };
  }, []);

  async function toggleHaptics(next: boolean) {
    setHaptics(next);
    await setSetting('haptics', next);
  }

  async function onGoalChange(next: string) {
    const n = Math.max(1, Math.min(60, Number(next) || 0));
    setGoalMin(n);
    await setSetting('goalMin', n);
  }

  async function onReminderTimeChange(next: string) {
    const valid = /^\d{2}:\d{2}$/.test(next);
    const hhmm = valid ? next : '20:00';
    setReminderTime(hhmm);
    await setSetting('reminderTime', hhmm);
  }

  function onToggleReminders() {
    const on = toggleEnabled();
    setRemindersEnabled(on);
  }

  // ----- Theme -----
  const [appearance, setAppearance] = useState<Appearance>('system')
  const [accent, setAccent] = useState<Accent>('berry')

  useEffect(() => {
    let alive = true
    ;(async () => {
      const t = await loadTheme()
      if (!alive) return
      setAppearance(t.appearance)
      setAccent(t.accent)
    })()
    return () => { alive = false }
  }, [])

  async function onAppearanceChange(a: Appearance) {
    setAppearance(a)
    await saveTheme({ appearance: a, accent })
  }
  async function onAccentChange(c: Accent) {
    setAccent(c)
    await saveTheme({ appearance, accent: c })
  }

  // ----- Pro (preview) -----
  const [pro, setProState] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const val = await isPro();
      if (alive) setProState(val);
    })();
    return () => { alive = false; };
  }, []);
  async function togglePro(next: boolean) {
    setProState(next);
    await setPro(next);
  }

  // ----- PIN state -----
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lockEnabled = !!localStorage.getItem('lock.hash');

  // Helper: snapshot -> switch key -> rewrite
  async function rekeyAll(newPassphrase: string) {
    const snapshot: Record<string, unknown> = {};
    for (const k of REKEY_KEYS) snapshot[k] = await sGet(k);
    await setEncryptionPassphrase(newPassphrase);
    for (const k of REKEY_KEYS) {
      const v = snapshot[k];
      if (v !== null && v !== undefined) await sSet(k, v);
    }
  }

  async function enablePin() {
    setMsg(null);
    if (busy) return;
    if (pin.length < 4 || /\D/.test(pin)) { setMsg('PIN must be at least 4 digits (numbers only).'); return; }
    if (pin !== pin2) { setMsg('PINs do not match.'); return; }
    setBusy(true);
    try {
      await rekeyAll(pin);
      await setLockPIN(pin);
      setPin(''); setPin2('');
      setMsg('App lock enabled on this device.');
    } catch (e) {
      console.error(e);
      setMsg('Failed to enable PIN. Please try again.');
    } finally { setBusy(false); }
  }

  async function disablePin() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const secret = getOrCreateDeviceSecret();
      await rekeyAll(secret);
      clearLock();
      setMsg('App lock disabled on this device.');
    } catch (e) {
      console.error(e);
      setMsg('Failed to disable PIN. Please try again.');
    } finally { setBusy(false); }
  }

  return (
    <div className="flex h-full flex-col">
      <Header title="Settings" back />
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[420px] mx-auto space-y-6">
          {/* Privacy */}
          <div className="rounded-2xl border bg-white p-4 dark:bg-neutral-900 dark:border-neutral-800">
            <div className="text-sm font-medium">Privacy</div>
            <p className="text-sm text-gray-600 mt-1 dark:text-neutral-400">
              Your moods and rituals are stored locally on your device and encrypted.
            </p>
          </div>

          {/* Preferences */}
          <div className="rounded-2xl border bg-white p-4 dark:bg-neutral-900 dark:border-neutral-800">
            <div className="text-sm font-medium mb-2">Preferences</div>
            <label className="flex items-center justify-between py-1">
              <span className="text-sm">Haptic cues (if supported)</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={haptics}
                onChange={(e) => toggleHaptics(e.target.checked)}
                aria-label="Enable haptic cues"
              />
            </label>
          </div>

          {/* Theme */}
          <div className="rounded-2xl border bg-white p-4 dark:bg-neutral-900 dark:border-neutral-800">
            <div className="text-sm font-medium mb-2">Theme</div>

            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1 dark:text-neutral-400">Appearance</div>
              <div className="grid grid-cols-3 gap-2">
                {(['system','light','dark'] as Appearance[]).map(a => (
                  <button
                    key={a}
                    onClick={() => onAppearanceChange(a)}
                    className={[
                      'px-3 py-2 rounded-lg border text-sm',
                      appearance === a ? 'border-accent bg-accent-100' : 'border-gray-300 hover:border-gray-400 dark:border-neutral-700 dark:hover:border-neutral-500'
                    ].join(' ')}
                    aria-pressed={appearance === a}
                  >
                    {a[0].toUpperCase() + a.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1 dark:text-neutral-400">Accent</div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'berry',  name: 'Berry',  swatch: 'bg-pink-500'   },
                  { key: 'ocean',  name: 'Ocean',  swatch: 'bg-blue-500'   },
                  { key: 'forest', name: 'Forest', swatch: 'bg-green-500'  },
                ] as { key: Accent; name: string; swatch: string }[]).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => onAccentChange(opt.key)}
                    className={[
                      'px-3 py-2 rounded-lg border text-sm flex items-center gap-2',
                      accent === opt.key ? 'border-accent bg-accent-100' : 'border-gray-300 hover:border-gray-400 dark:border-neutral-700 dark:hover:border-neutral-500'
                    ].join(' ')}
                    aria-pressed={accent === opt.key}
                  >
                    <span className={`inline-block w-3 h-3 rounded-full ${opt.swatch}`} />
                    {opt.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Practice & reminders */}
          <div className="rounded-2xl border bg-white p-4 dark:bg-neutral-900 dark:border-neutral-800">
            <div className="text-sm font-medium mb-2">Practice & reminders</div>

            <label className="flex items-center justify-between py-2">
              <span className="text-sm">Daily goal (minutes)</span>
              <input
                type="number"
                min={1}
                max={60}
                value={goalMin}
                onChange={(e) => onGoalChange(e.target.value)}
                className="w-20 border rounded-lg px-2 py-1 text-sm text-right dark:bg-neutral-900 dark:border-neutral-700"
                aria-label="Daily goal in minutes"
              />
            </label>

            <label className="flex items-center justify-between py-2">
              <span className="text-sm">Preferred reminder time</span>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => onReminderTimeChange(e.target.value)}
                className="border rounded-lg px-2 py-1 text-sm dark:bg-neutral-900 dark:border-neutral-700"
                aria-label="Preferred reminder time"
              />
            </label>

            <label className="flex items-center justify-between py-2">
              <span className="text-sm">Smart reminders</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={remindersEnabled}
                onChange={onToggleReminders}
                aria-label="Enable smart reminders"
              />
            </label>

            <p className="text-xs text-gray-500 mt-2 dark:text-neutral-400">
              We’ll nudge you near your preferred time using lightweight, on-device logic.
            </p>
          </div>

          {/* Pro (preview) */}
          <div className="rounded-2xl border bg-white p-4 dark:bg-neutral-900 dark:border-neutral-800">
            <div className="text-sm font-medium mb-2">Pro (Preview)</div>
            <label className="flex items-center justify-between py-1">
              <span className="text-sm">Enable Pro features (local toggle)</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={pro}
                onChange={(e) => togglePro(e.target.checked)}
                aria-label="Enable Pro"
              />
            </label>
            {!pro && (
              <button
                className="btn btn-primary w-full mt-3"
                onClick={async () => {
                  const { track } = await import('../lib/metrics'); // lazy
                  track('upgrade_click', { source: 'settings_pro_card' });
                  await togglePro(true);
                  track('pro_enabled');
                }}
              >
                Upgrade to Pro
              </button>
            )}
            <p className="text-xs text-gray-500 mt-2 dark:text-neutral-400">
              This is a client-only toggle for testing. We’ll wire it to Stripe later.
            </p>
          </div>

          {/* App Lock (PIN) */}
          <div className="rounded-2xl border bg-white p-4 dark:bg-neutral-900 dark:border-neutral-800">
            <div className="text-sm font-medium mb-2">App Lock (PIN)</div>

            {lockEnabled ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-neutral-400">A PIN is currently set on this device.</p>
                <button
                  className="btn btn-secondary w-full"
                  onClick={disablePin}
                  disabled={busy}
                >
                  {busy ? 'Working…' : 'Disable PIN'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm">New PIN</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 dark:bg-neutral-900 dark:border-neutral-700"
                  type="password"
                  inputMode="numeric"
                  pattern="\d*"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
                <label className="block text-sm">Confirm PIN</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 dark:bg-neutral-900 dark:border-neutral-700"
                  type="password"
                  inputMode="numeric"
                  pattern="\d*"
                  value={pin2}
                  onChange={(e) => setPin2(e.target.value)}
                />
                <button
                  className="btn btn-primary w-full"
                  onClick={enablePin}
                  disabled={busy}
                >
                  {busy ? 'Saving…' : 'Enable PIN'}
                </button>
              </div>
            )}

            {msg && <div className="text-sm mt-2">{msg}</div>}
            <p className="text-xs text-gray-500 mt-2 dark:text-neutral-400">
              The PIN is stored locally as a salted SHA-256 hash. It protects access on this device only.
            </p>
          </div>

          {/* Danger / Clear */}
          <button className="btn btn-secondary w-full" onClick={clearAll}>
            Clear all local data
          </button>
        </div>
      </main>
    </div>
  );
}
