// src/routes/MeditationPlay.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/ui/Header";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useTranslation } from "react-i18next";
import { tMedGuide } from "../lib/i18nMeditation";

// keep in sync with FlowsHub
const MEDITATIONS = [
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

// main voice tracks (your renamed files)
const MEDITATION_AUDIO: Record<string, string> = {
  "breath-awareness": "/audio/meditations/breath-awareness.mp3",
  "loving-kindness": "/audio/meditations/loving-kindness.mp3",
  "open-monitoring": "/audio/meditations/open-monitoring.mp3",
  noting: "/audio/meditations/noting.mp3",
  "focus-candle": "/audio/meditations/candle-focus.mp3",
  "body-scan-5m": "/audio/meditations/body-scan.mp3",
  "pmr-6m": "/audio/meditations/muscle-relaxation.mp3",
  "safe-place-imagery": "/audio/meditations/safe-place.mp3",
};

// ambience (optional)
const AMBIENT_AUDIO = {
  rain: "/audio/ambience/rain-soft.mp3",
  water: "/audio/ambience/river.mp3",
  fire: "/audio/ambience/fireplace.mp3",
} as const;

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function MeditationPlay() {
  const { t, i18n } = useTranslation([
    "meditation",
    "library",
    "common",
    "ritual",
  ]);
  const navigate = useNavigate();
  const q = useQuery();
  const id = q.get("id") ?? "";

  const med = useMemo(
    () => MEDITATIONS.find((m) => m.id === id),
    [id, i18n.language]
  );

  const guide = med ? tMedGuide(t, med.id) : null;

  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null);

  // seconds already played
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [ambient, setAmbient] = useState<keyof typeof AMBIENT_AUDIO | "off">(
    "off"
  );

  // for manual rAF timer
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const totalSec = med?.durSec ?? 300;

  // init voice audio
  useEffect(() => {
    if (!med) return;
    const src = MEDITATION_AUDIO[med.id];
    const el = new Audio(src);
    el.loop = false;
    el.preload = "auto";

    // keep state in sync when audio really moves
    el.ontimeupdate = () => {
      // browser is giving us correct time, trust it
      setProgress(el.currentTime);
    };

    el.onended = () => {
      setProgress(totalSec);
      setPlaying(false);
      const bell = new Audio("/audio/ui/bell.mp3");
      bell.play().catch(() => {});
    };

    // try auto-play
    el.play().then(
      () => {
        setPlaying(true);
      },
      () => {
        // autoplay blocked → we stay paused, timer will not tick until user presses play
        setPlaying(false);
      }
    );

    voiceRef.current = el;

    return () => {
      el.pause();
      el.src = "";
      voiceRef.current = null;
    };
  }, [med, totalSec]);

  // ambience
  useEffect(() => {
    if (ambient === "off") {
      if (ambientRef.current) {
        ambientRef.current.pause();
        ambientRef.current.src = "";
        ambientRef.current = null;
      }
      return;
    }
    const src = AMBIENT_AUDIO[ambient];
    const el = new Audio(src);
    el.loop = true;
    el.volume = 0.35;
    el.play().catch(() => {});
    ambientRef.current = el;
    return () => {
      el.pause();
      el.src = "";
    };
  }, [ambient]);

  // ✅ manual timer (so circle always moves)
  useEffect(() => {
    if (!playing) {
      // stop ticking
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTsRef.current = null;
      return;
    }

    const tick = (ts: number) => {
      // if the audio is playing and we can read currentTime, we *already* update via ontimeupdate
      // but some browsers fire ontimeupdate rarely → we supplement it here
      if (lastTsRef.current == null) {
        lastTsRef.current = ts;
      }
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      setProgress((prev) => {
        // if audio exists, prefer its time
        const audio = voiceRef.current;
        if (audio && !audio.paused) {
          const cur = audio.currentTime;
          const capped = Math.min(cur, totalSec);
          return capped;
        }
        // fallback: manual
        const next = Math.min(totalSec, prev + dt);
        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [playing, totalSec]);

  function togglePlay() {
    const el = voiceRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().catch(() => {});
      setPlaying(true);
    }
  }

  function finishNow() {
    const el = voiceRef.current;
    if (el) {
      el.pause();
      el.currentTime = el.duration || totalSec;
    }
    setProgress(totalSec);
    setPlaying(false);
  }

  function formatTime(sec: number) {
    const remaining = Math.max(0, Math.round(totalSec - sec));
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (!med) {
    return (
      <div className="min-h-dvh">
        <Header title={t("meditation:notFound", "Meditation")} back />
        <div className="p-4 max-w-[540px] mx-auto">
          <Card className="p-5 space-y-3">
            <p className="text-main">
              {t(
                "meditation:notFoundBody",
                "This meditation is not available right now."
              )}
            </p>
            <Button onClick={() => navigate("/flows")}>
              {t("common:back", "Back")}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const pct = Math.min(100, (progress / totalSec) * 100);

  return (
    <div className="min-h-dvh flex flex-col">
      <Header title={t(med.titleKey, med.id)} back />

      <main className="flex-1 px-4 py-4">
        <div className="max-w-[540px] mx-auto space-y-4">
          {/* Player card */}
          <Card className="p-6 bg-[rgba(255,255,255,0.35)] backdrop-blur rounded-3xl space-y-5">
            {/* circle */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-40 h-40">
                <svg
                  viewBox="0 0 120 120"
                  className="w-full h-full"
                  style={{ transform: "rotate(-90deg)" }} // rotate ONLY the svg path
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    stroke="rgba(253,84,142,1)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 52}
                    strokeDashoffset={(1 - pct / 100) * (2 * Math.PI * 52)}
                  />
                </svg>

                {/* ✅ text stays normal */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-dim">
                    {t("meditation:remaining", "Remaining")}
                  </span>
                  <span className="text-lg font-semibold text-main">
                    {formatTime(progress)}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <h1 className="text-base font-semibold text-main">
                  {t(med.titleKey)}
                </h1>
                {med.descKey ? (
                  <p className="text-sm text-muted mt-1 max-w-[360px]">
                    {t(med.descKey)}
                  </p>
                ) : null}
              </div>
            </div>

            {/* controls */}
            <div className="flex gap-3 justify-center">
              <Button
                className="min-w-[120px]"
                onClick={togglePlay}
                variant={playing ? "primary" : "outline"}
              >
                {playing
                  ? t("meditation:pause", "Pause")
                  : t("meditation:play", "Start")}
              </Button>
              <Button variant="outline" onClick={finishNow}>
                {t("meditation:finish", "Finish")}
              </Button>
            </div>

            {/* ambience */}
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setAmbient("off")}
                className={`px-4 py-1.5 rounded-full text-xs ${
                  ambient === "off"
                    ? "bg-[rgba(253,84,142,0.15)] text-main"
                    : "bg-[rgba(255,255,255,0.35)] text-dim"
                }`}
              >
                {t("meditation:ambient.off", "No ambience")}
              </button>
              <button
                onClick={() => setAmbient("rain")}
                className={`px-4 py-1.5 rounded-full text-xs ${
                  ambient === "rain"
                    ? "bg-[rgba(253,84,142,0.15)] text-main"
                    : "bg-[rgba(255,255,255,0.35)] text-dim"
                }`}
              >
                {t("meditation:ambient.rain", "Rain")}
              </button>
              <button
                onClick={() => setAmbient("water")}
                className={`px-4 py-1.5 rounded-full text-xs ${
                  ambient === "water"
                    ? "bg-[rgba(253,84,142,0.15)] text-main"
                    : "bg-[rgba(255,255,255,0.35)] text-dim"
                }`}
              >
                {t("meditation:ambient.water", "Water")}
              </button>
            </div>
          </Card>

          {/* guide box */}
          {guide ? (
            <Card className="p-5 rounded-3xl bg-[rgba(249,190,222,0.18)] border border-[rgba(253,84,142,0.12)] space-y-3">
              {guide.why ? (
                <p className="text-sm text-main leading-relaxed">{guide.why}</p>
              ) : null}
              {guide.whyBullets?.length ? (
                <ul className="list-disc pl-5 space-y-1 text-sm text-dim">
                  {guide.whyBullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              ) : null}
              {guide.tip ? (
                <p className="text-xs text-dim italic">{guide.tip}</p>
              ) : null}
            </Card>
          ) : null}

          {/* done panel */}
          {progress >= totalSec - 0.5 ? (
            <Card className="p-5 text-center space-y-3">
              <h2 className="text-base font-semibold text-main">
                {t("meditation:doneTitle", "You’re done ✨")}
              </h2>
              <p className="text-sm text-muted">
                {t(
                  "meditation:doneBody",
                  "Stay here for a few breaths, then return to your day."
                )}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate("/flows")}>
                  {t("common:backTo", "Back to flows")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const el = voiceRef.current;
                    if (el) {
                      el.currentTime = 0;
                      el.play().catch(() => {});
                    }
                    setProgress(0);
                    setPlaying(true);
                  }}
                >
                  {t("meditation:repeat", "Play again")}
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      </main>
    </div>
  );
}
