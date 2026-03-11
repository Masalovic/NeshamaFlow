import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/ui/Header";
import Button from "../components/ui/Button";
import { loadHistory, type LogItem, type PracticeKind } from "../lib/history";
import { titleForRitualId, type RitualId } from "../lib/ritualEngine";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { tRitualTitle } from "../lib/i18nRitual";
import type { TFunction } from "i18next";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function normalizeKind(x: string | null | undefined): PracticeKind {
  if (x === "meditation" || x === "routine" || x === "ritual") return x;
  return "ritual";
}

function fmtDuration(t: TFunction, sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  if (s < 60) return `${s}${t("ritual:player.secondsShort", "s")}`;
  const m = Math.max(1, Math.round(s / 60));
  return `${m} ${t("common:units.min", "min")}`;
}

function kindLabel(t: TFunction, k: PracticeKind): string {
  if (k === "meditation") return t("practice:kinds.meditation", "Meditation");
  if (k === "routine") return t("practice:kinds.routine", "Routine");
  return t("practice:kinds.ritual", "Ritual");
}

/**
 * Title logic:
 * - Ritual: keep your existing i18n ritual title
 * - Meditation/Routine: minimal safe fallback (no extra deps / mappings)
 *   Later you can swap to proper catalog lookups.
 */
function titleForItem(t: TFunction, item: LogItem, kind: PracticeKind): string {
  if (kind === "ritual") {
    return tRitualTitle(
      t,
      item.ritualId as RitualId,
      titleForRitualId(item.ritualId),
    );
  }
  // minimal + stable
  const base = kindLabel(t, kind);
  return item.ritualId ? `${base} · ${item.ritualId}` : base;
}

function afterCareFor(ritualId: string, t: TFunction): string[] {
  switch (ritualId) {
    case "box-breath-2m":
      return [
        t(
          "ritual:after.boxBreath.1",
          "Take one slower breath and unclench your jaw.",
        ),
        t(
          "ritual:after.boxBreath.2",
          "Soften the next exhale; notice shoulders drop.",
        ),
        t(
          "ritual:after.boxBreath.3",
          "If helpful, do 1–2 quiet cycles later today.",
        ),
      ];
    case "478-pace-2m":
      return [
        t(
          "ritual:after.478.1",
          "If light-headed, breathe normally for a minute.",
        ),
        t("ritual:after.478.2", "Use 4-7-8 at bedtime: 3–4 rounds is plenty."),
        t("ritual:after.478.3", "Sip water and avoid standing up too fast."),
      ];
    case "body-scan-1m":
      return [
        t(
          "ritual:after.bodyScan.1",
          "Roll shoulders once; soften forehead and tongue.",
        ),
        t(
          "ritual:after.bodyScan.2",
          "Note one area to revisit for 30s later today.",
        ),
        t("ritual:after.bodyScan.3", "Take a sip of water and stretch gently."),
      ];
    case "ground-54321":
      return [
        t(
          "ritual:after.ground.1",
          "Pick one tiny next action and do it slowly.",
        ),
        t(
          "ritual:after.ground.2",
          "Open your hands; relax the tongue from the palate.",
        ),
        t(
          "ritual:after.ground.3",
          "If agitation returns, take a slow, longer exhale.",
        ),
      ];
    case "compassion-break":
      return [
        t(
          "ritual:after.compassion.1",
          "Place a hand on your heart and offer one kind phrase.",
        ),
        t(
          "ritual:after.compassion.2",
          "Remember “common humanity”: others feel this too.",
        ),
        t(
          "ritual:after.compassion.3",
          "Write one supportive line you can reuse later.",
        ),
      ];
    case "gratitude-3":
      return [
        t(
          "ritual:after.gratitude.1",
          "Savor one concrete detail for ~10 seconds.",
        ),
        t(
          "ritual:after.gratitude.2",
          "If possible, send a 1-line thank-you message.",
        ),
        t(
          "ritual:after.gratitude.3",
          "Smile softly to help encode the memory.",
        ),
      ];
    default:
      return [
        t(
          "ritual:after.default.1",
          "Take one slower breath and relax your shoulders.",
        ),
        t(
          "ritual:after.default.2",
          "Drink a sip of water (tiny rituals stick better!).",
        ),
        t("ritual:after.default.3", "Optional: jot a 1-line note in History."),
      ];
  }
}

function afterCareForKind(t: TFunction, kind: PracticeKind, id: string): string[] {
  // keep your ritual-specific mapping unchanged
  if (kind === "ritual") return afterCareFor(id, t);

  // minimal (safe) defaults for other kinds
  if (kind === "meditation") {
    return [
      t("meditation:after.1", "Take three slow breaths before jumping back in."),
      t("meditation:after.2", "Notice one small shift (body, mind, or mood)."),
      t("meditation:after.3", "If you can, do a tiny stretch or sip water."),
    ];
  }

  // routine
  return [
    t("routine:after.1", "Lock in the win: choose one tiny next action."),
    t("routine:after.2", "Breathe out longer once; relax shoulders and jaw."),
    t("routine:after.3", "Optional: repeat later today in a shorter version."),
  ];
}

