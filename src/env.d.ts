
interface ImportMetaEnv {
  readonly VITE_STORAGE_SECRET: string
  readonly VITE_STRIPE_PK?: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}