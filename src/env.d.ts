/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_STRIPE_PK: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Fallback declaration (silences any lingering editor squiggles)
declare module 'virtual:pwa-register' {
  export function registerSW(options?: { immediate?: boolean }): void
}
