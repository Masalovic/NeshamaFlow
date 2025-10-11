// src/lib/i18nFlags.ts
import type { SupportedLng } from "./i18n";

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

// 2-letter ISO country codes matching your /public/flags/*.svg filenames
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
