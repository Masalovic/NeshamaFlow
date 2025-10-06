// src/lib/theme.ts
import { getItem as sGet, setItem as sSet } from './secureStorage'

export type Appearance = 'system' | 'light' | 'dark'
export type Accent = 'berry' | 'ocean' | 'forest'

export type ThemeSettings = {
  appearance: Appearance
  accent: Accent
}

const KEY = 'ui.theme'

export async function loadTheme(): Promise<ThemeSettings> {
  const t = await sGet<ThemeSettings>(KEY)
  return {
    appearance: t?.appearance ?? 'system',
    accent: t?.accent ?? 'berry',
  }
}

export async function saveTheme(next: ThemeSettings): Promise<void> {
  await sSet(KEY, next)
  applyTheme(next)
}

export function getSystemDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function applyTheme(opts: ThemeSettings): void {
  const root = document.documentElement
  // Accent via data-theme attribute (for CSS variables)
  root.setAttribute('data-theme', opts.accent)

  // Light/Dark handling
  const isDark = opts.appearance === 'system' ? getSystemDark() : (opts.appearance === 'dark')
  root.classList.toggle('dark', isDark)
}

// Listen to system changes when appearance=system (call this once in App boot)
export function bindSystemThemeReactivity(getAppearance: () => Appearance) {
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
  if (!mq) return () => {}
  const handler = () => {
    if (getAppearance() === 'system') {
      const accent = (document.documentElement.getAttribute('data-theme') as Accent) ?? 'berry'
      applyTheme({ appearance: 'system', accent })
    }
  }
  mq.addEventListener?.('change', handler)
  return () => mq.removeEventListener?.('change', handler)
}
