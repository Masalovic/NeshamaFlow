// src/lib/meditationAudio.ts

export type VoiceVariant = "f" | "m" | "asmr";
export type AmbientVariant = "off" | "base" | "rain";

export const DEFAULT_VOICE_VARIANT: VoiceVariant = "f";
export const DEFAULT_AMBIENT_VARIANT: AmbientVariant = "base";

const MEDITATION_BASE: Record<string, string> = {
  "breath-awareness": "breath-awareness",
  "loving-kindness": "loving-kindness",
  "focus-candle": "candle-focus",
  "body-scan-5m": "body-scan",
  "open-monitoring": "open-monitoring",
  "noting": "noting",
  "pmr-6m": "muscle-relaxation",
  "safe-place-imagery": "safe-place",
};

function baseNameFor(id: string): string {
  return MEDITATION_BASE[id] ?? id;
}

export function isVoiceVariant(value: unknown): value is VoiceVariant {
  return value === "f" || value === "m" || value === "asmr";
}

export function isAmbientVariant(value: unknown): value is AmbientVariant {
  return value === "off" || value === "base" || value === "rain";
}

export function getMeditationVoiceSrc(
  meditationId: string,
  variant: VoiceVariant,
): string {
  return `/audio/meditations/${baseNameFor(meditationId)}-${variant}.mp3`;
}

export function getMeditationLegacySrc(meditationId: string): string {
  return `/audio/meditations/${baseNameFor(meditationId)}.mp3`;
}

export function getMeditationBaseAmbienceSrc(meditationId: string): string {
  return `/audio/meditations/${baseNameFor(meditationId)}.mp3`;
}

export function getAmbientSrc(
  meditationId: string,
  ambient: AmbientVariant,
): string | null {
  if (ambient === "off") return null;
  if (ambient === "rain") return "/audio/ambience/rain-soft.mp3";
  return getMeditationBaseAmbienceSrc(meditationId);
}

export async function buildMeditationSourceChain(
  meditationId: string,
  preferred: VoiceVariant,
): Promise<string[]> {
  const preferredSrc = getMeditationVoiceSrc(meditationId, preferred);
  const asmrSrc = getMeditationVoiceSrc(meditationId, "asmr");
  const fallbackLegacy = getMeditationLegacySrc(meditationId);

  const unique = new Set<string>([
    preferredSrc,
    ...(preferred !== "asmr" ? [asmrSrc] : []),
    fallbackLegacy,
  ]);

  return Array.from(unique);
}