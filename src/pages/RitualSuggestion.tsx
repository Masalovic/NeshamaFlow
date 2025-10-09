import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  getRitualForMood,
  isMoodKey,
  type Ritual,
  type MoodKey,
} from "../lib/ritualEngine";
import { guideFor, type RitualGuide } from "../lib/ritualGuides";
import Header from "../components/ui/Header";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";
import { getItem as sGet } from "../lib/secureStorage";
import { track } from "../lib/metrics";
import { useTranslation } from "react-i18next";

export default function RitualSuggestion() {
  const navigate = useNavigate();
  const { t } = useTranslation(["ritual", "common"]);
  const [ritual, setRitual] = useState<Ritual | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const moodRaw = await sGet<unknown>("mood");
      if (!isMoodKey(moodRaw)) {
        navigate("/log", { replace: true });
        return;
      }
      const mood: MoodKey = moodRaw;
      if (!alive) return;
      setRitual(getRitualForMood(mood));
    })();
    return () => { alive = false; };
  }, [navigate]);

  const guide: RitualGuide | null = useMemo(
    () => (ritual ? guideFor(ritual) : null),
    [ritual]
  );

  if (!ritual) return null;
  const minutes = Math.max(1, Math.round((ritual.durationSec ?? 0) / 60));

  return (
    <div className="flex flex-col h-full">
      <Header title={t("ritual:suggestion.title", "Your Ritual")} back />
      <main className="flex-1 overflow-y-auto px-4">
        <div className="max-w-[340px] mx-auto">
          <Card>
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-semibold font-heading">
                {ritual.title}
              </h2>
              {!!ritual.durationSec && (
                <span className="ml-3 shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-600">
                  ~ {minutes} {t('common:units.min', 'min')}
                </span>
              )}
            </div>

            {ritual.whyBullets?.length ? (
              <ul className="mt-2 text-sm text-gray-600 list-disc pl-5 space-y-1">
                {ritual.whyBullets.slice(0, 2).map((b: string, i: number) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link to="/ritual/start" className="btn btn-primary col-span-2 text-center">
                {t("ritual:actions.startRitual", "Start Ritual")}
              </Link>

              <button
                onClick={() => {
                  setStepsOpen(true);
                  track("suggestion_steps_opened", { ritualId: ritual.id });
                }}
                className="col-span-1 text-sm link-accent"
              >
                {t("ritual:actions.seeSteps", "See steps")}
              </button>
              <button
                onClick={() => {
                  setWhyOpen(true);
                  track("suggestion_why_opened", { ritualId: ritual.id });
                }}
                className="col-span-1 text-sm link-accent text-right"
              >
                {t("ritual:actions.whyWorks", "Why it works")}
              </button>
            </div>

            <div className="mt-3 text-center">
              <Link to="/rituals" className="text-sm link-accent">
                {t("ritual:actions.browse", "Browse rituals")}
              </Link>
            </div>

            {/* Steps modal */}
            <Modal open={stepsOpen} onClose={() => setStepsOpen(false)} title={t("ritual:modals.how", "How to do it")}>
              {guide?.steps?.length ? (
                <ol className="list-decimal pl-5 space-y-1 text-gray-700 text-sm">
                  {guide.steps.map((s: string, i: number) => (<li key={i}>{s}</li>))}
                </ol>
              ) : (
                <p className="text-sm text-gray-600">{t("ritual:modals.noSteps", "No steps available.")}</p>
              )}
              {guide?.tip && (
                <p className="text-xs text-gray-500 mt-2">{guide.tip}</p>
              )}
            </Modal>

            {/* Why modal */}
            <Modal open={whyOpen} onClose={() => setWhyOpen(false)} title={t("ritual:modals.why", "Why it works")}>
              {ritual.why ? <p className="text-sm text-gray-700">{ritual.why}</p> : null}
              {ritual.whyBullets?.length ? (
                <ul className="mt-3 list-disc pl-5 space-y-1 text-gray-600 text-sm">
                  {ritual.whyBullets.map((b: string, i: number) => (<li key={i}>{b}</li>))}
                </ul>
              ) : null}
            </Modal>
          </Card>
        </div>
      </main>
    </div>
  );
}