function buildSummary(item: LogItem, t: TFunction, kind: PracticeKind): string {
  const title = titleForItem(t, item, kind);
  const when = dayjs(item.ts).format("MMM D, HH:mm");
  const note = item.note
    ? `\n${t("ritual:done.labels.note", "Note")}: ${item.note}`
    : "";

  return `${t("ritual:done.labels.sessionComplete", "Session complete")} ✅
${t("practice:labels.type", "Type")}: ${kindLabel(t, kind)}
${t("practice:labels.title", "Title")}: ${title}
${t("ritual:done.labels.duration", "Duration")}: ${fmtDuration(
    t,
    item.durationSec ?? 0,
  )}
${t("ritual:done.labels.mood", "Mood")}: ${item.mood}
${t("ritual:done.labels.when", "When")}: ${when}${note}`;
}

export default function RitualDone() {
  const navigate = useNavigate();
  const q = useQuery();
  const kind = normalizeKind(q.get("kind"));
  const id = (q.get("id") ?? "").trim();

  // keep original namespaces + add optional ones (doesn't break if missing)
  const { t } = useTranslation(["ritual", "common", "practice", "meditation", "routine"]);

  const [last, setLast] = useState<LogItem | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await loadHistory();
      if (!alive) return;
      if (!list.length) return setLast(null);

      const filtered = list.filter((x) => (x.kind ?? "ritual") === kind);

      // if caller passed id, prefer that exact session type+id; else newest for that kind
      const best =
        (id ? filtered.find((x) => x.ritualId === id) : null) ??
        filtered.sort((a, b) => (a.ts < b.ts ? 1 : -1))[0] ??
        null;

      setLast(best);
    })();
    return () => {
      alive = false;
    };
  }, [kind, id]);

  const practiceTitle = last ? titleForItem(t, last, kind) : kindLabel(t, kind);
  const tips = afterCareForKind(t, kind, last?.ritualId ?? id);
  const summary = useMemo(
    () => (last ? buildSummary(last, t, kind) : ""),
    [last, t, kind],
  );

  async function copySummary() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = summary;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {}
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  }

  async function shareSummary() {
    if (!summary) return;
    // @ts-ignore
    if (typeof navigator.share === "function") {
      try {
        // @ts-ignore
        await navigator.share({
          title:
            kind === "ritual"
              ? t("ritual:share.title", "My ritual session")
              : t("practice:share.title", "My session"),
          text: summary,
        });
        return;
      } catch {}
    }
    await copySummary();
  }

  const headerTitle =
    kind === "ritual"
      ? t("ritual:done.title", "Ritual done")
      : t("practice:done.title", "Session done");

  const primaryCta =
    kind === "ritual"
      ? t("ritual:done.logAnother", "Log another")
      : t("practice:done.backToFlows", "Back to flows");

  function onPrimary() {
    if (kind === "ritual") navigate("/log", { replace: true });
    else navigate("/flows", { replace: true });
  }

  return (
    <div className="flex h-full flex-col">
      <Header title={headerTitle} back />
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[420px] mx-auto">
          <div className="card p-6 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-[var(--accent-100)] flex items-center justify-center text-2xl">
              ✅
            </div>

            <h2 className="text-lg font-semibold text-main">
              {t("ritual:done.sessionComplete", "Session complete")}
            </h2>

            <p className="mt-1 text-sm text-muted">
              {last ? (
                <span
                  dangerouslySetInnerHTML={{
                    __html: t("ritual:done.logged", {
                      defaultValue:
                        "Logged <strong>{{duration}}</strong> — {{ritualTitle}}.",
                      duration: fmtDuration(t, last.durationSec),
                      ritualTitle: practiceTitle,
                    }),
                  }}
                />
              ) : (
                t("ritual:done.saved", "Saved.")
              )}
            </p>

            {last && (
              <div className="mt-4 text-left">
                <div className="text-sm font-semibold text-main text-center">
                  {t("ritual:done.summary", "Summary")}
                </div>
                <div className="mt-2 rounded-xl bg-[var(--surface-2)] border border-token p-3 text-sm text-main/90 whitespace-pre-wrap">
                  {summary}
                </div>
              </div>
            )}

            <div className="mt-4 text-left">
              <div className="text-sm font-semibold text-main text-center">
                {t("ritual:done.afterCare", "After-care")}
              </div>
              <ul className="mt-2 list-disc pl-5 text-sm text-main/90 space-y-1">
                {tips.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button className="w-full" variant="primary" onClick={onPrimary}>
                {primaryCta}
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => navigate("/history")}
              >
                {t("ritual:done.seeHistory", "See history")}
              </Button>
            </div>

            {last && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={shareSummary}
                >
                  {t("ritual:done.share", "Share")}
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={copySummary}
                >
                  {copied
                    ? t("ritual:done.copied", "Copied!")
                    : t("ritual:done.copy", "Copy")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}