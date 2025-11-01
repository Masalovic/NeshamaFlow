// src/components/AppLock.tsx
import React, { useEffect, useRef, useState } from "react";
import { verifyPIN } from "../lib/appLock";
import {
  setEncryptionPassphrase,
  migrateFromLegacy,
  clearEncryptionKey,
} from "../lib/secureStorage";
import { useTranslation } from "react-i18next";

type Props = { onUnlock: () => void };

export default function AppLock({ onUnlock }: Props) {
  const { t } = useTranslation(["common"]);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Focus the PIN field on show
    inputRef.current?.focus();
  }, []);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!pin || busy) return;

    setErr(null);
    setBusy(true);
    try {
      // 1) Verify the PIN (salt/hash is in localStorage; no secrets stored)
      const ok = await verifyPIN(pin);
      if (!ok) {
        setErr(t("common:appLock.error.wrongPin"));
        return;
        // busy resets in finally
      }

      // 2) Arm secureStorage with a key derived from the PIN (PBKDF2 → AES-GCM)
      await setEncryptionPassphrase(pin);

      // 3) One-time migration: re-encrypt legacy/plaintext localStorage values
      await migrateFromLegacy([
        "history",
        "settings",
        "draft.ritual",
        "ritual.history",
      ]);

      // 4) Proceed
      setPin(""); // clear from memory as we leave this screen
      onUnlock();
    } catch (e) {
      console.error(e);
      setErr(t("common:appLock.error.unexpected"));
    } finally {
      setBusy(false);
    }
  }

  // Optional: dev-only manual lock to drop the in-memory key
  function forceLock() {
    clearEncryptionKey();
    setPin(""); 
    setErr(null);
    inputRef.current?.focus();
  }

  return (
    <div className="min-h-[100svh] grid place-items-center bg-[var(--bg)] text-[var(--text)] p-6">
      <form
        onSubmit={submit}
        className="card w-full max-w-sm p-6 space-y-4"
        aria-busy={busy}
        aria-label={t("common:appLock.a11y.form")}
      >
        <header className="text-center">
          <h1 className="text-lg font-semibold text-main">
            {t("common:appLock.title")}
          </h1>
          <p className="text-sm text-muted">
            {t("common:appLock.subtitle")}
          </p>
        </header>

        <div className="space-y-2">
          <label htmlFor="pin" className="text-sm font-medium text-main">
            {t("common:appLock.pinLabel")}
          </label>
          <input
            id="pin"
            ref={inputRef}
            className={`input w-full ${err ? "ring-1 ring-red-500" : ""}`}
            type="password"
            inputMode="numeric"
            pattern="\\d*"
            autoComplete="one-time-code"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            disabled={busy}
            aria-invalid={!!err}
            aria-describedby={err ? "pin-error" : undefined}
            aria-label={t("common:appLock.a11y.pinField")}
          />
        </div>

        {err && (
          <div id="pin-error" className="text-sm text-red-600" role="alert">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || pin.length < 4}
          className="btn btn-primary w-full"
          aria-label={busy ? t("common:buttons.unlocking") : t("common:buttons.unlock")}
          title={busy ? t("common:buttons.unlocking") : t("common:buttons.unlock")}
        >
          {busy ? t("common:buttons.unlocking") : t("common:buttons.unlock")}
        </button>

        {/* Dev-only helper (won’t render in production builds) */}
        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={forceLock}
            className="w-full text-xs text-muted underline"
          >
            {t("common:dev.forceLock")}
          </button>
        )}
      </form>
    </div>
  );
}
