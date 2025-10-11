// src/lib/i18nFlags.ts
import type { SupportedLng } from "./i18n";

/**
 * Eagerly import all flag svgs under src/assets/flags and build a cc->url map.
 * This works in dev & build, regardless of BASE_URL/subpaths.
 */
const files = import.meta.glob("../assets/flags/*.svg", {
  eager: true,
  as: "url",
}) as Record<string, string>;

function filenameToCc(path: string) {
  const m = path.match(/\/([a-z]{2})\.svg$/i);
  return (m?.[1] || "").toLowerCase();
}

const FLAG_URL_BY_CC: Record<string, string> = {};
for (const p of Object.keys(files)) {
  const cc = filenameToCc(p);
  if (cc) FLAG_URL_BY_CC[cc] = files[p];
}

export const LANG_LABELS: Record<SupportedLng, string> = {
  en: "English",
  sr: "Srpski",
  it: "Italiano",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
  hr: "Hrvatski",
  tr: "Türkçe",
  el: "Ελληνικά",
  ru: "Русский",
};

// 2-letter country codes we want to show for each language
export const LANG_FLAG_CC: Record<SupportedLng, string> = {
  en: "gb", // change to 'us' if you prefer 🇺🇸
  sr: "rs",
  it: "it",
  es: "es",
  de: "de",
  fr: "fr",
  hr: "hr",
  tr: "tr",
  el: "gr",
  ru: "ru",
};

export type LangMeta = {
  label: string;
  cc: string;
  flag?: string; // resolved bundle URL; may be undefined if file missing
  alt: string;
};

export const LANG_META: Record<SupportedLng, LangMeta> = (
  Object.keys(LANG_LABELS) as SupportedLng[]
).reduce((acc, code) => {
  const cc = LANG_FLAG_CC[code];
  acc[code] = {
    label: LANG_LABELS[code],
    cc,
    flag: FLAG_URL_BY_CC[cc], // bundled URL or undefined if missing
    alt: `${cc.toUpperCase()} flag`,
  };
  return acc;
}, {} as Record<SupportedLng, LangMeta>);
