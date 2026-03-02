// src/lib/i18n.ts
import i18n, { type InitOptions } from "i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import dayjs from "dayjs";

// Day.js locales
import "dayjs/locale/en";
import "dayjs/locale/sr";
import "dayjs/locale/it";
import "dayjs/locale/es";
import "dayjs/locale/de";
import "dayjs/locale/fr";
import "dayjs/locale/hr";
import "dayjs/locale/tr";
import "dayjs/locale/el";
import "dayjs/locale/ru";

export const SUPPORTED_LNGS = [
  "en",
  "sr",
  "it",
  "es",
  "de",
  "fr",
  "hr",
  "tr",
  "el",
  "ru",
] as const;

export type SupportedLng = typeof SUPPORTED_LNGS[number];

export const NAMESPACES = [
  "common",
  "home",
  "settings",
  "history",
  "library",
  "insights",
  "profile",
  "onboarding",
  "ritual",
  "meditation",
  "export",
] as const;

const isProd = import.meta.env.PROD;
const base = import.meta.env.BASE_URL ?? "/";

// Normalizacija jezika (en-US -> en)
const normalizeLng = (lng: string) => (lng || "en").toLowerCase().split("-")[0];

const options: InitOptions = {
  supportedLngs: [...SUPPORTED_LNGS],
  nonExplicitSupportedLngs: true,
  cleanCode: true,
  lowerCaseLng: true,
  load: "languageOnly",

  fallbackLng: "en",
  ns: [...NAMESPACES],
  defaultNS: "common",

  backend: {
    loadPath: `${base}locales/{{lng}}/{{ns}}.json`,
  },

  detection: {
    order: ["localStorage", "navigator", "htmlTag"],
    caches: ["localStorage"],
    convertDetectedLanguage: (lng: string) => lng.toLowerCase().split("-")[0],
  },

  interpolation: { escapeValue: false },
  returnEmptyString: false,
  returnNull: false,
  debug: !isProd,

  react: { useSuspense: true },
};

i18n.use(HttpBackend).use(LanguageDetector).use(initReactI18next).init(options);

// Sync html + dayjs
const dayjsMap: Record<string, string> = {
  en: "en",
  sr: "sr",
  it: "it",
  es: "es",
  de: "de",
  fr: "fr",
  hr: "hr",
  tr: "tr",
  el: "el",
  ru: "ru",
};

i18n.on("languageChanged", (lng) => {
  const lang = normalizeLng(lng);
  document.documentElement.lang = lang;
  dayjs.locale(dayjsMap[lang] ?? "en");
});

// Initial dayjs locale
dayjs.locale(dayjsMap[normalizeLng(i18n.resolvedLanguage as string)] ?? "en");

export default i18n;
