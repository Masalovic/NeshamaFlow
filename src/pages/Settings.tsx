// src/pages/Settings.tsx
import React, { useEffect, useState } from "react";
import Header from "../components/ui/Header";
import { clearLock, setLockPIN } from "../lib/appLock";
import {
  clearAll as secureClearAll,
  getItem as sGet,
  setItem as sSet,
  setEncryptionPassphrase,
} from "../lib/secureStorage";
import { supabase } from "../lib/supabase";
import { loadSettings, setSetting } from "../lib/settings";
import { isPro, setPro } from "../lib/pro";
import { isEnabled as remindersOn, toggleEnabled } from "../lib/reminders";

import {
  loadTheme,
  saveTheme,
  applyTheme,
  bindSystemThemeReactivity,
  type Appearance,
  type Accent,
  type Theme,
  type BgMode,
} from "../lib/theme";

// Use one device-local secret when no PIN is set
function getOrCreateDeviceSecret(): string {
  let s = localStorage.getItem("secure.device_secret.v1");
  if (!s) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    s = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    localStorage.setItem("secure.device_secret.v1", s);
  }
  return s;
}

const REKEY_KEYS = [
  "history",
  "settings",
  "mood",
  "note",
  "draft.ritual",
  "events.queue",
  "entitlement.pro",
];

