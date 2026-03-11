import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/ui/Header";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useTranslation } from "react-i18next";
import { tMedGuide } from "../lib/i18nMeditation";
import { getItem as sGet, setItem as sSet } from "../lib/secureStorage";
import { logLocal } from "../lib/history";
import { isMoodKey, type MoodKey } from "../lib/ritualEngine";
import {
  buildMeditationSourceChain,
  DEFAULT_AMBIENT_VARIANT,
  DEFAULT_VOICE_VARIANT,
  getAmbientSrc,
  isAmbientVariant,
  isVoiceVariant,
  type AmbientVariant,
  type VoiceVariant,
} from "../lib/meditationAudio";

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
] as const;

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function fadeGain(
  gainNode: GainNode,
  target: number,
  duration = 0.8,
  audioCtx?: AudioContext | null,
) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);
  gainNode.gain.linearRampToValueAtTime(target, now + duration);
}

type MeditationPlayProps = {
  id?: string;
};

export default function MeditationPlay({ id: idProp }: MeditationPlayProps) {
  const { t, i18n } = useTranslation([
    "meditation",
    "library",
    "common",
    "ritual",
  ]);
  const navigate = useNavigate();
  const q = useQuery();
  const id = (idProp ?? q.get("id") ?? "").trim();

  const med = useMemo(
    () => MEDITATIONS.find((m) => m.id === id),
    [id, i18n.language],
  );

  const guide = med ? tMedGuide(t, med.id) : null;

  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null);

  // Web Audio API refs for ducking
  const audioCtxRef = useRef<AudioContext | null>(null);
  const voiceSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const ambientSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const voiceGainRef = useRef<GainNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);

  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [voiceVariant, setVoiceVariant] =
    useState<VoiceVariant>(DEFAULT_VOICE_VARIANT);
  const [ambient, setAmbient] =
    useState<AmbientVariant>(DEFAULT_AMBIENT_VARIANT);

  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const totalSec = med?.durSec ?? 300;
  const finalizedRef = useRef(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      const storedVoice = await sGet<string>("meditation.voice");
      const storedAmbient = await sGet<string>("meditation.ambient");

      if (!alive) return;

      if (isVoiceVariant(storedVoice)) {
        setVoiceVariant(storedVoice);
      }
      if (isAmbientVariant(storedAmbient)) {
        setAmbient(storedAmbient);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function setVoiceAndPersist(next: VoiceVariant) {
    setVoiceVariant(next);
    await sSet("meditation.voice", next);
  }

  async function setAmbientAndPersist(next: AmbientVariant) {
    setAmbient(next);
    await sSet("meditation.ambient", next);
  }

  async function ensureAudioGraph(
    voiceEl: HTMLAudioElement,
    ambientEl?: HTMLAudioElement | null,
  ) {
    let ctx = audioCtxRef.current;

    if (!ctx) {
      ctx = new AudioContext();
      audioCtxRef.current = ctx;
    }

    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        // ignore
      }
    }

    // create voice graph once per element instance
    if (!voiceSourceRef.current || voiceRef.current !== voiceEl) {
      voiceGainRef.current?.disconnect();
      voiceSourceRef.current?.disconnect();

      const source = ctx.createMediaElementSource(voiceEl);
      const gain = ctx.createGain();

      gain.gain.value = 1;

      source.connect(gain);
      gain.connect(ctx.destination);

      voiceSourceRef.current = source;
      voiceGainRef.current = gain;
    }

    // create ambient graph once per element instance
    if (ambientEl && (!ambientSourceRef.current || ambientRef.current !== ambientEl)) {
      ambientGainRef.current?.disconnect();
      ambientSourceRef.current?.disconnect();

      const source = ctx.createMediaElementSource(ambientEl);
      const gain = ctx.createGain();

      gain.gain.value = 0;

      source.connect(gain);
      gain.connect(ctx.destination);

      ambientSourceRef.current = source;
      ambientGainRef.current = gain;
    }
  }

  function duckAmbient(active: boolean) {
    const ctx = audioCtxRef.current;
    const ambientGain = ambientGainRef.current;
    if (!ctx || !ambientGain) return;

    const targetBase = ambient === "rain" ? 0.22 : 0.30;
    const ducked = ambient === "rain" ? 0.10 : 0.14;

    fadeGain(ambientGain, active ? ducked : targetBase, 0.35, ctx);
  }

  async function finalizeMeditation() {
    if (!med) return;
    if (finalizedRef.current) return;
    finalizedRef.current = true;

    try {
      const moodRaw = await sGet<string>("mood");
      const noteRaw = await sGet<string>("note");

      const mood = isMoodKey(moodRaw) ? (moodRaw as MoodKey) : null;
      const note = (noteRaw ?? "").trim() || null;

      if (mood) {
        await logLocal({
          mood,
          ritualId: med.id,
          durationSec: totalSec,
          note,
          kind: "meditation",
        });
      }
    } catch {
      // ignore
    }

    navigate(
      `/ritual/done?kind=meditation&id=${encodeURIComponent(med.id)}`,
      { replace: true },
    );
  }

  // voice audio with fallback chain
  useEffect(() => {
    if (!med) return;

    const medId = med.id;
    let disposed = false;
    finalizedRef.current = false;
    setProgress(0);

    const el = new Audio();
    el.loop = false;
    el.preload = "auto";

    voiceRef.current = el;

    el.ontimeupdate = () => {
      setProgress(el.currentTime);
    };

    el.onplay = async () => {
      setPlaying(true);

      const ambientEl = ambientRef.current;
      await ensureAudioGraph(el, ambientEl);

      if (ambientEl && ambientEl.paused) {
        ambientEl.currentTime = el.currentTime || 0;
        ambientEl.play().catch(() => {});
      }

      duckAmbient(true);
    };

    el.onpause = () => {
      setPlaying(false);
      duckAmbient(false);
      ambientRef.current?.pause();
    };

    el.onended = () => {
      setProgress(totalSec);
      setPlaying(false);
      duckAmbient(false);

      if (ambientRef.current) {
        ambientRef.current.pause();
        ambientRef.current.currentTime = 0;
      }

      const bell = new Audio("/audio/ui/bell.mp3");
      bell.play().catch(() => {});
      void finalizeMeditation();
    };

    async function startWithFallback() {
      const chain = await buildMeditationSourceChain(medId, voiceVariant);

      for (const src of chain) {
        if (disposed) return;

        try {
          el.pause();
          el.src = src;
          el.load();
          await el.play();
          setPlaying(true);
          return;
        } catch {
          // try next source
        }
      }

      if (!disposed) {
        setPlaying(false);
      }
    }

    void startWithFallback();

    return () => {
      disposed = true;
      el.pause();
      el.src = "";
      voiceRef.current = null;
      voiceSourceRef.current?.disconnect();
      voiceGainRef.current?.disconnect();
      voiceSourceRef.current = null;
      voiceGainRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [med?.id, totalSec, voiceVariant]);

  // ambient audio: base per meditation / rain / off
  useEffect(() => {
    if (!med) return;

    const src = getAmbientSrc(med.id, ambient);

    if (!src) {
      if (ambientRef.current) {
        ambientRef.current.pause();
        ambientRef.current.src = "";
        ambientRef.current = null;
      }

      ambientSourceRef.current?.disconnect();
      ambientGainRef.current?.disconnect();
      ambientSourceRef.current = null;
      ambientGainRef.current = null;
      return;
    }

    const el = new Audio(src);
    el.loop = true;
    el.preload = "auto";
    el.volume = 1; // actual volume controlled by GainNode

    const voiceEl = voiceRef.current;

    (async () => {
      if (voiceEl) {
        el.currentTime = voiceEl.currentTime || 0;
        await ensureAudioGraph(voiceEl, el);

        const ctx = audioCtxRef.current;
        const ambientGain = ambientGainRef.current;

        if (ctx && ambientGain) {
          ambientGain.gain.value = 0;
        }

        if (!voiceEl.paused) {
          el.play()
            .then(() => {
              if (ctx && ambientGain) {
                const target = ambient === "rain" ? 0.10 : 0.14; // ducked level while voice speaks
                fadeGain(ambientGain, target, 0.8, ctx);
              }
            })
            .catch(() => {});
        }
      }
    })();

    const prevAmbient = ambientRef.current;
    const prevGain = ambientGainRef.current;
    const ctx = audioCtxRef.current;

    if (prevAmbient && prevGain && ctx) {
      fadeGain(prevGain, 0, 0.5, ctx);
      window.setTimeout(() => {
        prevAmbient.pause();
        prevAmbient.src = "";
      }, 550);
    }

    ambientRef.current = el;

    return () => {
      el.pause();
      el.src = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambient, med?.id]);

  // manual timer fallback
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTsRef.current = null;
      return;
    }

    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      setProgress((prev) => {
        const audio = voiceRef.current;
        if (audio && !audio.paused) {
          return Math.min(audio.currentTime, totalSec);
        }
        return Math.min(totalSec, prev + dt);
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

    if (ambientRef.current) {
      ambientRef.current.pause();
      ambientRef.current.currentTime = 0;
    }

    duckAmbient(false);
    setProgress(totalSec);
    setPlaying(false);
    void finalizeMeditation();
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
                "This meditation is not available right now.",
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
          <Card className="p-6 bg-[rgba(255,255,255,0.35)] backdrop-blur rounded-3xl space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-40 h-40">
                <svg
                  viewBox="0 0 120 120"
                  className="w-full h-full"
                  style={{ transform: "rotate(-90deg)" }}
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

            <div className="flex gap-2 justify-center pt-1 flex-wrap">
              <button
                onClick={() => void setVoiceAndPersist("f")}
                className={`px-4 py-1.5 rounded-full text-xs ${
                  voiceVariant === "f"
                    ? "bg-[rgba(253,84,142,0.15)] text-main"
                    : "bg-[rgba(255,255,255,0.35)] text-dim"
                }`}
              >
                {t("meditation:voice.f", "Female")}
              </button>

              <button
                onClick={() => void setVoiceAndPersist("m")}
                className={`px-4 py-1.5 rounded-full text-xs ${
                  voiceVariant === "m"
                    ? "bg-[rgba(253,84,142,0.15)] text-main"
                    : "bg-[rgba(255,255,255,0.35)] text-dim"
                }`}
              >
                {t("meditation:voice.m", "Male")}
              </button>

              <button
                onClick={() => void setVoiceAndPersist("asmr")}
                className={`px-4 py-1.5 rounded-full text-xs ${
                  voiceVariant === "asmr"
                    ? "bg-[rgba(253,84,142,0.15)] text-main"
                    : "bg-[rgba(255,255,255,0.35)] text-dim"
                }`}
              >
                {t("meditation:voice.asmr", "ASMR")}
              </button>
            </div>

            <div className="flex gap-2 justify-center pt-2 flex-wrap">
              <button
                onClick={() => void setAmbientAndPersist("off")}
                className={`px-4 py-1.5 rounded-full text-xs ${
                  ambient === "off"
                    ? "bg-[rgba(253,84,142,0.15)] text-main"
                    : "bg-[rgba(255,255,255,0.35)] text-dim"
                }`}
              >
                {t("meditation:ambient.off", "No ambience")}
              </button>

              <button
                onClick={() => void setAmbientAndPersist("base")}
                className={`px-4 py-1.5 rounded-full text-xs ${
                  ambient === "base"
                    ? "bg-[rgba(253,84,142,0.15)] text-main"
                    : "bg-[rgba(255,255,255,0.35)] text-dim"
                }`}
              >
                {t("meditation:ambient.base", "Background")}
              </button>

              <button
                onClick={() => void setAmbientAndPersist("rain")}
                className={`px-4 py-1.5 rounded-full text-xs ${
                  ambient === "rain"
                    ? "bg-[rgba(253,84,142,0.15)] text-main"
                    : "bg-[rgba(255,255,255,0.35)] text-dim"
                }`}
              >
                {t("meditation:ambient.rain", "Rain")}
              </button>
            </div>
          </Card>

          {guide ? (
            <Card className="p-5 rounded-3xl bg-[rgba(249,190,222,0.18)] border border-[rgba(253,84,142,0.12)] space-y-3">
              {guide.why ? (
                <p className="text-sm text-main leading-relaxed">
                  {guide.why}
                </p>
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
        </div>
      </main>
    </div>
  );
}