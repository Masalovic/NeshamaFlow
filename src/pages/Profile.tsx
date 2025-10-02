import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/ui/Header';
import { supabase } from '../lib/supabase';

const AVATARS = [
  'bird',
  'branch',
  'bush',
  'cactus',
  'deer',
  'flamingo',
  'leaves',
  'mountain',
  'pcactus',
  'pineapple',
] as const;

type AvatarKey = typeof AVATARS[number];

function normalizeUsername(v: string) {
  const x = v.trim().replace(/^@+/, '').toLowerCase();
  return x || null;
}

function isAvatarKey(x: unknown): x is AvatarKey {
  return typeof x === 'string' && (AVATARS as readonly string[]).includes(x);
}

export default function Profile() {
  const navigate = useNavigate();

  // profile state
  const [email, setEmail] = useState('');
  const [display, setDisplay] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState<AvatarKey>('bird');
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        setMsg(userErr.message);
        return;
      }
      if (!user) return;

      setEmail(user.email ?? '');

      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        setMsg(error.message);
        return;
      }
      if (data) {
        setDisplay(data.display_name ?? '');
        setUsername(data.username ?? '');
        setAvatar(isAvatarKey(data.avatar_key) ? (data.avatar_key as AvatarKey) : 'bird');
      }
    })();
  }, []);

  async function saveProfile() {
    setMsg(null);
    setSaving(true);

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      setMsg(userErr.message);
      setSaving(false);
      return;
    }
    if (!user) {
      setSaving(false);
      return;
    }

    // Ensure avatar matches DB CHECK constraint
    const avatar_key: AvatarKey = isAvatarKey(avatar) ? avatar : 'bird';

    const payload = {
      user_id: user.id,
      display_name: display || null,
      username: normalizeUsername(username), // unique constraint friendly
      avatar_key,                            // must be one of the 10 allowed
    };

    const { error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      // Friendly messages for common constraint errors
      if ((error as any).code === '23505') {
        setMsg('That username is already taken.');
      } else if ((error as any).code === '23514') {
        setMsg('Avatar selection is not allowed by server policy.');
      } else {
        setMsg(error.message);
      }
      setSaving(false);
      return;
    }

    setMsg('Profile saved!');
    setSaving(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/auth', { replace: true });
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Profile" back />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-md mx-auto space-y-8">

          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            <img
              src={`/avatars/${avatar}.svg`}
              alt={avatar}
              className="h-16 w-16 rounded-xl border mb-0"
            />
            <div>
              <div className="text-sm text-slate-500">Signed in as</div>
              <div className="text-sm font-medium">{email}</div>
            </div>
          </div>

          {/* Profile form */}
          <section className="rounded-2xl border bg-white p-4 space-y-3">
            <label className="block text-sm">Display name</label>
            <input
              className="w-full border rounded-xl px-3 py-2"
              value={display}
              onChange={(e) => setDisplay(e.target.value)}
              placeholder="Your name"
            />

            <label className="block text-sm mt-3">Username</label>
            <input
              className="w-full border rounded-xl px-3 py-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
            />

            <label className="block text-sm mt-3">Choose avatar</label>
            <div className="grid grid-cols-5 gap-3">
              {AVATARS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setAvatar(k)}
                  className={`rounded-xl border p-2 grid place-items-center hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    avatar === k ? 'ring-2 ring-indigo-500' : ''
                  }`}
                  aria-label={`Choose ${k} avatar`}
                >
                  <img src={`/avatars/${k}.svg`} alt={k} className="h-12 w-12" />
                </button>
              ))}
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="w-full rounded-xl py-2 border mt-4 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
            {msg && <div className="text-sm mt-2">{msg}</div>}
          </section>

          {/* Account actions */}
          <section className="rounded-2xl border bg-white p-4 space-y-3">
            <div className="text-sm font-medium">Account</div>
            <p className="text-sm text-gray-600">Sign out on this device.</p>
            <button
              onClick={signOut}
              className="w-full rounded-xl py-2 border mt-2"
            >
              Sign out
            </button>
          </section>

        </div>
      </main>
    </div>
  );
}
