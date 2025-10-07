// src/components/SmartReminderBanner.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  decide,
  learnPreferredHour,
  markShown,
  markTapped,
  mute,
  isEnabled,
} from '../lib/reminders';

export default function SmartReminderBanner() {
  const [visible, setVisible] = useState(false);
  const [hour, setHour] = useState<number | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      const learned = await learnPreferredHour();
      if (!alive) return;
      setHour(learned);

      const d = await decide();
      if (!alive) return;
      if (d.due) {
        setHour(d.preferredHour ?? learned);
        setVisible(true);
        markShown();
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!visible || !isEnabled()) return null;

  const pretty =
    hour == null ? 'a 2-min reset' : `a 2-min ${timeBlock(hour)} reset`;

  return (
    <section className="card p-4">
      <div className="mb-1 text-sm font-medium text-main">Take a moment?</div>
      <p className="text-sm text-muted">
        How about {pretty}? You haven’t checked in yet today.
      </p>

      <div className="mt-3 flex gap-2">
        <button
          className="btn btn-primary flex-1"
          onClick={() => {
            markTapped();
            nav('/ritual', { replace: false });
          }}
        >
          Start now
        </button>

        <button className="btn btn-secondary" onClick={() => setVisible(false)}>
          Later
        </button>

        <button
          className="btn btn-outline"
          onClick={() => {
            mute(7);
            setVisible(false);
          }}
          title="Mute for 7 days"
        >
          Mute 7d
        </button>
      </div>
    </section>
  );
}

function timeBlock(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}
