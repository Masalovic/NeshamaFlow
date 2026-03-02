// src/pages/Settings.tsx
import React, { useEffect, useState } from "react";
import Header from "../components/ui/Header";
import { clearLock, setLockPIN } from "../lib/appLock";
import { getOrCreateDeviceSecret } from "../lib/secureBootstrap";
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

import i18n, { type SupportedLng } from "../lib/i18n";
import { useTranslation } from "react-i18next";
import LanguageSelect from "../components/LanguageSelect";

import { getGoal, setGoal, type GoalId } from "../lib/goal";

const REKEY_KEYS = [
  "history",
  "settings",
  "mood",
  "note",
  "draft.ritual",
  "events.queue",
  "entitlement.pro",
  // if you also store goal under secureStorage, include it:
  // goal is stored under `goal:${scope}` so not a fixed key
];

export default function Settings() {
  const { t } = useTranslation(["settings", "common"]);

  // THEME state
  const [appearance, setAppearance] = useState<Appearance>("custom");
  const [accent, setAccent] = useState<Accent>("berry");
  const [bgMode, setBgMode] = useState<BgMode>("image");
  const [bgUrl, setBgUrl] = useState<string>("");

  useEffect(() => {
    const current = loadTheme();
    setAppearance(current.appearance);
    setAccent(current.accent);
    setBgMode((current.bgMode ?? "image") as BgMode);
    setBgUrl(current.bgImageUrl ?? "");
    applyTheme(current);

    const unbind = bindSystemThemeReactivity(() => appearance);
    return () => unbind();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateTheme(next: Partial<Theme>) {
    const mergedAppearance: Appearance = next.appearance ?? appearance;
    const mergedAccent: Accent = next.accent ?? accent;
    const mergedBgMode: BgMode = (next.bgMode ?? bgMode) as BgMode;

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

    setAppearance(mergedAppearance);
    setAccent(mergedAccent);
    setBgMode(mergedBgMode);
    setBgUrl(mergedBgUrl ?? "");
  }

  async function clearAll() {
    secureClearAll();
    try {
      await supabase.auth.signOut();
    } catch {}
    alert(t("settings:clearAll.confirmed", "All local data cleared."));
  }

  // Preferences (encrypted)
  const [haptics, setHaptics] = useState(true);

  // Practice & reminders
  const [goalMin, setGoalMin] = useState<number>(2);
  const [reminderTime, setReminderTime] = useState<string>("20:00");
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(
    remindersOn()
  );

  // ✅ Primary goal (encrypted)
  const [primaryGoal, setPrimaryGoal] = useState<GoalId>("reduceStress");

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await loadSettings();
      if (!alive) return;

      setHaptics(s.haptics);
      setGoalMin(s.goalMin ?? 2);
      setReminderTime(s.reminderTime ?? "20:00");
      setRemindersEnabled(remindersOn());

      // load goal
      try {
        const gs = await getGoal();
        if (alive) setPrimaryGoal(gs.goal);
      } catch {
        // ignore
      }
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

  async function changePrimaryGoal(next: GoalId) {
    setPrimaryGoal(next);
    try {
      await setGoal(next);
    } catch {
      // if locked or key missing, Settings shouldn't allow anyway, but keep safe
    }
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
      setMsg(
        t(
          "settings:pin.minDigits",
          "PIN must be at least 4 digits (numbers only)."
        )
      );
      return;
    }
    if (pin !== pin2) {
      setMsg(t("settings:pin.mismatch", "PINs do not match."));
      return;
    }
    setBusy(true);
    try {
      await rekeyAll(pin);
      await setLockPIN(pin);
      setPin("");
      setPin2("");
      setMsg(t("settings:pin.enabled", "App lock enabled on this device."));
    } catch (e) {
      console.error(e);
      setMsg(
        t("settings:pin.enableFail", "Failed to enable PIN. Please try again.")
      );
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
      setMsg(t("settings:pin.disabled", "App lock disabled on this device."));
    } catch (e) {
      console.error(e);
      setMsg(
        t(
          "settings:pin.disableFail",
          "Failed to disable PIN. Please try again."
        )
      );
    } finally {
      setBusy(false);
    }
  }

  // Language selector
  const [lng, setLng] = useState<SupportedLng>(
    ((i18n.resolvedLanguage as SupportedLng) || "en") as SupportedLng
  );
  function changeLanguage(next: SupportedLng) {
    setLng(next);
    i18n.changeLanguage(next);
  }

  return (
    <div className="flex h-full flex-col">
      <Header title={t("settings:title", "Settings")} back />
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[420px] mx-auto space-y-6">
          {/* Language */}
          <section className="card p-4">
            <div className="text-sm font-medium text-main mb-2">
              {t("settings:language.title", "Language")}
            </div>
            <label className="flex items-center justify-between py-1">
              <span className="text-sm text-main">
                {t("settings:language.choose", "Choose app language")}
              </span>
              <LanguageSelect
                value={lng}
                onChange={changeLanguage}
                className="min-w-[180px] flex justify-end"
              />
            </label>
          </section>

          {/* Appearance */}
          <section className="card p-4">
            <div className="text-sm font-medium text-main mb-2">
              {t("common:appearance.title", "Appearance")}
            </div>

            <div className="mb-3">
              <div className="w-full inline-flex items-center justify-between rounded-full border border-token bg-[var(--surface-2)] px-1 py-1">
                {(["custom", "light", "dark"] as Appearance[]).map((opt) => {
                  const active = appearance === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => updateTheme({ appearance: opt })}
                      className={
                        "h-8 px-6 rounded-full text-sm leading-none transition-colors " +
                        (active
                          ? "bg-[var(--accent-200)] text-black shadow-[inset_0_0_0_1px_rgba(0,0,0,.06)]"
                          : "text-[var(--text-dim)] hover:bg-[var(--hover)]")
                      }
                    >
                      {t(
                        `common:appearance.${opt}`,
                        opt[0].toUpperCase() + opt.slice(1)
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-3">
              <div className="w-full inline-flex items-center justify-between rounded-full border border-token bg-[var(--surface-2)] px-1 py-1 gap-2">
                {(["berry", "ocean", "forest"] as Accent[]).map((a) => {
                  const active = accent === a;
                  const SWATCH: Record<Accent, string> = {
                    berry: "#e94d96",
                    ocean: "#3b91ea",
                    forest: "#36a844",
                  };
                  return (
                    <button
                      key={a}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => updateTheme({ accent: a })}
                      className={
                        "h-8 px-3 rounded-full text-xs leading-none inline-flex items-center gap-2 transition-colors " +
                        (active
                          ? "bg-[var(--accent-200)] text-black shadow-[inset_0_0_0_1px_rgba(0,0,0,.06)]"
                          : "text-[var(--text-dim)] hover:bg-[var(--hover)]")
                      }
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{
                          background: active ? "var(--accent-600)" : SWATCH[a],
                        }}
                      />
                      <span style={{ textTransform: "capitalize" }}>
                        {t(`common:accent.${a}`, a)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Privacy */}
          <div className="card p-4">
            <div className="text-sm font-medium text-main">
              {t("settings:privacy.title", "Privacy")}
            </div>
            <p className="text-sm text-muted mt-1">
              {t(
                "settings:privacy.body",
                "Your moods and rituals are stored locally on your device and encrypted."
              )}
            </p>
          </div>

          {/* Preferences */}
          <div className="card p-4">
            <div className="text-sm font-medium text-main mb-2">
              {t("settings:prefs.title", "Preferences")}
            </div>
            <label className="flex items-center justify-between py-1">
              <span className="text-sm text-main">
                {t("settings:prefs.haptics", "Haptic cues (if supported)")}
              </span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={haptics}
                onChange={(e) => toggleHaptics(e.target.checked)}
              />
            </label>
          </div>

          {/* Practice & reminders */}
          <div className="card p-4">
            <div className="text-sm font-medium text-main mb-2">
              {t("settings:practice.title", "Practice & reminders")}
            </div>

            <label className="flex items-center justify-between py-2">
              <span className="text-sm text-main">
                {t("settings:practice.goal", "Daily goal (minutes)")}
              </span>
              <input
                type="number"
                min={1}
                max={60}
                value={goalMin}
                onChange={(e) => onGoalChange(e.target.value)}
                className="input w-20 text-right text-sm h-8"
              />
            </label>

            <label className="flex items-center justify-between py-2">
              <span className="text-sm text-main">
                {t("settings:practice.time", "Preferred reminder time")}
              </span>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => onReminderTimeChange(e.target.value)}
                className="input h-8 text-sm"
              />
            </label>

            <label className="flex items-center justify-between py-2">
              <span className="text-sm text-main">
                {t("settings:practice.smart", "Smart reminders")}
              </span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={remindersEnabled}
                onChange={onToggleReminders}
              />
            </label>
          </div>

          {/* ✅ Primary goal */}
          <section className="card p-4">
            <div className="text-sm font-medium text-main mb-1">
              {t("settings:goal.title", "Primary goal")}
            </div>
            <p className="text-xs text-muted mb-3">
              {t(
                "settings:goal.hint",
                "Used for suggestions and goal progress."
              )}
            </p>

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["reduceStress", "Reduce stress"],
                  ["buildHabit", "Build a habit"],
                  ["sleepBetter", "Sleep better"],
                  ["feelSteadier", "Feel steadier"],
                ] as const
              ).map(([id, fallback]) => {
                const active = primaryGoal === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => changePrimaryGoal(id)}
                    aria-pressed={active}
                    className={
                      "rounded-xl border py-1 px-3 text-left transition-colors " +
                      (active
                        ? "border-brand-400 ring-1 ring-brand-300 bg-[var(--surface-2)]"
                        : "border-[var(--border)] hover:bg-[var(--hover)]")
                    }
                  >
                    <div className="text-sm text-main font-medium">
                      {String(
                        t(`settings:welcome.goals.${id}`, {
                          defaultValue: fallback,
                        })
                      )}
                    </div>
                    <div className="text-[11px] text-muted leading-snug">
                      {String(
                        t(`settings:goal.desc.${id}`, { defaultValue: "" })
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Pro (preview) */}
          <div className="card p-4">
            <div className="text-sm font-medium text-main mb-2">
              {t("settings:pro.title", "Pro (Preview)")}
            </div>
            <label className="flex items-center justify-between py-1">
              <span className="text-sm text-main">
                {t("settings:pro.toggle", "Enable Pro features (local toggle)")}
              </span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={pro}
                onChange={(e) => togglePro(e.target.checked)}
              />
            </label>
          </div>

          {/* App Lock (PIN) */}
          <div className="card p-4">
            <div className="text-sm font-medium text-main mb-2">
              {t("settings:pin.title", "App Lock (PIN)")}
            </div>

            {lockEnabled ? (
              <div className="space-y-2">
                <p className="text-sm text-muted">
                  {t(
                    "settings:pin.already",
                    "A PIN is currently set on this device."
                  )}
                </p>
                <button
                  className="btn btn-secondary w-full"
                  onClick={disablePin}
                  disabled={busy}
                >
                  {busy
                    ? t("common:working", "Working…")
                    : t("settings:pin.disable", "Disable PIN")}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm text-main">
                  {t("settings:pin.new", "New PIN")}
                </label>
                <input
                  className="input w-full"
                  type="password"
                  inputMode="numeric"
                  pattern="\d*"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
                <label className="block text-sm text-main">
                  {t("settings:pin.confirm", "Confirm PIN")}
                </label>
                <input
                  className="input w-full"
                  type="password"
                  inputMode="numeric"
                  pattern="\d*"
                  value={pin2}
                  onChange={(e) => setPin2(e.target.value)}
                />
                <button
                  className="btn btn-primary btn-full w-full"
                  onClick={enablePin}
                  disabled={busy}
                >
                  {busy
                    ? t("common:saving", "Saving…")
                    : t("settings:pin.enable", "Enable PIN")}
                </button>
              </div>
            )}

            {msg && <div className="text-sm mt-2 text-main">{msg}</div>}
          </div>

          {/* Danger / Clear */}
          <button
            className="btn btn-primary btn-full w-full"
            onClick={clearAll}
          >
            {t("settings:clearAll.cta", "Clear all local data")}
          </button>
        </div>
      </main>
    </div>
  );
}
