// src/screens/RitualLibrary.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/ui/Header";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { ALL_RITUALS, titleForRitualId, type RitualId } from "../lib/ritualEngine";
import { guideFor } from "../lib/ritualGuides";
import { setItem as sSet } from "../lib/secureStorage";
import { track } from "../lib/metrics";
import { useDebounce } from "../hooks/useDebounce";
import { useTranslation } from "react-i18next";
import { tRitualTitle, tGuide } from "../lib/i18nRitual";

type FilterKey = "all" | string;

export default function RitualLibrary() {
  const navigate = useNavigate();
  const { t } = useTranslation(["library", "common", "ritual"]);
  const [detail, setDetail] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const q = useDebounce(query, 200);

  useEffect(() => {
    track("library_opened");
  }, []);

  // chips from tags
  const chips: FilterKey[] = useMemo(() => {
    const set = new Set<string>();
    for (const r of ALL_RITUALS) (r as any).tags?.forEach((tg: string) => set.add(tg));
    const arr = Array.from(set).sort();
    return (arr.length ? (["all", ...arr] as FilterKey[]) : (["all"] as FilterKey[]));
  }, []);

  const [filter, setFilter] = useState<FilterKey>("all");

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return ALL_RITUALS.filter((r) => {
      const name = titleForRitualId(r.id).toLowerCase();
      const tags: string[] = (r as any).tags ?? [];
      const matchesQ = !qq || name.includes(qq) || tags.some((tg) => tg.toLowerCase().includes(qq));
      const matchesChip = filter === "all" || tags.includes(filter);
      return matchesQ && matchesChip;
    });
  }, [q, filter]);

  async function start(id: string) {
    track("library_start_clicked", { ritualId: id });
    await sSet("draft.ritual", id);
    navigate("/ritual/start");
  }

  function openDetails(id: string) {
    setDetail(id);
    track("library_detail_viewed", { ritualId: id });
  }

  return (
    <div className="flex h-full flex-col">
      <Header title={t("library:title", "Rituals")} back />

      <main className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-[560px] space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("library:searchPlaceholder", "Search rituals…")}
              className="input flex-1 text-main"
              autoCorrect="off"
              autoCapitalize="none"
              aria-label={t("library:searchPlaceholder", "Search rituals…")}
            />
            {query && (
              <Button variant="ghost" onClick={() => setQuery("")}>
                {t("common:clear", "Clear")}
              </Button>
            )}
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2">
            {chips.map((k) => {
              const active = filter === k;
              return (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  aria-pressed={active}
                  className="px-2 py-1 rounded-full text-sm border transition-colors"
                  style={{
                    background: active ? "var(--accent-200)" : "var(--surface-2)",
                    borderColor: active ? "var(--accent-300)" : "var(--border)",
                    color: active ? "#000" : "var(--text)",
                    textTransform: "capitalize",
                  }}
                >
                  {k === "all" ? t("library:chips.all", "All") : t(`library:tags.${k}`, k)}
                </button>
              );
            })}
          </div>

          {/* List */}
          {!list.length ? (
            <div className="card p-6 text-sm text-dim">
              {t("library:noMatches", "No matches. Try a different search or filter.")}
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((r) => {
                const rid = r.id as RitualId;
                const title = tRitualTitle(t, rid, titleForRitualId(r.id));
                const g = tGuide(t, rid, guideFor(r));
                const bullets = g?.whyBullets ?? [];

                return (
                  <Card key={r.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-main truncate">{title}</div>

                        {!!r.durationSec && (
                          <div className="text-xs text-muted">
                            ~ {Math.max(1, Math.round(r.durationSec / 60))} {t("common:units.min", "min")}
                          </div>
                        )}

                        {(r as any).tags?.length ? (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {(r as any).tags.map((tg: string) => (
                              <span
                                key={tg}
                                className="text-[11px] px-2 py-0.5 rounded-full border"
                                style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-dim)" }}
                              >
                                {t(`library:tags.${tg}`, tg)}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {bullets.length ? (
                          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-dim">
                            {bullets.slice(0, 2).map((b: string, i: number) => (
                              <li key={i}>{b}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>

                      <Button variant="primary" onClick={() => start(r.id)}>
                        {t("library:start", "Start")}
                      </Button>
                    </div>

                    <button className="btn btn-outline h-8 px-3 mt-3 text-sm" onClick={() => openDetails(r.id)}>
                      {t("library:details", "Details")}
                    </button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Details modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? tRitualTitle(t, detail as RitualId, titleForRitualId(detail)) : ""}
      >
        {detail && (() => {
          const r = ALL_RITUALS.find((x) => x.id === detail)!;
          const g = tGuide(t, r.id as RitualId, guideFor(r));
          const why = g?.why;
          const whyBullets = g?.whyBullets ?? [];
          const steps = g?.steps ?? [];
          const tip = g?.tip;

          return (
            <div className="space-y-3">
              {why && <div className="text-sm text-main">{why}</div>}

              {whyBullets.length ? (
                <ul className="list-disc pl-5 space-y-1 text-sm text-dim">
                  {whyBullets.map((b: string, i: number) => (<li key={i}>{b}</li>))}
                </ul>
              ) : null}

              <div>
                <div className="text-xs text-dim mb-1">{t("library:steps", "Steps")}</div>
                <ol className="list-decimal pl-5 space-y-1 text-sm text-main">
                  {steps.map((s: string, i: number) => (<li key={i}>{s}</li>))}
                </ol>
                {tip && <p className="text-xs text-dim mt-2">{tip}</p>}
              </div>

              <div className="pt-2">
                <Button variant="primary" onClick={() => start(r.id)}>
                  {t("library:start", "Start")}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
