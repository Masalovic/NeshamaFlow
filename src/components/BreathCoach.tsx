import React, { useEffect, useState } from "react";

type BreathCoachProps = {
  inhaleSec: number;
  exhaleSec: number;
  holdSec?: number;
  rounds?: number; // optional – if present, we stop after N cycles
};

export function BreathCoach({
  inhaleSec,
  exhaleSec,
  holdSec = 0,
  rounds,
}: BreathCoachProps) {
  // phases: inhale -> hold -> exhale -> repeat
  type Phase = "inhale" | "hold" | "exhale";
  const [phase, setPhase] = useState<Phase>("inhale");
  const [remaining, setRemaining] = useState(inhaleSec);
  const [doneRounds, setDoneRounds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev > 1) return prev - 1;

        // phase change
        setPhase((p) => {
          if (p === "inhale") {
            if (holdSec > 0) {
              setRemaining(holdSec);
              return "hold";
            }
            setRemaining(exhaleSec);
            return "exhale";
          }
          if (p === "hold") {
            setRemaining(exhaleSec);
            return "exhale";
          }
          // exhale -> next round
          const nextRound = doneRounds + 1;
          setDoneRounds(nextRound);

          if (rounds && nextRound >= rounds) {
            // stop on last exhale
            clearInterval(timer);
            return p;
          }

          setRemaining(inhaleSec);
          return "inhale";
        });

        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inhaleSec, exhaleSec, holdSec, rounds, doneRounds]);

  const label =
    phase === "inhale"
      ? "Inhale"
      : phase === "hold"
      ? "Hold"
      : "Exhale";

  return (
    <div className="mt-3 flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.25)] overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            phase === "inhale"
              ? "bg-[rgba(253,84,142,0.7)]"
              : phase === "exhale"
              ? "bg-[rgba(116,190,255,0.8)]"
              : "bg-[rgba(255,196,140,0.8)]"
          }`}
          style={{
            width:
              phase === "inhale"
                ? `${(remaining / inhaleSec) * 100}%`
                : phase === "hold"
                ? `${(remaining / holdSec) * 100}%`
                : `${(remaining / exhaleSec) * 100}%`,
          }}
        />
      </div>
      <div className="text-xs text-main w-14 text-right">
        {label} {remaining}s
      </div>
    </div>
  );
}
