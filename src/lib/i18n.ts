// src/lib/i18n.ts
import i18n from 'i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import dayjs from 'dayjs';

// Day.js locales (only those you ship)
import 'dayjs/locale/en';
import 'dayjs/locale/sr';
import 'dayjs/locale/it';
import 'dayjs/locale/es';
import 'dayjs/locale/de';
import 'dayjs/locale/fr';
import 'dayjs/locale/hr';
import 'dayjs/locale/tr';
import 'dayjs/locale/el';
import 'dayjs/locale/ru';

export const SUPPORTED_LNGS = [
  'en', 'sr', 'it', 'es', 'de', 'fr', 'hr', 'tr', 'el', 'ru'
] as const;
export type SupportedLng = typeof SUPPORTED_LNGS[number];

export const NAMESPACES = [
  'common','home','settings','history','library','insights','profile','onboarding','ritual'
] as const;
export type Namespace = typeof NAMESPACES[number];

const isProd = import.meta.env.PROD;
const base = import.meta.env.BASE_URL ?? '/';

i18n.on('failedLoading', (lng, ns, msg) => {
  console.warn('[i18n] failedLoading', { lng, ns, msg });
});

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: [...SUPPORTED_LNGS],
    nonExplicitSupportedLngs: true,
    cleanCode: true,
    lowerCaseLng: true,
    load: 'currentOnly',

    fallbackLng: 'en',
    ns: [...NAMESPACES],
    defaultNS: 'common',

    backend: {
      loadPath: `${base}locales/{{lng}}/{{ns}}.json`,
      allowMultiLoading: true,
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    interpolation: { escapeValue: false },
    returnEmptyString: false,
    debug: !isProd,

    react: { useSuspense: true },
  });

// keep <html lang> and dayjs locale synced
const dayjsMap: Record<string, string> = {
  en: 'en', sr: 'sr', it: 'it', es: 'es', de: 'de',
  fr: 'fr', hr: 'hr', tr: 'tr', el: 'el', ru: 'ru',
};

i18n.on('languageChanged', (lng) => {
  const html = document.documentElement;
  if (html) html.lang = lng;
  dayjs.locale(dayjsMap[lng] || 'en');
});

// initialize once on load
dayjs.locale(dayjsMap[i18n.resolvedLanguage as string] || 'en');

// small helper for debugging in the console
;(window as any).__APP_I18N__ = {
  probe: (k: string) => i18n.t(k) || '(missing)',
  lang: () => i18n.language,
  available: SUPPORTED_LNGS
};

export default i18n;
