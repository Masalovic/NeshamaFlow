import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  decide,
  learnPreferredHour,
  markShown,
  markTapped,
  mute,
  isEnabled,
} from "../lib/reminders";
import { useTranslation } from "react-i18next";

function timeBlock(hour: number): "morning" | "afternoon" | "evening" | "night" {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

export default function SmartReminderBanner() {
  const { t } = useTranslation(["common"]);
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
    return () => {
      alive = false;
    };
  }, []);

  if (!visible || !isEnabled()) return null;

  const pretty =
    hour == null
      ? t("common:smartReminder.prettyReset", "2-min reset")
      : t("common:smartReminder.prettyBlock", "2-min {{block}} reset", {
          block: t(
            `common:smartReminder.blocks.${timeBlock(hour)}`,
            timeBlock(hour)
          ),
        });

  return (
    <section className="card p-4">
      <div className="mb-1 text-sm font-medium text-main">
        {t("common:smartReminder.title", "Take a moment?")}
      </div>

      <p className="text-sm text-muted">
        {t(
          "common:smartReminder.body",
          "How about {{pretty}}? You haven’t checked in yet today.",
          { pretty }
        )}
      </p>

      <div className="mt-3 flex gap-2">
        <button
          className="btn btn-primary flex-1"
          onClick={() => {
            markTapped();
            nav("/ritual", { replace: false });
          }}
        >
          {t("common:buttons.startNow", "Start now")}
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => setVisible(false)}
        >
          {t("common:buttons.later", "Later")}
        </button>

        <button
          className="btn btn-outline"
          onClick={() => {
            mute(7);
            setVisible(false);
          }}
          title={t("common:buttons.mute7d", "Mute 7d")}
        >
          {t("common:buttons.mute7d", "Mute 7d")}
        </button>
      </div>
    </section>
  );
}
