// src/screens/AuthScreen.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next";
import Button from "../components/ui/Button";

export default function AuthScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation(["auth", "common"]);

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [stay, setStay] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If a previous session exists, bounce to the app.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate("/log", { replace: true });
    })();
  }, [navigate]);

  const emailRedirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth`
      : undefined;

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
      if (!email || !pw)
        throw new Error(
          t("auth:errors.required", "Email and password are required.")
        );
      if (pw.length < 6)
        throw new Error(
          t("auth:errors.pwMin", "Password must be at least 6 characters.")
        );

      // Persist "stay signed in" preference (read elsewhere on boot)
      localStorage.setItem("neshama.noStay", stay ? "0" : "1");

      const { data, error } = await supabase.auth.signUp({
        email,
        password: pw,
        options: { emailRedirectTo },
      });
      if (error) throw error;

      // If Confirm Email is OFF, Supabase returns a session right away.
      if (data.session) {
        navigate("/log", { replace: true });
        return;
      }
      setMsg(
        t(
          "auth:signup.checkEmail",
          "Account created. Check your email to confirm your address."
        )
      );
    } catch (e: any) {
      setErr(e?.message ?? t("auth:errors.signup", "Sign up failed."));
    } finally {
      setLoading(false);
    }
  }

  async function signIn() {
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      if (!email || !pw)
        throw new Error(
          t("auth:errors.required", "Email and password are required.")
        );

      localStorage.setItem("neshama.noStay", stay ? "0" : "1");

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pw,
      });
      if (error) {
        setErr(error.message || t("auth:errors.invalid", "Invalid login."));
        return;
      }
      navigate("/log", { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? t("auth:errors.signin", "Sign in failed."));
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmation() {
    setErr(null);
    setMsg(null);
    try {
      if (!email)
        throw new Error(
          t("auth:errors.enterEmail", "Enter your email above first.")
        );
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      } as any);
      if (error) throw error;
      setMsg(
        t("auth:signup.resent", "Confirmation email sent. Check your inbox.")
      );
    } catch (e: any) {
      setErr(
        e?.message ?? t("auth:errors.resend", "Could not resend confirmation.")
      );
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm card p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-main">
            {t("auth:title", "Welcome")}
          </h1>
          <p className="text-sm text-muted">
            {t("auth:subtitle", "Sign in or create an account")}
          </p>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm text-dim mb-1">
            {t("auth:fields.email", "Email")}
          </label>
          <input
            className="input w-full h-10"
            placeholder={t("auth:fields.email", "Email")}
            autoComplete="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            aria-label={t("auth:fields.email", "Email")}
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm text-dim mb-1">
            {t("auth:fields.password", "Password")}
          </label>
          <input
            type="password"
            className="input w-full h-10"
            placeholder={t("auth:fields.password", "Password")}
            autoComplete="current-password"
            value={pw}
            onChange={(e) => onPwChange(e.target.value)}
            aria-label={t("auth:fields.password", "Password")}
          />
        </div>

        {/* Stay signed in */}
        <label className="flex items-center gap-2 text-sm text-dim">
          <input
            type="checkbox"
            checked={stay}
            onChange={(e) => setStay(e.target.checked)}
            aria-label={t("auth:stay", "Stay signed in on this device")}
            className="h-4 w-4"
          />
          {t("auth:stay", "Stay signed in on this device")}
        </label>

        {/* Messages */}
        {err && (
          <div role="alert" className="text-sm text-main">
            {err}
          </div>
        )}
        {msg && <div className="text-sm text-main">{msg}</div>}

        {/* Actions */}
        <Button
          onClick={signIn}
          disabled={loading}
          variant="primary"
          className="btn-full"
          aria-label={
            loading
              ? t("common:pleaseWait", "Please wait…")
              : t("auth:actions.signIn", "Sign In")
          }
        >
          {loading
            ? t("common:pleaseWait", "Please wait…")
            : t("auth:actions.signIn", "Sign In")}
        </Button>

        <Button
          onClick={signUp}
          disabled={loading}
          variant="outline"
          className="btn-full"
        >
          {loading
            ? t("common:pleaseWait", "Please wait…")
            : t("auth:actions.create", "Create Account")}
        </Button>

        <button
          onClick={resendConfirmation}
          className="block text-center mx-auto text-sm text-accent hover:underline"
        >
          {t("auth:actions.resend", "Resend confirmation email")}
        </button>
      </div>
    </div>
  );
}
