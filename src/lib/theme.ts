// src/lib/theme.ts
export type Appearance = 'system' | 'light' | 'dark';
export type Accent = 'berry' | 'ocean' | 'forest';
export type BgMode = 'gradient' | 'image';

export type Theme = {
  appearance: Appearance;
  accent: Accent;
  bgMode?: BgMode;
  bgImageUrl?: string;
};

const THEME_KEY = 'ui.theme.v1';

// ---- Accent palettes (unchanged except for tiny fixes) ----
type Shade = '50'|'100'|'200'|'300'|'400'|'500'|'600'|'700'|'800'|'900';
type AccentMap = Record<Shade, string>;

const ACCENTS: Record<Accent, AccentMap> = {
  berry:  {'50':'#fff1f7','100':'#ffd7eb','200':'#ffb4d5','300':'#ff8abd','400':'#f868a7','500':'#e94d96','600':'#cf237a','700':'#a91463','800':'#870f51','900':'#700b45'},
  ocean:  {'50':'#eef7ff','100':'#d7ecff','200':'#b9dcff','300':'#8ec6ff','400':'#61aef8','500':'#3b91ea','600':'#1e73cf','700':'#1559a6','800':'#114886','900':'#0e3a6d'},
  forest: {'50':'#edfbea','100':'#d6f5d0','200':'#b3ecab','300':'#84dd7c','400':'#55c655','500':'#36a844','600':'#238838','700':'#1b6c2e','800':'#165627','900':'#124621'}
} as const;

// ---- Surface tokens per appearance ----
const SURFACES = {
  light: {
    bg:        '#ffffff',
    surface1:  '#ffffff',
    surface2:  '#f6f7fb',
    border:    '#e5e7eb',
    text:      '#0f172a',
    textDim:   '#334155',
    textMuted: '#64748b',
    navBg:     'rgba(255,255,255,0.95)',
    themeMeta: '#ffffff',
    hover:     'rgba(0,0,0,0.04)',
  },
  dark: {
    bg:        '#0b0b0c',
    surface1:  '#151517',
    surface2:  '#1c1c20',
    border:    '#454545',
    text:      '#f4f4f5',
    textDim:   '#c7c7cd',
    textMuted: '#9ca3af',
    navBg:     'rgba(10,10,12,0.92)',
    themeMeta: '#0b0b0c',
    hover:     'rgba(255,255,255,0.06)',
  },
  system: {
    // Default morph (only used when bgMode !== 'image')
    bg: `
      radial-gradient(1100px 700px at 8% -8%,  var(--accent-100) 0%, transparent 60%),
      radial-gradient(900px 650px  at 100% 0%, var(--accent-50)  0%, transparent 55%),
      radial-gradient(700px 520px  at 0% 100%, var(--accent-200) 0%, transparent 55%),
      radial-gradient(720px 520px  at 100% 100%, var(--accent-300) 0%, transparent 52%),
      #ffffff
    `,
    surface1:  '#rgba(255,255,255,0.92)',
    surface2:  '#fafbff',
    border:    'var(--accent-100)',
    text:      '#0f172a',
    textDim:   '#334155',
    textMuted: '#64748b',
    navBg:     'rgba(255,255,255,0.92)',
    themeMeta: 'var(--accent-50)',
    hover:     'rgba(0,0,0,0.04)',
  },
} as const;

// ---- Load / Save ----
export function loadTheme(): Theme {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Theme>;
      return {
        appearance: (parsed.appearance ?? 'system') as Appearance,
        accent:     (parsed.accent ?? 'berry') as Accent,
        bgMode:     (parsed.bgMode ?? 'image') as BgMode, // default to image
        bgImageUrl: parsed.bgImageUrl ?? DEFAULT_SYSTEM_BG_URL,
      };
    }
  } catch {}
  return { appearance: 'system', accent: 'berry', bgMode: 'image', bgImageUrl: DEFAULT_SYSTEM_BG_URL };
}

export function saveTheme(t: Theme) {
  localStorage.setItem(THEME_KEY, JSON.stringify(t));
}

// ---- Apply ----
export function applyTheme(t: Theme): void {
  const root = document.documentElement;

  // Resolve OS mode for button contrast; System is treated as "light-style"
  const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
  const resolved: Exclude<Appearance,'system'> =
    t.appearance === 'system' ? (mql?.matches ? 'dark' : 'light') : t.appearance;

  const surf = t.appearance === 'system' ? SURFACES.system : SURFACES[resolved];

  root.dataset.appearance = t.appearance;
  root.dataset.accent     = t.accent;

  // Accent scale → CSS vars
  const pal = ACCENTS[t.accent];
  (Object.keys(pal) as Shade[]).forEach(k => set(`--accent-${k}`, pal[k]));

  // Background: System + Image → overlay + photo; else surface bg
  if (t.appearance === 'system' && t.bgMode === 'image' && (t.bgImageUrl ?? '').length > 0) {
    // A soft white overlay keeps the UI readable on any photo
    const overlay = 'linear-gradient(0deg, rgba(255,255,255,0.42), rgba(255,255,255,0.42))';
    set('--bg', `${overlay}, url("${t.bgImageUrl}")`);
  } else {
    set('--bg', surf.bg);
  }

  // Surfaces & text tokens
  set('--surface-1',  surf.surface1);
  set('--surface-2',  surf.surface2);
  set('--border',     surf.border);
  set('--text',       surf.text);
  set('--text-dim',   surf.textDim);
  set('--text-muted', surf.textMuted);
  set('--nav-bg',     surf.navBg);
  set('--hover',      surf.hover);

  // Primary buttons:
  const isDark = (t.appearance === 'dark');
  if (isDark) {
    set('--primary-fg', '#ffffff');
    set('--primary-bg', 'var(--accent-300)');
    set('--primary-bg-hover', 'var(--accent-400)');
    set('--primary-bg-active','var(--accent-500)');
  } else {
    set('--primary-fg', '#000000');
    set('--primary-bg', 'var(--accent-600)');
    set('--primary-bg-hover', 'var(--accent-300)');
    set('--primary-bg-active','var(--accent-500)');
  }

  if (resolved === 'dark') {
    set('--accent-nav', 'var(--accent-400)');
    set('--accent-nav-press', 'var(--accent-500)');
  } else {
    set('--accent-nav', 'var(--accent-600)');
    set('--accent-nav-press', 'var(--accent-700)');
  } 

  // Browser chrome color
  const themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (themeMeta) themeMeta.content = typeof surf.themeMeta === 'string' ? surf.themeMeta : '#ffffff';

  function set(name: string, value: string) {
    root.style.setProperty(name, value);
  }
}

// Keep UI synced with OS mode when appearance='system'
export function bindSystemThemeReactivity(getAppearance: () => Appearance): () => void {
  const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (!mql) return () => {};
  const handler = () => {
    if (getAppearance() === 'system') {
      const current = loadTheme();
      applyTheme({ appearance: 'system', accent: current.accent, bgMode: current.bgMode, bgImageUrl: current.bgImageUrl });
    }
  };
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}

// ---- Helpers ----
const DEFAULT_SYSTEM_BG_URL = 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
