// src/pages/RitualSuggestion.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getRitualForMood,
  isMoodKey,
  type Ritual,
  type MoodKey,
} from '../lib/ritualEngine';
import { guideFor, type RitualGuide } from '../lib/ritualGuides';
import Header from '../components/ui/Header';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { getItem as sGet } from '../lib/secureStorage';

export default function RitualSuggestion() {
  const navigate = useNavigate();
  const [ritual, setRitual] = useState<Ritual | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const moodRaw = await sGet<unknown>('mood');
      if (!isMoodKey(moodRaw)) {
        navigate('/log', { replace: true });
        return;
      }
      const mood: MoodKey = moodRaw;
      if (!alive) return;
      setRitual(getRitualForMood(mood));
    })();
    return () => {
      alive = false;
    };
  }, [navigate]);

  // Compute the instructional guide for this ritual
  const guide: RitualGuide = useMemo(() => guideFor(ritual), [ritual]);

  if (!ritual) return null;

  const minutes = Math.max(1, Math.round(ritual.durationSec / 60));

  return (
    <div className="flex flex-col h-full">
      <Header title="Your Ritual" back />
      <main className="flex-1 overflow-y-auto px-4">
        <div className="max-w-[340px] mx-auto">
          <Card>
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-semibold font-heading">{ritual.title}</h2>
              <span className="ml-3 shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-600">
                ~ {minutes} min
              </span>
            </div>

            {/* Tiny preview of why-bullets so users can decide quickly */}
            {ritual.whyBullets?.length ? (
              <ul className="mt-2 text-sm text-gray-600 list-disc pl-5 space-y-1">
                {ritual.whyBullets.slice(0, 2).map((b: string, i: number) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                onClick={() => navigate('/ritual/start')}
                variant="primary"
                className="col-span-2"
              >
                Start Ritual
              </Button>

              {/* Secondary actions open modals */}
              <button
                onClick={() => setStepsOpen(true)}
                className="col-span-1 text-sm text-brand-700 underline"
              >
                See steps
              </button>
              <button
                onClick={() => setWhyOpen(true)}
                className="col-span-1 text-sm text-brand-700 underline text-right"
              >
                Why it works
              </button>
            </div>

            {/* Steps modal */}
            <Modal open={stepsOpen} onClose={() => setStepsOpen(false)} title="How to do it">
              {Array.isArray(guide.steps) && guide.steps.length > 0 ? (
                <ol className="list-decimal pl-5 space-y-1 text-gray-700 text-sm">
                  {guide.steps.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-gray-600">No steps available.</p>
              )}
              {guide.tip && (
                <p className="text-xs text-gray-500 mt-2">{guide.tip}</p>
              )}
            </Modal>

            {/* Why modal */}
            <Modal open={whyOpen} onClose={() => setWhyOpen(false)} title="Why it works">
              <p className="text-sm text-gray-700">{ritual.why}</p>
              {ritual.whyBullets?.length ? (
                <ul className="mt-3 list-disc pl-5 space-y-1 text-gray-600 text-sm">
                  {ritual.whyBullets.map((b: string, i: number) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </Modal>
          </Card>
        </div>
      </main>
    </div>
  );
}