export default function Settings() {
  async function clearAll() {
    secureClearAll();
    try {
      await supabase.auth.signOut();
    } catch {}
    alert("All local data cleared.");
  }

  // THEME state
  const [appearance, setAppearance] = useState<Appearance>("custom");
  const [accent, setAccent] = useState<Accent>("berry");
  const [bgMode, setBgMode] = useState<BgMode>("image");
  const [bgUrl, setBgUrl] = useState<string>(
    "https://images.pexels.com/photos/7130470/pexels-photo-7130470.jpeg"
  );

  useEffect(() => {
    const t = loadTheme();
    setAppearance(t.appearance);
    setAccent(t.accent);
    setBgMode(t.bgMode ?? "image");
    setBgUrl(
      t.bgImageUrl ??
        "https://images.pexels.com/photos/7130470/pexels-photo-7130470.jpeg"
    );
    applyTheme(t);
    const unbind = bindSystemThemeReactivity(() => appearance);
    return () => unbind();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateTheme(next: Partial<Theme>) {
    // Normalize everything so nothing is possibly undefined
    const mergedAppearance: Appearance = next.appearance ?? appearance;
    const mergedAccent: Accent = next.accent ?? accent;
    const mergedBgMode: BgMode = next.bgMode ?? bgMode;
    const mergedBgUrl: string | undefined =
      typeof next.bgImageUrl !== "undefined" ? next.bgImageUrl : bgUrl;

    const merged: Theme = {
      appearance: mergedAppearance,
      accent: mergedAccent,
      bgMode: mergedBgMode,
      bgImageUrl: mergedBgUrl,
    };

    saveTheme(merged);
    applyTheme(merged);

    // Update local state with normalized values
    setAppearance(mergedAppearance);
    setAccent(mergedAccent);
    setBgMode(mergedBgMode); // <- now always a BgMode
    setBgUrl(mergedBgUrl ?? "");
  }

  // Preferences (encrypted)
  const [haptics, setHaptics] = useState(true);

  // Practice & reminders
  const [goalMin, setGoalMin] = useState<number>(2);
  const [reminderTime, setReminderTime] = useState<string>("20:00");
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(
    remindersOn()
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await loadSettings();
      if (!alive) return;
      setHaptics(s.haptics);
      setGoalMin(s.goalMin ?? 2);
      setReminderTime(s.reminderTime ?? "20:00");
      setRemindersEnabled(remindersOn());
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function toggleHaptics(next: boolean) {
    setHaptics(next);
    await setSetting("haptics", next);
  }

  async function onGoalChange(next: string) {
    const n = Math.max(1, Math.min(60, Number(next) || 0));
    setGoalMin(n);
    await setSetting("goalMin", n);
  }

  async function onReminderTimeChange(next: string) {
    const valid = /^\d{2}:\d{2}$/.test(next);
    const hhmm = valid ? next : "20:00";
    setReminderTime(hhmm);
    await setSetting("reminderTime", hhmm);
  }

  function onToggleReminders() {
    const on = toggleEnabled();
    setRemindersEnabled(on);
  }

  // Pro (preview)
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

  // PIN
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lockEnabled = !!localStorage.getItem("lock.hash");

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
    if (pin.length < 4 || /\D/.test(pin)) {
      setMsg("PIN must be at least 4 digits (numbers only).");
      return;
    }
    if (pin !== pin2) {
      setMsg("PINs do not match.");
      return;
    }
    setBusy(true);
    try {
      await rekeyAll(pin);
      await setLockPIN(pin);
      setPin("");
      setPin2("");
      setMsg("App lock enabled on this device.");
    } catch (e) {
      console.error(e);
      setMsg("Failed to enable PIN. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function disablePin() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const secret = getOrCreateDeviceSecret();
      await rekeyAll(secret);
      clearLock();
      setMsg("App lock disabled on this device.");
    } catch (e) {
      console.error(e);
      setMsg("Failed to disable PIN. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Header title="Settings" back />
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[420px] mx-auto space-y-6">
          {/* Appearance */}
          <section className="card p-4">
            <div className="text-sm font-medium text-main mb-2">Appearance</div>

            {/* Appearance segmented */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(["custom", "light", "dark"] as Appearance[]).map((opt) => (
                <button
                  key={opt}
                  className={
                    "h-9 rounded-xl border text-sm" +
                    (appearance === opt
                      ? "border-brand-400 ring-1 ring-brand-300"
                      : "border-[var(--border)] hover:bg-[var(--hover)]")
                  }
                  onClick={() => updateTheme({ appearance: opt })}
                  aria-pressed={appearance === opt}
                >
                  {opt[0].toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>

            {/* Accent chips */}
            <div className="flex items-center gap-2 mb-3">
              {(["berry", "ocean", "forest"] as Accent[]).map((a) => {
                const isActive = accent === a;
                return (
                  <button
                    key={a}
                    onClick={() => updateTheme({ accent: a })}
                    className="h-6 px-3 rounded-full border text-xs"
                    style={{
                      background: isActive
                        ? "var(--accent-200)"
                        : "transparent",
                      borderColor: "var(--border)",
                      color: isActive ? "#000" : "var(--text)", // ← active text goes black
                      textTransform: "capitalize",
                    }}
                    aria-pressed={isActive}
                    title={`Accent: ${a}`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>

            {/* Background style */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                className={
                  "h-10 rounded-xl border text-sm " +
                  (bgMode === "gradient"
                    ? "border-brand-400 ring-1 ring-brand-300"
                    : "border-[var(--border)] hover:bg-[var(--hover)]")
                }
                onClick={() => updateTheme({ bgMode: "gradient" })}
                aria-pressed={bgMode === "gradient"}
              >
                Use gradient
              </button>
              <button
                className={
                  "h-10 rounded-xl border text-sm " +
                  (bgMode === "image"
                    ? "border-brand-400 ring-1 ring-brand-300"
                    : "border-[var(--border)] hover:bg-[var(--hover)]")
                }
                onClick={() =>
                  updateTheme({ bgMode: "image", bgImageUrl: bgUrl })
                }
                aria-pressed={bgMode === "image"}
              >
                Use photo
              </button>
            </div>

            <p className="mt-3 text-xs text-muted">
              Photo background is used only in <strong>System</strong>{" "}
              appearance.
            </p>
          </section>

          {/* Privacy */}
          <div className="card p-4">
            <div className="text-sm font-medium text-main">Privacy</div>
            <p className="text-sm text-muted mt-1">
              Your moods and rituals are stored locally on your device and
              encrypted.
            </p>
          </div>

          {/* Preferences */}
          <div className="card p-4">
            <div className="text-sm font-medium text-main mb-2">
              Preferences
            </div>
            <label className="flex items-center justify-between py-1">
              <span className="text-sm text-main">
                Haptic cues (if supported)
              </span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={haptics}
                onChange={(e) => toggleHaptics(e.target.checked)}
                aria-label="Enable haptic cues"
              />
            </label>
          </div>

          {/* Practice & reminders */}
          <div className="card p-4">
            <div className="text-sm font-medium text-main mb-2">
              Practice & reminders
            </div>

            <label className="flex items-center justify-between py-2">
              <span className="text-sm text-main">Daily goal (minutes)</span>
              <input
                type="number"
                min={1}
                max={60}
                value={goalMin}
                onChange={(e) => onGoalChange(e.target.value)}
                className="input w-20 text-right text-sm h-8"
                aria-label="Daily goal in minutes"
              />
            </label>

            <label className="flex items-center justify-between py-2">
              <span className="text-sm text-main">Preferred reminder time</span>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => onReminderTimeChange(e.target.value)}
                className="input h-8 text-sm"
                aria-label="Preferred reminder time"
              />
            </label>

            <label className="flex items-center justify-between py-2">
              <span className="text-sm text-main">Smart reminders</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={remindersEnabled}
                onChange={onToggleReminders}
                aria-label="Enable smart reminders"
              />
            </label>

            <p className="text-xs text-muted mt-2">
              We’ll nudge you near your preferred time using lightweight,
              on-device logic.
            </p>
          </div>

          {/* Pro (preview) */}
          <div className="card p-4">
            <div className="text-sm font-medium text-main mb-2">
              Pro (Preview)
            </div>
            <label className="flex items-center justify-between py-1">
              <span className="text-sm text-main">
                Enable Pro features (local toggle)
              </span>
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
                  const { track } = await import("../lib/metrics");
                  track("upgrade_click", { source: "settings_pro_card" });
                  await togglePro(true);
                  track("pro_enabled");
                }}
              >
                Upgrade to Pro
              </button>
            )}
            <p className="text-xs text-muted mt-2">
              This is a client-only toggle for testing. We’ll wire it to Stripe
              later.
            </p>
          </div>

          {/* App Lock (PIN) */}
          <div className="card p-4">
            <div className="text-sm font-medium text-main mb-2">
              App Lock (PIN)
            </div>

            {lockEnabled ? (
              <div className="space-y-2">
                <p className="text-sm text-muted">
                  A PIN is currently set on this device.
                </p>
                <button
                  className="btn btn-secondary w-full"
                  onClick={disablePin}
                  disabled={busy}
                >
                  {busy ? "Working…" : "Disable PIN"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm text-main">New PIN</label>
                <input
                  className="input w-full"
                  type="password"
                  inputMode="numeric"
                  pattern="\d*"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
                <label className="block text-sm text-main">Confirm PIN</label>
                <input
                  className="input w-full"
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
                  {busy ? "Saving…" : "Enable PIN"}
                </button>
              </div>
            )}

            {msg && <div className="text-sm mt-2 text-main">{msg}</div>}
            <p className="text-xs text-muted mt-2">
              The PIN is stored locally as a salted SHA-256 hash. It protects
              access on this device only.
            </p>
          </div>

          {/* Danger / Clear */}
          <button className="btn btn-primary w-full" onClick={clearAll}>
            Clear all local data
          </button>
        </div>
      </main>
    </div>
  );
}
