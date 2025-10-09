// src/types/i18next.d.ts
import 'i18next';

declare module 'i18next' {
  interface CustomTypeOptions {
    // if you want to type your defaultNS + resources, you can extend here later
    defaultNS: 'common';
  }
}

declare module 'i18next-http-backend';