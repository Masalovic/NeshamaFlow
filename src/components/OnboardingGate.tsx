import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isOnboarded } from '../lib/onboarding';

type Props = { children: React.ReactNode };

export default function OnboardingGate({ children }: Props) {
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState<boolean>(true);
  const nav = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await isOnboarded();
      if (!alive) return;
      setDone(ok);
      setReady(true);
      if (!ok && pathname !== '/welcome') {
        nav('/welcome', { replace: true });
      }
    })();
    return () => { alive = false; };
  }, [nav, pathname]);

  if (!ready) return null;
  return <>{children}</>;
}
