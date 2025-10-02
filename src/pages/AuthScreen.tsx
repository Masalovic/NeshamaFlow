
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [stay, setStay] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If a previous session exists, bounce to the app.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate('/log', { replace: true });
    })();
  }, [navigate]);

  const emailRedirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/auth` : undefined;

  function onEmailChange(v: string) {
    setEmail(v);
    if (err) setErr(null);
    if (msg) setMsg(null);
  }
  function onPwChange(v: string) {
    setPw(v);
    if (err) setErr(null);
    if (msg) setMsg(null);
  }

  async function signUp() {
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      if (!email || !pw) throw new Error('Email and password are required.');
      if (pw.length < 6) throw new Error('Password must be at least 6 characters.');

      // Persist "stay signed in" preference (enforced at app boot in Protected.tsx)
      localStorage.setItem('neshama.noStay', stay ? '0' : '1');

      const { data, error } = await supabase.auth.signUp({
        email,
        password: pw,
        options: { emailRedirectTo },
      });
      if (error) throw error;

      // If Confirm Email is OFF, Supabase returns a session right away.
      if (data.session) {
        navigate('/log', { replace: true });
        return;
      }

      // If Confirm Email is ON, no session yet.
      setMsg('Account created. Check your email to confirm your address.');
    } catch (e: any) {
      setErr(e?.message ?? 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  }

  async function signIn() {
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      if (!email || !pw) throw new Error('Email and password are required.');

      localStorage.setItem('neshama.noStay', stay ? '0' : '1');

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pw,
      });

      if (error) {
        // Show the real message; don't assume confirmation is required.
        setErr(error.message || 'Invalid login.');
        return;
      }

      // Protected routes will render, but we can navigate eagerly.
      navigate('/log', { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmation() {
    setErr(null);
    setMsg(null);
    try {
      if (!email) throw new Error('Enter your email above first.');
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      setMsg('Confirmation email sent. Check your inbox.');
    } catch (e: any) {
      setErr(e?.message ?? 'Could not resend confirmation.');
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm rounded-2xl shadow-lg p-6 bg-white">
        <h1 className="text-xl font-semibold">Welcome</h1>
        <p className="text-sm text-slate-500 mb-4">Sign in or create an account</p>

        <input
          className="w-full border rounded-xl px-3 py-2 mb-3"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={e => onEmailChange(e.target.value)}
        />
        <input
          type="password"
          className="w-full border rounded-xl px-3 py-2 mb-2"
          placeholder="Password"
          autoComplete="current-password"
          value={pw}
          onChange={e => onPwChange(e.target.value)}
        />

        <label className="flex items-center gap-2 text-sm mb-3">
          <input
            type="checkbox"
            checked={stay}
            onChange={e => setStay(e.target.checked)}
          />
          Stay signed in on this device
        </label>

        {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
        {msg && <div className="text-sm text-green-700 mb-2">{msg}</div>}

        <button
          onClick={signIn}
          disabled={loading}
          className="w-full rounded-xl py-2 bg-black text-white disabled:opacity-60"
        >
          {loading ? 'Please wait…' : 'Sign In'}
        </button>

        <button
          onClick={signUp}
          disabled={loading}
          className="w-full rounded-xl py-2 mt-2 border disabled:opacity-60"
        >
          {loading ? 'Please wait…' : 'Create Account'}
        </button>

        <button
          onClick={resendConfirmation}
          className="w-full rounded-xl py-2 mt-2 text-sm text-indigo-600 underline"
        >
          Resend confirmation email
        </button>
      </div>
    </div>
  );
}
