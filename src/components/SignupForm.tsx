import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { syncHistoryUp } from '../lib/sync'

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const newEmail = session?.user?.email ?? null
      setUserEmail(newEmail)
      if (newEmail) await syncHistoryUp().catch(() => {})
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function sendLink() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    setLoading(false)
    alert(error ? error.message : 'Check your email for the sign-in link.')
  }

  async function signOut() { await supabase.auth.signOut() }

  if (userEmail) {
    return (
      <div className="card">
        <div className="text-sm">Signed in as <b>{userEmail}</b></div>
        <button onClick={signOut} className="btn btn-secondary mt-3">Sign out</button>
      </div>
    )
  }

  return (
    <div className="card">
      <label className="block text-sm mb-2">Email for magic link</label>
      <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
      <button onClick={sendLink} disabled={!email || loading} className="btn btn-primary mt-3">
        {loading ? 'Sending…' : 'Send sign‑in link'}
      </button>
    </div>
  )
}
