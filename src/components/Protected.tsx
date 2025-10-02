import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import AuthScreen from '../pages/AuthScreen';
import AppLock from '../pages/AppLock';
import { ready as storageReady, setEncryptionPassphrase } from '../lib/secureStorage';
import { track, flush } from '../lib/metrics';

function getOrCreateDeviceSecret(): string {
  let s = localStorage.getItem('secure.device_secret.v1');
  if (!s) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    s = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('secure.device_secret.v1', s);
  }
  return s;
}

export default function Protected({ children }: { children: JSX.Element }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [unlocked, setUnlocked] = useState<boolean>(storageReady());

  // Enforce "don't stay signed in" on every app boot
  useEffect(() => {
    const noStay = localStorage.getItem('neshama.noStay') === '1';
    if (noStay) supabase.auth.signOut().catch(() => {});
  }, []);

  // Bootstrap secureStorage when no PIN is set (derive device-secret key)
  useEffect(() => {
    const pinSet = !!localStorage.getItem('lock.hash');
    if (!pinSet && !storageReady()) {
      const secret = getOrCreateDeviceSecret();
      setEncryptionPassphrase(secret).catch(() => {});
    }
  }, []);

  // Supabase session bootstrap + live updates, and clean up stale sessions
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();

      // Proactively refresh to detect stale/invalid tokens
      if (data.session) {
        const { error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshErr) {
          try { await supabase.auth.signOut(); } catch {}
        }
      }

      if (!mounted) return;
      const { data: data2 } = await supabase.auth.getSession(); // re-check after potential signOut()
      setAuthed(!!data2.session);
      setReady(true);
      if (data2.session && storageReady()) track('app_open');
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!mounted) return;
      setAuthed(!!session);
      if (session && storageReady()) track('app_open');
    });

    // Best-effort periodic metrics flush (only if key is ready)
    const t = window.setInterval(() => {
      if (storageReady()) void flush().catch(() => {});
    }, 60_000);

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
      clearInterval(t);
    };
  }, []);

  // Reflect armed key state; flush once immediately after unlock
  useEffect(() => {
    if (!unlocked && storageReady()) {
      setUnlocked(true);
      // key just became available (e.g., after AppLock) — flush queued metrics
      void flush().catch(() => {});
    }
  }, [unlocked]);

  const lockEnabled = !!localStorage.getItem('lock.hash');

  if (!ready) return null;
  if (!authed) return <AuthScreen />;
  if (lockEnabled && !unlocked) {
    return <AppLock onUnlock={() => setUnlocked(true)} />;
  }
  return children;
}
