// src/pages/Settings.tsx
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
    try {
      await supabase.auth.signOut();
    } catch {}
    alert('All local data cleared.');
  }

  // ----- Preferences (encrypted) -----
  const [haptics, setHaptics] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await loadSettings();
      if (alive) setHaptics(s.haptics);
    })();
    return () => {
      alive = false;
    };
  }, []);
  async function toggleHaptics(next: boolean) {
    setHaptics(next);
    await setSetting('haptics', next);
  }

  // ----- Pro (preview) -----
  const [pro, setProState] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const val = await isPro();
      if (alive) setProState(val);
    })();
    return () => {
      alive = false;
    };
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
    for (const k of REKEY_KEYS) {
      // read with current key
      snapshot[k] = await sGet(k);
    }
    // switch key
    await setEncryptionPassphrase(newPassphrase);
    // rewrite under new key
    for (const k of REKEY_KEYS) {
      const v = snapshot[k];
      if (v !== null && v !== undefined) {
        await sSet(k, v);
      }
    }
  }

  async function enablePin() {
    setMsg(null);
    if (busy) return;
    if (pin.length < 4 || /\D/.test(pin)) {
      setMsg('PIN must be at least 4 digits (numbers only).');
      return;
    }
    if (pin !== pin2) {
      setMsg('PINs do not match.');
      return;
    }
    setBusy(true);
    try {
      // Re-key encrypted data from device-secret -> PIN passphrase
      await rekeyAll(pin);
      // Persist the PIN salt/hash (controls AppLock)
      await setLockPIN(pin);
      setPin('');
      setPin2('');
      setMsg('App lock enabled on this device.');
    } catch (e) {
      console.error(e);
      setMsg('Failed to enable PIN. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function disablePin() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      // Re-key encrypted data from PIN -> device-secret so app keeps working without lock
      const secret = getOrCreateDeviceSecret();
      await rekeyAll(secret);
      clearLock();
      setMsg('App lock disabled on this device.');
    } catch (e) {
      console.error(e);
      setMsg('Failed to disable PIN. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Header title="Settings" back />
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[360px] mx-auto space-y-6">
          {/* Privacy */}
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm font-medium">Privacy</div>
            <p className="text-sm text-gray-600 mt-1">
              Your moods and rituals are stored locally on your device and encrypted.
            </p>
          </div>

          {/* Preferences */}
          <div className="rounded-2xl border bg-white p-4">
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

          {/* Pro (preview) */}
          <div className="rounded-2xl border bg-white p-4">
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
            <p className="text-xs text-gray-500 mt-2">
              This is a client-only toggle for testing. We’ll wire it to Stripe later.
            </p>
          </div>

          {/* App Lock (PIN) */}
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm font-medium mb-2">App Lock (PIN)</div>

            {lockEnabled ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">A PIN is currently set on this device.</p>
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
                  className="w-full border rounded-xl px-3 py-2"
                  type="password"
                  inputMode="numeric"
                  pattern="\d*"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
                <label className="block text-sm">Confirm PIN</label>
                <input
                  className="w-full border rounded-xl px-3 py-2"
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
            <p className="text-xs text-gray-500 mt-2">
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
