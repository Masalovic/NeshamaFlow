// src/routes/RoutineRun.tsx
import React, { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "../components/ui/Header";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { BUILT_IN_ROUTINES, type RoutineStep } from "../lib/routines";
import { BreathCoach } from "../components/BreathCoach"; // 👈 add this

export default function RoutineRun() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const routine = useMemo(
    () => BUILT_IN_ROUTINES.find((x) => x.id === id),
    [id]
  );

  // some older routines might not have steps → normalize to []
  const steps: RoutineStep[] = Array.isArray(routine?.steps)
    ? (routine!.steps as RoutineStep[])
    : [];

  const [stepIdx, setStepIdx] = useState(0);

  if (!routine) {
    return (
      <div className="min-h-dvh">
        <Header title="Routine" back />
        <div className="px-4 py-6">
          <Card className="p-5 space-y-3">
            <div className="text-main">Routine not found.</div>
            <Link className="btn btn-primary" to="/flows">
              Back to Flows
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const total = steps.length;
  // if no steps, show a dummy step-like view
  const current: RoutineStep | null = total ? steps[stepIdx] : null;

  function goNext() {
    if (total && stepIdx + 1 < total) {
      setStepIdx((i) => i + 1);
    } else {
      // done
      navigate("/flows", { replace: true });
    }
  }

  function skipStep() {
    if (total && stepIdx + 1 < total) {
      setStepIdx((i) => i + 1);
    } else {
      navigate("/flows", { replace: true });
    }
  }

  // 👇 detect if this step is a breathing step
  const isBreathStep =
    current &&
    (current.type === "breath" ||
      /inhale|exhale|4s|8s/i.test(current.summary ?? ""));

  return (
    <div className="min-h-dvh flex flex-col">
      <Header title={routine.title} back />

      <main className="flex-1 px-4 py-4">
        <div className="max-w-[540px] mx-auto space-y-4">
          {/* hero */}
          <Card className="p-4 bg-[rgba(255,255,255,0.35)] backdrop-blur">
            {routine.when ? (
              <div className="text-xs uppercase tracking-wide text-dim mb-1">
                {routine.when}
              </div>
            ) : null}
            <h1 className="text-lg font-semibold text-main">
              {routine.title}
            </h1>
            {routine.intent ? (
              <p className="text-sm text-muted mt-1">{routine.intent}</p>
            ) : null}

            {/* progress */}
            {total ? (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted mb-1">
                  <span>
                    Step {stepIdx + 1} of {total}
                  </span>
                  {current?.durationSec ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(253,84,142,0.12)] px-3 py-1 text-[11px] text-main">
                      ⏱ {Math.round(current.durationSec / 60) || 1} min
                    </span>
                  ) : null}
                </div>
                <div className="h-1.5 w-full bg-[rgba(255,255,255,0.4)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-500)] transition-all"
                    style={{
                      width: `${((stepIdx + 1) / total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
          </Card>

          {/* current step */}
          <Card className="p-5 space-y-3">
            {current ? (
              <>
                <div className="inline-flex items-center gap-2 text-xs text-dim">
                  <span className="h-6 w-6 rounded-full bg-[var(--accent-200)] text-black flex items-center justify-center text-[11px] font-semibold">
                    {stepIdx + 1}
                  </span>
                  {current.type ? (
                    <span className="uppercase tracking-wide text-[11px]">
                      {current.type}
                    </span>
                  ) : null}
                </div>
                <h2 className="text-base font-semibold text-main">
                  {current.title}
                </h2>
                {current.summary ? (
                  <p className="text-sm text-muted">{current.summary}</p>
                ) : null}

                {current.benefit ? (
                  <div className="p-3 rounded-xl bg-[rgba(249,190,222,0.25)] text-xs text-main leading-relaxed">
                    <strong className="font-semibold">Why this helps:</strong>{" "}
                    {current.benefit}
                  </div>
                ) : null}

                {current.prompt ? (
                  <div>
                    <div className="text-xs text-dim mb-1">What to do</div>
                    <p className="text-sm text-main leading-relaxed">
                      {current.prompt}
                    </p>
                  </div>
                ) : null}

                {/* 👇 breath timer goes right after instructions */}
                {isBreathStep && (
                  <BreathCoach
                    inhaleSec={current.breath?.inhaleSec ?? 4}
                    exhaleSec={current.breath?.exhaleSec ?? 8}
                    holdSec={current.breath?.holdSec ?? 0}
                    rounds={current.breath?.rounds ?? 4}
                  />
                )}

                {/* actions */}
                <div className="flex gap-3 pt-2">
                  <Button className="btn btn-primary flex-1" onClick={goNext}>
                    {stepIdx + 1 === total ? "Finish" : "Next"}
                  </Button>
                  <Button
                    className="btn btn-outline"
                    variant="outline"
                    onClick={skipStep}
                  >
                    Skip
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold text-main">
                  No steps yet
                </h2>
                <p className="text-sm text-muted">
                  This routine doesn’t have individual steps configured.
                </p>
                <div className="flex gap-3 pt-2">
                  <Button className="btn btn-primary" onClick={goNext}>
                    Finish
                  </Button>
                  <Link className="btn btn-outline" to="/flows">
                    Back
                  </Link>
                </div>
              </>
            )}
          </Card>

          {/* list of steps preview */}
          {total ? (
            <Card className="p-4 space-y-2">
              <div className="text-xs text-dim mb-1">Routine steps</div>
              <ol className="space-y-1">
                {steps.map((s, i) => (
                  <li
                    key={s.id ?? i}
                    className={
                      "flex items-center justify-between gap-2 rounded-lg px-3 py-2 " +
                      (i === stepIdx
                        ? "bg-[rgba(253,84,142,0.12)]"
                        : "bg-transparent")
                    }
                  >
                    <div>
                      <div className="text-sm text-main">{s.title}</div>
                      {s.summary ? (
                        <div className="text-xs text-muted">{s.summary}</div>
                      ) : null}
                    </div>
                    {s.durationSec ? (
                      <span className="text-[11px] text-dim">
                        {Math.round(s.durationSec / 60) || 1}m
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}
        </div>
      </main>
    </div>
  );
}
