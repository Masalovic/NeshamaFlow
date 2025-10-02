import React, { useState } from "react";
import { verifyPIN } from "../lib/appLock";
import {
  setEncryptionPassphrase,
  migrateFromLegacy,
  clearEncryptionKey,
} from "../lib/secureStorage";

type Props = { onUnlock: () => void };

export default function AppLock({ onUnlock }: Props) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!pin) return;

    setErr(null);
    setBusy(true);
    try {
      // 1) Verify the PIN (reads salt/hash from localStorage; no secrets stored)
      const ok = await verifyPIN(pin);
      if (!ok) {
        setErr("Wrong PIN");
        return;
      }

      // 2) Arm secureStorage with a key derived from the PIN (PBKDF2 → AES-GCM)
      await setEncryptionPassphrase(pin);

      // 3) One-time migration: re-encrypt legacy/plaintext localStorage values
      //    Add/remove keys as your app evolves.
      await migrateFromLegacy([
        "history",        // local session history
        "settings",       // local app settings (if any)
        "draft.ritual",   // draft data
        "ritual.history", // legacy key name (safe if missing)
      ]);

      // 4) Proceed to the app
      onUnlock();
    } catch (e) {
      console.error(e);
      setErr("Unexpected error during unlock. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Optional: expose a dev-only manual lock to drop the in-memory key
  function forceLock() {
    clearEncryptionKey(); // forget encryption key in memory
    setPin("");
    setErr(null);
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 space-y-4"
      >
        <header className="text-center">
          <h1 className="text-xl font-semibold">Enter PIN</h1>
          <p className="text-sm text-gray-500">
            Unlock encrypted data to continue.
          </p>
        </header>

        <div className="space-y-2">
          <label htmlFor="pin" className="text-sm font-medium text-gray-700">
            PIN
          </label>
          <input
            id="pin"
            className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            disabled={busy}
          />
        </div>

        {err && (
          <div className="text-sm text-red-600" role="alert">
            {err}
          </div>
        )}

        <button
          type="submit"
          onClick={() => void 0}
          disabled={busy || pin.length < 4}
          className="w-full rounded-xl py-2 bg-indigo-600 text-white font-medium disabled:opacity-50"
        >
          {busy ? "Unlocking…" : "Unlock"}
        </button>

        {/* Dev-only: remove in production */}
        <button
          type="button"
          onClick={forceLock}
          className="w-full text-xs text-gray-500 underline mt-2"
        >
          Force lock (dev)
        </button>
      </form>
    </div>
  );
}
