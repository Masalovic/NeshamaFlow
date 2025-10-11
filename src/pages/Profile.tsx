import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/ui/Header';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

const AVATARS = [
  'bird','branch','bush','cactus','deer','flamingo','leaves','mountain','pcactus','pineapple',
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
  const { t } = useTranslation(['profile', 'common']);

  const [email, setEmail]       = useState('');
  const [display, setDisplay]   = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar]     = useState<AvatarKey>('bird');
  const [msg, setMsg]           = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) { setMsg(userErr.message); return; }
      if (!user) return;

      setEmail(user.email ?? '');

      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) { setMsg(error.message); return; }
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
    if (userErr) { setMsg(userErr.message); setSaving(false); return; }
    if (!user) { setSaving(false); return; }

    const payload = {
      user_id: user.id,
      display_name: display || null,
      username: normalizeUsername(username),
      avatar_key: isAvatarKey(avatar) ? avatar : 'bird',
    };

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' });

    if (error) {
      if ((error as any).code === '23505')      setMsg(t('profile:errors.usernameTaken', 'That username is already taken.'));
      else if ((error as any).code === '23514') setMsg(t('profile:errors.avatarPolicy', 'Avatar selection is not allowed by server policy.'));
      else                                      setMsg(error.message);
      setSaving(false);
      return;
    }

    setMsg(t('profile:saved', 'Profile saved!'));
    setSaving(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/auth', { replace: true });
  }

  return (
    <div className="flex flex-col h-full bg-app">
      <Header title={t('profile:title', 'Profile')} back />

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-md mx-auto space-y-8">

          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            <img
              src={`/avatars/${avatar}.svg`}
              alt={avatar}
              className="h-16 w-16 rounded-xl border border-token mb-0 bg-white"
            />
            <div>
              <div className="text-sm text-muted">{t('profile:signedInAs', 'Signed in as')}</div>
              <div className="text-sm font-medium text-main">{email}</div>
            </div>
          </div>

          {/* Profile form */}
          <section className="rounded-2xl border border-token bg-surface-1 p-4 space-y-3 shadow-soft">
            <label className="block text-sm text-dim">{t('profile:displayName', 'Display name')}</label>
            <input
              className="input w-full h-10"
              value={display}
              onChange={(e) => setDisplay(e.target.value)}
              placeholder={t('profile:placeholders.name', 'Your name')}
              aria-label={t('profile:displayName', 'Display name')}
            />

            <label className="block text-sm mt-3 text-dim">{t('profile:username', 'Username')}</label>
            <input
              className="input w-full h-10"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('profile:placeholders.username', '@username')}
              aria-label={t('profile:username', 'Username')}
            />

            <label className="block text-sm mt-3 text-dim">{t('profile:chooseAvatar', 'Choose avatar')}</label>
            <div className="grid grid-cols-5 gap-3">
              {AVATARS.map((k) => {
                const selected = avatar === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setAvatar(k)}
                    className={[
                      'rounded-xl border border-token p-2 grid place-items-center bg-surface-2',
                      'hover:bg-[var(--hover)] focus:outline-none',
                      selected ? 'ring-2 ring-[var(--ring)]' : '',
                    ].join(' ')}
                    aria-label={t('profile:a11y.chooseAvatarWithName', { defaultValue: 'Choose {{name}} avatar', name: k })}
                  >
                    <img src={`/avatars/${k}.svg`} alt={k} className="h-12 w-12" />
                  </button>
                );
              })}
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="btn btn-primary w-full mt-4 disabled:opacity-60"
            >
              {saving ? t('common:saving', 'Saving…') : t('profile:save', 'Save profile')}
            </button>
            {msg && <div className="text-sm mt-2 text-main">{msg}</div>}
          </section>

          {/* Account actions */}
          <section className="rounded-2xl border border-token bg-surface-1 p-4 space-y-3 shadow-soft">
            <div className="text-sm font-medium text-main">{t('profile:account.title', 'Account')}</div>
            <p className="text-sm text-dim">{t('profile:account.signOutDesc', 'Sign out on this device.')}</p>
            <button
              onClick={signOut}
              className="btn btn-primary w-full mt-2"
            >
              {t('profile:account.signOut', 'Sign out')}
            </button>
          </section>

        </div>
      </main>
    </div>
  );
}
