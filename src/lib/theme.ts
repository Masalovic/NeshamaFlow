// src/lib/theme.ts
export type Appearance = 'custom' | 'light' | 'dark';
export type Accent = 'berry' | 'ocean' | 'forest';
export type BgMode = 'gradient' | 'image';

export type Theme = {
  appearance: Appearance;
  accent: Accent;
  bgMode?: BgMode;
  bgImageUrl?: string;
};

const THEME_KEY = 'ui.theme.v2';

type Shade = '50'|'100'|'200'|'300'|'400'|'500'|'600'|'700'|'800'|'900';
type AccentMap = Record<Shade, string>;

const ACCENTS: Record<Accent, AccentMap> = {
  berry:  {'50':'#fff1f7','100':'#ffd7eb','200':'#ffb4d5','300':'#ff8abd','400':'#f868a7','500':'#e94d96','600':'#cf237a','700':'#a91463','800':'#870f51','900':'#700b45'},
  ocean:  {'50':'#eef7ff','100':'#d7ecff','200':'#b9dcff','300':'#8ec6ff','400':'#61aef8','500':'#3b91ea','600':'#1e73cf','700':'#1559a6','800':'#114886','900':'#0e3a6d'},
  forest: {'50':'#edfbea','100':'#d6f5d0','200':'#b3ecab','300':'#84dd7c','400':'#55c655','500':'#36a844','600':'#238838','700':'#1b6c2e','800':'#165627','900':'#124621'}
} as const;

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
  custom: {
    bg: `
      radial-gradient(1100px 700px at 8% -8%,  var(--accent-100) 0%, transparent 60%),
      radial-gradient(900px 650px  at 100% 0%, var(--accent-50)  0%, transparent 55%),
      radial-gradient(700px 520px  at 0% 100%, var(--accent-200) 0%, transparent 55%),
      radial-gradient(720px 520px  at 100% 100%, var(--accent-300) 0%, transparent 52%),
      #ffffff
    `,
    surface1:  'rgba(255,255,255,0.40)',
    surface2:  '#fafbff',
    border:    'var(--accent-300)',
    text:      '#0f172a',
    textDim:   '#334155',
    textMuted: '#64748b',
    navBg:     'rgba(255,255,255,0.92)',
    themeMeta: 'var(--accent-50)',
    hover:     'rgba(0,0,0,0.04)',
  },
} as const;

const DEFAULT_SYSTEM_BG_URL =
  'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0';

function sanitizeBgUrl(url: string | undefined): string {
  try {
    const u = new URL(url ?? '');
    if (u.hostname !== 'images.unsplash.com') return DEFAULT_SYSTEM_BG_URL;
    return u.toString();
  } catch {
    return DEFAULT_SYSTEM_BG_URL;
  }
}
function normalizeAppearance(a: unknown): Appearance {
  return a === 'light' || a === 'dark' ? a : 'custom';
}

export function loadTheme(): Theme {
  let t: Partial<Theme> | null = null;
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw) t = JSON.parse(raw) as Partial<Theme>;
    else {
      const oldRaw = localStorage.getItem('ui.theme.v1');
      if (oldRaw) {
        const old = JSON.parse(oldRaw) as Partial<Theme>;
        t = {
          appearance: old.appearance,
          accent: old.accent,
          bgMode: old.bgMode,
          bgImageUrl: old.bgImageUrl,
        };
        localStorage.removeItem('ui.theme.v1');
      }
    }
  } catch {}
  const out: Theme = {
    appearance: normalizeAppearance(t?.appearance),
    accent:     (t?.accent ?? 'berry') as Accent,
    bgMode:     (t?.bgMode ?? 'image') as BgMode,
    bgImageUrl: sanitizeBgUrl(t?.bgImageUrl),
  };
  localStorage.setItem(THEME_KEY, JSON.stringify(out));
  return out;
}

export function saveTheme(t: Theme) {
  const safe: Theme = {
    ...t,
    appearance: normalizeAppearance(t.appearance),
    bgImageUrl: t.bgImageUrl ? sanitizeBgUrl(t.bgImageUrl) : DEFAULT_SYSTEM_BG_URL,
  };
  localStorage.setItem(THEME_KEY, JSON.stringify(safe));
}

