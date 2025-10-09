import i18n from 'i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import dayjs from 'dayjs';
// dayjs locales matching our supported set
import 'dayjs/locale/en';
import 'dayjs/locale/sr';
import 'dayjs/locale/it';
import 'dayjs/locale/es';
import 'dayjs/locale/de';

export const SUPPORTED_LNGS = ['en', 'sr', 'it', 'es', 'de'] as const;
export type SupportedLng = typeof SUPPORTED_LNGS[number];

export const NAMESPACES = [
  'common',
  'home',
  'settings',
  'history',
  'library',
  'insights',
  'profile',
  'onboarding',
  'ritual',
] as const;
export type Namespace = typeof NAMESPACES[number];

const isProd = import.meta.env.PROD;
const base = import.meta.env.BASE_URL ?? '/';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: [...SUPPORTED_LNGS],
    nonExplicitSupportedLngs: true,
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

    // react-i18next
    react: {
      useSuspense: true,
    },
  });

// keep <html lang=".."> and dayjs in sync with i18n
const dayjsMap: Record<string, string> = {
  en: 'en',
  sr: 'sr', // latin variant by default; if you ever need cyrillic: 'sr-cyrl'
  it: 'it',
  es: 'es',
  de: 'de',
};

i18n.on('languageChanged', (lng) => {
  const html = document.documentElement;
  if (html) html.lang = lng;
  dayjs.locale(dayjsMap[lng] || 'en');
});

// initialize once on load
dayjs.locale(dayjsMap[i18n.resolvedLanguage as string] || 'en');

export default i18n;
