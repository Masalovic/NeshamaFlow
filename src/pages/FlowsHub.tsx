import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { tMedGuide } from "../lib/i18nMeditation";
import Header from "../components/ui/Header";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import ChipScroller from "../components/ChipScroller";
import { Search } from "lucide-react";

import {
  ALL_RITUALS,
  titleForRitualId,
  type RitualId,
} from "../lib/ritualEngine";
import { guideFor } from "../lib/ritualGuides";
import { setItem as sSet } from "../lib/secureStorage";
import { track } from "../lib/metrics";
import { useDebounce } from "../hooks/useDebounce";
import { useTranslation } from "react-i18next";
import { tRitualTitle, tGuide } from "../lib/i18nRitual";
import { BUILT_IN_ROUTINES, type RoutineDef } from "../lib/routines";

/* ---------------- helpers: normalization + display ---------------- */

function normTag(s: string) {
  return s.trim().toLowerCase();
}

function titleCase(s: string) {
  return s.replace(
    /\w\S*/g,
    (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()
  );
}

/** Use i18n label if present (keeps author’s casing), otherwise Title Case */
function tagLabel(t: (k: string, d?: any) => string, key: string) {
  const translated = t(`library:tags.${key}`, key); // defaultValue = key
  return translated === key ? titleCase(key) : translated;
}

/* ---------------- meditations catalog ---------------- */

type Med = {
  id: string;
  titleKey: string;
  descKey?: string;
  durSec: number;
  tags?: string[];
};

const MEDITATIONS: Med[] = [
  {
    id: "breath-awareness",
    titleKey: "meditation:titles.breath-awareness",
    descKey: "meditation:descriptions.breath-awareness",
    durSec: 300,
    tags: ["breath", "focus", "calm"],
  },
  {
    id: "loving-kindness",
    titleKey: "meditation:titles.loving-kindness",
    descKey: "meditation:descriptions.loving-kindness",
    durSec: 420,
    tags: ["kindness", "compassion", "connection"],
  },
  {
    id: "focus-candle",
    titleKey: "meditation:titles.focus-candle",
    descKey: "meditation:descriptions.focus-candle",
    durSec: 240,
    tags: ["focus", "single-pointed", "visual"],
  },
  {
    id: "body-scan-5m",
    titleKey: "meditation:titles.body-scan-5m",
    descKey: "meditation:descriptions.body-scan-5m",
    durSec: 300,
    tags: ["interoception", "awareness", "calm"],
  },
  {
    id: "open-monitoring",
    titleKey: "meditation:titles.open-monitoring",
    descKey: "meditation:descriptions.open-monitoring",
    durSec: 360,
    tags: ["awareness", "nonreactivity", "stress"],
  },
  {
    id: "noting",
    titleKey: "meditation:titles.noting",
    descKey: "meditation:descriptions.noting",
    durSec: 300,
    tags: ["attention", "metacognition", "rumination"],
  },
  {
    id: "pmr-6m",
    titleKey: "meditation:titles.pmr-6m",
    descKey: "meditation:descriptions.pmr-6m",
    durSec: 360,
    tags: ["relaxation", "sleep", "somatic"],
  },
  {
    id: "safe-place-imagery",
    titleKey: "meditation:titles.safe-place-imagery",
    descKey: "meditation:descriptions.safe-place-imagery",
    durSec: 300,
    tags: ["anxiety", "trauma-informed", "imagery"],
  },
];

type Kind = "ritual" | "meditation" | "routine";
type Tab = "all" | Kind;

/* ---------------- union used in the UI ---------------- */

type RoutineStep = {
  id?: string;
  title?: string;
  summary?: string;
  description?: string;
  durationSec?: number;
};

type FlowItem =
  | {
    kind: "ritual";
    id: RitualId;
    title: string;
    durSec: number;
    tags: string[];
  }
  | {
    kind: "meditation";
    id: string;
    title: string;
    durSec: number;
    tags: string[];
    desc?: string;
  }
  | {
    kind: "routine";
    id: string;
    title: string;
    parts: number;
    when: string;
    tags: string[];
    steps?: RoutineStep[];
    intent?: string;
  };

/* ---------------- build unified catalog ---------------- */

function useUnifiedCatalog(t: ReturnType<typeof useTranslation>["t"]) {
  const ritualItems: FlowItem[] = ALL_RITUALS.map((r) => ({
    kind: "ritual",
    id: r.id as RitualId,
    title: tRitualTitle(t, r.id as RitualId, titleForRitualId(r.id)),
    durSec: r.durationSec,
    tags: (((r as any).tags ?? []) as string[]).map(normTag),
  }));

  const meditationItems: FlowItem[] = MEDITATIONS.map((m) => ({
    kind: "meditation",
    id: m.id,
    title: t(m.titleKey),
    durSec: m.durSec,
    tags: (m.tags ?? []).map(normTag),
    desc: m.descKey ? t(m.descKey) : undefined,
  }));

  // ✅ derive parts from steps.length
  const routineItems: FlowItem[] = BUILT_IN_ROUTINES.map((r: RoutineDef) => {
    const steps = Array.isArray((r as any).steps)
      ? ((r as any).steps as RoutineStep[])
      : [];
    return {
      kind: "routine" as const,
      id: r.id,
      title: r.title,
      parts: steps.length, // <- we show count in list
      when: r.when,
      tags: [normTag(r.when), "routine"],
      steps,
      // some routines might ship an "intent" later
      intent: (r as any).intent,
    };
  });

  return { ritualItems, meditationItems, routineItems };
}

/* ---------------- component ---------------- */

export default function FlowsHub() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation([
    "library",
    "common",
    "ritual",
    "meditation",
  ]);
  const [detail, setDetail] = useState<{ kind: Kind; id: string } | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const q = useDebounce(query, 150);

  // tag state + modal
  const [tag, setTag] = useState<string>("all");
  const [tagModalOpen, setTagModalOpen] = useState(false);

  useEffect(() => {
    track("library_opened");
  }, []);

  const { ritualItems, meditationItems, routineItems } = useMemo(
    () => useUnifiedCatalog(t),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i18n.language]
  );

  // collect normalized tags
  const allTags = useMemo(() => {
    const s = new Set<string>();
    ritualItems.forEach((r) => r.tags.forEach((tg) => s.add(normTag(tg))));
    meditationItems.forEach((m) => m.tags.forEach((tg) => s.add(normTag(tg))));
    routineItems.forEach((r) => r.tags.forEach((tg) => s.add(normTag(tg))));
    return Array.from(s).sort();
  }, [ritualItems, meditationItems, routineItems]);

  const topTags = useMemo(() => {
    const base = allTags.slice(0, 7);
    return tag !== "all" && !base.includes(tag)
      ? [tag, ...base.slice(0, 6)]
      : base;
  }, [allTags, tag]);

  const list: FlowItem[] = useMemo(() => {
    const merged: FlowItem[] = [
      ...ritualItems,
      ...meditationItems,
      ...routineItems,
    ];
    const qq = q.trim().toLowerCase();
    return merged.filter((it) => {
      if (tab !== "all" && it.kind !== tab) return false;
      const name = ("title" in it ? it.title : "").toLowerCase();
      const tags = ("tags" in it ? it.tags : []) as string[];
      const matchesQ =
        !qq || name.includes(qq) || tags.some((tg) => tg.includes(qq));
      const matchesTag = tag === "all" || tags.includes(tag);
      return matchesQ && matchesTag;
    });
  }, [ritualItems, meditationItems, routineItems, q, tag, tab]);

  async function startRitual(id: RitualId) {
    track("library_start_clicked", { kind: "ritual", id });
    await sSet("draft.ritual", id);
    navigate("/ritual/start");
  }
  function startMeditation(id: string) {
    track("library_start_clicked", { kind: "meditation", id });
    navigate(`/meditations?id=${encodeURIComponent(id)}`);
  }
  function startRoutine(id: string) {
    track("library_start_clicked", { kind: "routine", id });
    navigate(`/routines/${encodeURIComponent(id)}`);
  }
  function openDetails(kind: Kind, id: string) {
    setDetail({ kind, id });
    track("library_detail_viewed", { kind, id });
  }

  function renderCard(it: FlowItem) {
    return (
      <Card key={`${it.kind}:${it.id}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-main truncate">{it.title}</div>

            {"durSec" in it && it.durSec ? (
              <div className="text-xs text-muted">
                ~ {Math.max(1, Math.round(it.durSec / 60))}{" "}
                {t("common:units.min", "min")}
              </div>
            ) : null}
            {"parts" in it ? (
              <div className="text-xs text-muted">
                {it.parts} {t("library:stepsLabel", "steps")}
              </div>
            ) : null}

            {"tags" in it && it.tags?.length ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {it.tags.slice(0, 4).map((tg) => (
                  <span
                    key={tg}
                    className="text-[11px] px-2 py-0.5 rounded-full border"
                    style={{
                      background: "var(--surface-2)",
                      borderColor: "var(--border)",
                      color: "var(--text-dim)",
                    }}
                  >
                    {tagLabel(t, tg)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {it.kind === "ritual" ? (
            <Button variant="primary" onClick={() => startRitual(it.id)}>
              {t("library:start", "Start")}
            </Button>
          ) : it.kind === "meditation" ? (
            <Button variant="primary" onClick={() => startMeditation(it.id)}>
              {t("library:start", "Start")}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => startRoutine(it.id)}>
              {t("library:start", "Start")}
            </Button>
          )}
        </div>

        <button
          className="btn btn-outline h-8 px-3 mt-3 text-sm"
          onClick={() => openDetails(it.kind, it.id)}
        >
          {t("library:details", "Details")}
        </button>
      </Card>
    );
  }

  const modalTitle = detail
    ? detail.kind === "ritual"
      ? tRitualTitle(t, detail.id as RitualId, titleForRitualId(detail.id))
      : detail.kind === "meditation"
        ? t(`meditation:titles.${detail.id}`, detail.id)
        : BUILT_IN_ROUTINES.find((x) => x.id === detail.id)?.title ?? ""
    : "";

  return (
    <div className="flex h-full flex-col">
      <Header title={t("common:nav.flows", "Flows")} back />

      <main className="flex-1 overflow-y-auto">
        {/* Sticky compact filter bar */}
        <div className="sticky top-0 z-10 border-b border-token">
          <div className="mx-auto w-full max-w-[560px] px-4 py-2 space-y-2">
            {/* Search row (compact) */}
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <Search size={16} className="opacity-70" aria-hidden />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("library:searchPlaceholder", "Search…")}
                className="input w-full text-sm h-10"
                autoCorrect="off"
                autoCapitalize="none"
                aria-label={t("library:searchPlaceholder", "Search…")}
                style={
                  {
                    ["--input-pl" as any]: "2.5rem",
                    ["--input-pr" as any]: "2.5rem",
                    ["--input-py" as any]: "10px",
                  } as React.CSSProperties
                }
              />
              {query && (
                <button
                  className="absolute inset-y-0 right-3 my-auto text-muted hover:text-main"
                  onClick={() => setQuery("")}
                  aria-label={t("common:clear", "Clear")}
                  title={t("common:clear", "Clear")}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Kind chips */}
            <ChipScroller
              options={[
                { key: "all", label: t("library:chips.all", "All") },
                { key: "ritual", label: t("library:kind.ritual", "Rituals") },
                {
                  key: "meditation",
                  label: t("library:kind.meditation", "Meditations"),
                },
                {
                  key: "routine",
                  label: t("library:kind.routine", "Routines"),
                },
              ]}
              value={tab}
              onChange={(v) => setTab(v as Tab)}
              ariaLabel="Kinds"
            />

            {/* Tag chips */}
            <ChipScroller
              options={
                [
                  { key: "all", label: t("library:chips.all", "All") } as const,
                  ...topTags.map((tg) => ({
                    key: tg,
                    label: tagLabel(t, tg),
                  })),
                ] as any
              }
              value={tag as any}
              onChange={(v) => setTag(v as string)}
              ariaLabel="Tags"
              moreChip={
                allTags.length > topTags.length ? (
                  <button
                    className="chip h-8 px-3 py-1.5"
                    onClick={() => setTagModalOpen(true)}
                    title={t("library:moreFilters", "More")}
                  >
                    {t("library:moreFilters", "More")}
                  </button>
                ) : null
              }
            />
          </div>
        </div>

        {/* Results */}
        <div className="mx-auto w-full max-w-[560px] p-4">
          {!list.length ? (
            <div className="card p-6 text-sm text-dim">
              {t(
                "library:noMatches",
                "No matches. Try a different search or filter."
              )}
            </div>
          ) : (
            <div className="space-y-3">{list.map((it) => renderCard(it))}</div>
          )}
        </div>
      </main>

      {/* Details modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail && detail.kind !== "routine" ? modalTitle : undefined}
      >
        {detail &&
          (() => {
            if (detail.kind === "ritual") {
              const r = ALL_RITUALS.find((x) => x.id === detail.id)!;
              const g = tGuide(t, r.id as RitualId, guideFor(r));
              const why = g?.why;
              const whyBullets = (g?.whyBullets ?? []).slice(0, 3);
              const steps = g?.steps ?? [];
              const tip = g?.tip;

              return (
                <div className="space-y-3">
                  {why && <div className="text-sm text-main">{why}</div>}
                  {whyBullets.length ? (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-dim">
                      {whyBullets.map((b: string, i: number) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  ) : null}
                  <div>
                    <div className="text-xs text-dim mb-1">
                      {t("library:steps", "Steps")}
                    </div>
                    <ol className="list-decimal pl-5 space-y-1 text-sm text-main">
                      {steps.map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                    {tip && <p className="text-xs text-dim mt-2">{tip}</p>}
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="primary"
                      onClick={() => startRitual(r.id as RitualId)}
                    >
                      {t("library:start", "Start")}
                    </Button>
                  </div>
                </div>
              );
            }

            if (detail.kind === "meditation") {
              const m = MEDITATIONS.find((x) => x.id === detail.id)!;
              const g = tMedGuide(t, m.id);
              const whyBullets = (g.whyBullets ?? []).slice(0, 3);
              const steps = (g.steps ?? []).slice(0, 4);

              return (
                <div className="space-y-3">
                  {m.descKey ? (
                    <div className="text-sm text-main">{t(m.descKey)}</div>
                  ) : null}

                  {g.why ? (
                    <div className="text-sm text-main">{g.why}</div>
                  ) : null}
                  {whyBullets.length ? (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-dim">
                      {whyBullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  ) : null}

                  {steps.length ? (
                    <div>
                      <div className="text-xs text-dim mb-1">
                        {t("library:steps", "Steps")}
                      </div>
                      <ol className="list-decimal pl-5 space-y-1 text-sm text-main">
                        {steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                      {g.tip && (
                        <p className="text-xs text-dim mt-2">{g.tip}</p>
                      )}
                    </div>
                  ) : null}

                  <div className="text-xs text-dim">
                    ~ {Math.max(1, Math.round(m.durSec / 60))}{" "}
                    {t("common:units.min", "min")}
                  </div>
                  {m.tags?.length ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {m.tags.map((tg) => (
                        <span
                          key={tg}
                          className="text-[11px] px-2 py-0.5 rounded-full border"
                          style={{
                            background: "var(--surface-2)",
                            borderColor: "var(--border)",
                            color: "var(--text-dim)",
                          }}
                        >
                          {t(`library:tags.${tg}`, tg)}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      onClick={() => startMeditation(m.id)}
                    >
                      {t("library:start", "Start")}
                    </Button>
                  </div>
                </div>
              );
            }

            // routine – uplifted version
            // routine – UPLIFTED VERSION (type-safe)
            const r = BUILT_IN_ROUTINES.find((x) => x.id === detail.id);

            if (!r) {
              return (
                <div className="space-y-3">
                  <p className="text-sm text-main">
                    {t("library:notFound", "This routine is not available right now.")}
                  </p>
                </div>
              );
            }

            const stepsArr = Array.isArray((r as any).steps)
              ? ((r as any).steps as Array<{
                id?: string;
                title: string;
                summary?: string;
                durationSec?: number;
              }>)
              : [];

            const totalSteps =
              stepsArr.length ||
              (typeof (r as any).parts === "number" ? (r as any).parts : 0);

            const approxMin = Math.max(
              1,
              Math.round(
                (stepsArr.length
                  ? stepsArr.reduce((acc, s) => acc + (s.durationSec ?? 40), 0)
                  : 120) / 60
              )
            );

            return (
              <div className="space-y-4">
                {/* TITLE centered with the X */}
                <div className="relative mb-4 -mx-4 px-4">
                  <h2 className="text-base font-semibold text-main text-center">
                    {r.title}
                  </h2>
                </div>

                {/* subtitle / intent */}
                {"intent" in r && (r as any).intent ? (
                  <p className="text-sm text-muted text-center">
                    {(r as any).intent}
                  </p>
                ) : (
                  <p className="text-sm text-muted text-center">
                    {t(
                      "library:routines.defaultIntent",
                      "Wake up, prime your mood, set today's focus."
                    )}
                  </p>
                )}

                {/* meta row (no 'when') */}
                <div className="flex flex-wrap gap-2 text-xs justify-center">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[rgba(253,84,142,0.12)] text-main">
                    {totalSteps || 3} {t("library:stepsLabel", "steps")}
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[rgba(255,255,255,0.45)] text-dim border border-[rgba(255,255,255,0.25)]">
                    ~ {approxMin} {t("common:units.min", "min")}
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[rgba(255,255,255,0.25)] text-dim">
                    {t("library:tags.routine", "Routine")}
                  </span>
                </div>

                {/* steps preview */}
                {stepsArr.length ? (
                  <div>
                    <div className="text-xs text-dim mb-2">
                      {t("library:stepsPreview", "What we'll do")}
                    </div>
                    <ol className="space-y-1.5">
                      {stepsArr.slice(0, 4).map((s, i) => (
                        <li
                          key={s.id ?? i}
                          className="flex items-start gap-2 rounded-xl bg-[rgba(255,255,255,0.28)] px-3 py-2"
                        >
                          <span className="mt-0.5 h-6 w-6 rounded-full bg-[rgba(253,84,142,0.15)] text-[11px] flex items-center justify-center text-main font-semibold">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-main">
                              {s.title ?? t("library:stepsLabel", "Step")}
                            </div>
                            {s.summary ? (
                              <div className="text-xs text-muted truncate">{s.summary}</div>
                            ) : null}
                          </div>
                          {s.durationSec ? (
                            <div className="text-[10px] text-dim ml-2">
                              {Math.round((s.durationSec || 40) / 60) || 1}m
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {/* why */}
                <div className="rounded-xl bg-[rgba(249,190,222,0.18)] border border-[rgba(253,84,142,0.12)] p-3">
                  <div className="text-xs text-dim mb-1">
                    {t("library:whyThisRoutine", "Why this routine")}
                  </div>
                  <p className="text-sm text-main leading-relaxed">
                    {r.id === "morning-routine"
                      ? "We wake the body, lift affect, and point attention → you start the day intentional instead of reactive."
                      : r.id === "night-wind-down"
                        ? "We downshift arousal, close loops, and tell the brain it’s safe to sleep."
                        : "We interrupt the stress loop and return you to task in under 3 minutes."}
                  </p>
                </div>

                {/* actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    className="btn btn-primary flex-1"
                    onClick={() => startRoutine(r.id)}
                  >
                    {t("library:start", "Start")}
                  </Button>
                  <Button className="btn btn-outline" onClick={() => startRoutine(r.id)}>
                    {t("library:viewSequence", "View sequence")}
                  </Button>
                </div>
              </div>
            );

          })()}
      </Modal>

      {/* Tag modal with full cloud */}
      <Modal
        open={tagModalOpen}
        onClose={() => setTagModalOpen(false)}
        title={t("library:moreFilters", "More filters")}
      >
        <div className="modal-panel p-4">
          <div className="flex flex-wrap gap-2">
            {["all", ...allTags].map((tg) => {
              const active = tag === tg;
              return (
                <button
                  key={tg}
                  onClick={() => {
                    setTag(tg);
                    setTagModalOpen(false);
                  }}
                  aria-pressed={active}
                  className="px-2 py-1 rounded-full text-sm border transition-colors"
                  style={{
                    background: active
                      ? "var(--accent-200)"
                      : "var(--surface-2)",
                    borderColor: active ? "var(--accent-300)" : "var(--border)",
                    color: active ? "#000" : "var(--text)",
                    textTransform: "capitalize",
                  }}
                >
                  {tg === "all"
                    ? t("library:chips.all", "All")
                    : tagLabel(t, tg)}
                </button>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
