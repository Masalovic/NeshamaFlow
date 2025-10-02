
import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { syncHistoryUp } from '../lib/sync'

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    // Hydrate current user email once
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      setUserEmail(data.user?.email ?? null)
    })

    // Subscribe to auth changes and sync when a user appears
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!mounted) return
      const newEmail = session?.user?.email ?? null
      setUserEmail(newEmail)
      if (newEmail) {
        try {
          await syncHistoryUp()
        } catch {
          /* swallow — network/offline is OK */
        }
      }
    })

    // ✅ Cleanup to prevent duplicate listeners
    return () => {
      mounted = false
      sub?.subscription?.unsubscribe()
    }
  }, [])

  async function sendLink() {
    setErr(null)
    setMsg(null)
    if (!email) {
      setErr('Please enter your email.')
      return
    }
    setLoading(true)
    try {
      const emailRedirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/auth` : undefined

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo },
      })

      if (error) throw error
      setMsg('Magic link sent. Check your inbox.')
    } catch (e: any) {
      setErr(e?.message ?? 'Could not send magic link.')
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    setErr(null)
    setMsg(null)
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setUserEmail(null)
    } catch (e: any) {
      setErr(e?.message ?? 'Sign out failed.')
    } finally {
      setLoading(false)
    }
  }

  if (userEmail) {
    return (
      <div className="card">
        <div className="text-sm text-gray-700">
          Signed in as <span className="font-medium">{userEmail}</span>
        </div>
        {msg && <div className="mt-2 text-xs text-green-700">{msg}</div>}
        {err && <div className="mt-2 text-xs text-red-600">{err}</div>}
        <button onClick={signOut} className="btn btn-secondary mt-3" disabled={loading}>
          {loading ? 'Please wait…' : 'Sign out'}
        </button>
      </div>
    )
  }

  return (
    <div className="card">
      <label className="block text-sm mb-2">Email for magic link</label>
      <input
        className="input"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
      />
      {msg && <div className="mt-2 text-xs text-green-700">{msg}</div>}
      {err && <div className="mt-2 text-xs text-red-600">{err}</div>}
      <button onClick={sendLink} disabled={!email || loading} className="btn btn-primary mt-3">
        {loading ? 'Sending…' : 'Send sign-in link'}
      </button>
    </div>
  )
}