export function applyTheme(t: Theme): void {
  const root = document.documentElement;

  // resolve effective scheme when appearance='custom'
  const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
  const resolved: Exclude<Appearance,'custom'> =
    t.appearance === 'custom' ? (mql?.matches ? 'dark' : 'light') : t.appearance;

  const surf = t.appearance === 'custom' ? SURFACES.custom : SURFACES[resolved];

  root.dataset.appearance = t.appearance;
  root.dataset.accent     = t.accent;

  // accent → CSS vars
  const pal = ACCENTS[t.accent];
  (Object.keys(pal) as Shade[]).forEach(k => set('--accent-' + k, pal[k]));

  // background
  if (t.appearance === 'custom' && t.bgMode === 'image' && (t.bgImageUrl ?? '').length > 0) {
    const url = withVersion(sanitizeBgUrl(t.bgImageUrl));
    const overlay = 'linear-gradient(0deg, rgba(255,255,255,0.42), rgba(255,255,255,0.42))';
    set('--bg-image', `url("${url}")`);
    set('--bg', `${overlay}, var(--bg-image)`);
  } else {
    set('--bg', surf.bg);
    set('--bg-image', 'none');
  }

  // surfaces & text
  set('--surface-1',  surf.surface1);
  set('--surface-2',  surf.surface2);
  set('--border',     surf.border);
  set('--text',       surf.text);
  set('--text-dim',   surf.textDim);
  set('--text-muted', surf.textMuted);
  set('--nav-bg',     surf.navBg);
  set('--hover',      surf.hover);

  // primary buttons
  if (resolved === 'dark') {
    set('--primary-fg', '#ffffff');
    set('--primary-bg', 'var(--accent-300)');
    set('--primary-bg-hover', 'var(--accent-400)');
    set('--primary-bg-active','var(--accent-500)');
  } else {
    set('--primary-fg', '#000000');
    set('--primary-bg', 'var(--accent-600)');
    set('--primary-bg-hover', 'var(--accent-700)');
    set('--primary-bg-active','var(--accent-800)');
  }

// ---- Timer ring tokens (all themes) ----
{
  // palette per resolved scheme
  const ringTrack   = resolved === 'light' ? '#d9dee6' : '#3a3f48';
  // default text (used for light/dark appearances)
  let ringText      = resolved === 'light' ? '#0f172a' : '#ffffff';

  // On CUSTOM appearance, force text to match the ring track color
  if (t.appearance === 'custom') {
    ringText = ringTrack;
  }

  // progress hue from current accent scale
  const progressKey = resolved === 'light' ? '--accent-600' : '--accent-300';
  const computedAccent =
    getComputedStyle(root).getPropertyValue(progressKey).trim() ||
    (resolved === 'light' ? ACCENTS[t.accent]['600'] : ACCENTS[t.accent]['300']);

  set('--ring-track', ringTrack);
  set('--ring-progress', computedAccent);
  set('--ring-text', ringText);
  // subtle outline so the knob separates from the track
  set('--ring-knob-outline', resolved === 'light' ? '#ffffff' : '#0b0b0c');
}

  // menu / popover palette (LanguageSelect, etc.)
  if (resolved === 'dark') {
    set('--menu-bg',        '#0f1012');
    set('--menu-fg',        '#ffffff');
    set('--menu-border',    '#2c2f36');
    set('--menu-hover',     'rgba(255,255,255,.08)');
    set('--menu-active-fg', '#0f172a');
  } else {
    set('--menu-bg',        '#ffffff');
    set('--menu-fg',        '#0f172a');
    set('--menu-border',    surf.border);
    set('--menu-hover',     surf.hover);
    set('--menu-active-fg', '#0f172a');
  }

  // bottom nav accent
  if (resolved === 'dark') {
    set('--accent-nav', 'var(--accent-400)');
    set('--accent-nav-press', 'var(--accent-500)');
  } else {
    set('--accent-nav', 'var(--accent-600)');
    set('--accent-nav-press', 'var(--accent-700)');
  }

  // browser chrome color
  const themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (themeMeta) themeMeta.content = (surf as any).themeMeta ?? '#ffffff';

  function set(name: string, value: string) {
    root.style.setProperty(name, value);
  }
  function withVersion(url: string): string {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}v=${Math.floor(Date.now()/1000)}`;
  }
}

export function bindSystemThemeReactivity(getAppearance: () => Appearance): () => void {
  const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (!mql) return () => {};
  const handler = () => { 
    if (getAppearance() === 'custom') {
      const current = loadTheme();
      applyTheme({
        appearance: 'custom',
        accent: current.accent,
        bgMode: current.bgMode,
        bgImageUrl: current.bgImageUrl,
      });
    }
  };
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}
