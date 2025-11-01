// src/lib/theme.ts
export type Appearance = "custom" | "light" | "dark";
export type Accent = "berry" | "ocean" | "forest";
export type BgMode = "gradient" | "image";

export type Theme = {
  appearance: Appearance;
  accent: Accent;
  bgMode?: BgMode;
  bgImageUrl?: string;
};

const THEME_KEY = "ui.theme.v2";

// ✅ your new default — change ONLY this if you want a new shipped image
const NEW_DEFAULT_BG_URL =
  "https://images.unsplash.com/photo-1592639252926-01f6628980f0?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8d2hpdGUlMjBsb3R1c3xlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&q=60&w=600";

// this is just for migration; right now it's the same
const OLD_DEFAULT_BG_URL = NEW_DEFAULT_BG_URL;

type Shade =
  | "50"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900";
type AccentMap = Record<Shade, string>;

const ACCENTS: Record<Accent, AccentMap> = {
  berry: {
    "50": "#fff1f7",
    "100": "#ffd7eb",
    "200": "#ffb4d5",
    "300": "#ff8abd",
    "400": "#f868a7",
    "500": "#e94d96",
    "600": "#cf237a",
    "700": "#a91463",
    "800": "#870f51",
    "900": "#700b45",
  },
  ocean: {
    "50": "#eef7ff",
    "100": "#d7ecff",
    "200": "#b9dcff",
    "300": "#8ec6ff",
    "400": "#61aef8",
    "500": "#3b91ea",
    "600": "#1e73cf",
    "700": "#1559a6",
    "800": "#114886",
    "900": "#0e3a6d",
  },
  forest: {
    "50": "#edfbea",
    "100": "#d6f5d0",
    "200": "#b3ecab",
    "300": "#84dd7c",
    "400": "#55c655",
    "500": "#36a844",
    "600": "#238838",
    "700": "#1b6c2e",
    "800": "#165627",
    "900": "#124621",
  },
} as const;

const SURFACES = {
  light: {
    bg: "#ffffff",
    surface1: "#ffffff",
    surface2: "#f6f7fb",
    surface3: "#000000",
    border: "#e5e7eb",
    text: "#0f172a",
    textDim: "#334155",
    textMuted: "#64748b",
    navBg: "rgba(255,255,255,0.95)",
    themeMeta: "#ffffff",
    hover: "rgba(0,0,0,0.04)",
  },
  dark: {
    bg: "#0b0b0c",
    surface1: "#151517",
    surface2: "#1c1c20",
    border: "#454545",
    text: "#f4f4f5",
    textDim: "#c7c7cd",
    textMuted: "#9ca3af",
    navBg: "rgba(10,10,12,0.92)",
    themeMeta: "#0b0b0c",
    hover: "rgba(255,255,255,0.06)",
  },
  custom: {
    // overridden when bgMode === 'image'
    bg: `
      radial-gradient(1100px 700px at 8% -8%,  var(--accent-100) 0%, transparent 60%),
      radial-gradient(900px 650px  at 100% 0%, var(--accent-50)  0%, transparent 55%),
      radial-gradient(700px 520px  at 0% 100%, var(--accent-200) 0%, transparent 55%),
      radial-gradient(720px 520px  at 100% 100%, var(--accent-300) 0%, transparent 52%),
      #ffffff
    `,
    surface1: "rgba(255,255,255,0.40)",
    surface2: "#fafbff",
    border: "var(--accent-300)",
    text: "#0f172a",
    textDim: "#334155",
    textMuted: "#64748b",
    navBg: "rgba(255,255,255,0.92)",
    themeMeta: "var(--accent-50)",
    hover: "rgba(0,0,0,0.04)",
  },
} as const;

function sanitizeBgUrl(url: string | undefined): string {
  try {
    if (!url) return NEW_DEFAULT_BG_URL;
    const u = new URL(url);
    // allow any unsplash image
    if (!u.hostname.includes("images.unsplash.com")) {
      return NEW_DEFAULT_BG_URL;
    }
    return u.toString();
  } catch {
    return NEW_DEFAULT_BG_URL;
  }
}

function normalizeAppearance(a: unknown): Appearance {
  return a === "light" || a === "dark" ? a : "custom";
}

export function loadTheme(): Theme {
  let stored: Partial<Theme> | null = null;
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw) stored = JSON.parse(raw) as Partial<Theme>;
  } catch {
    // ignore bad json
  }

  // 1) figure out appearance
  const appearance = normalizeAppearance(stored?.appearance);

  // 2) MIGRATE background
  let migratedBg = stored?.bgImageUrl;
  if (!migratedBg || migratedBg === OLD_DEFAULT_BG_URL) {
    migratedBg = NEW_DEFAULT_BG_URL;
  }

  // 3) build final
  const out: Theme = {
    appearance,
    accent: (stored?.accent ?? "berry") as Accent,
    bgMode: (stored?.bgMode ?? "image") as BgMode,
    // ✅ use the *migrated* value here, not stored?.bgImageUrl
    bgImageUrl: sanitizeBgUrl(migratedBg),
  };

  // 4) write back so next reload has the migrated value
  localStorage.setItem(THEME_KEY, JSON.stringify(out));
  return out;
}

export function saveTheme(t: Theme) {
  const safe: Theme = {
    ...t,
    appearance: normalizeAppearance(t.appearance),
    bgImageUrl: t.bgImageUrl ? sanitizeBgUrl(t.bgImageUrl) : NEW_DEFAULT_BG_URL,
  };
  localStorage.setItem(THEME_KEY, JSON.stringify(safe));
}

export function applyTheme(t: Theme): void {
  const root = document.documentElement;

  const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
  const resolved: Exclude<Appearance, "custom"> =
    t.appearance === "custom" ? (mql?.matches ? "dark" : "light") : t.appearance;

  const surf = t.appearance === "custom" ? SURFACES.custom : SURFACES[resolved];

  root.dataset.appearance = t.appearance;
  root.dataset.accent = t.accent;

  // accent → css vars
  const pal = ACCENTS[t.accent];
  (Object.keys(pal) as Shade[]).forEach((k) => {
    setVar("--accent-" + k, pal[k]);
  });

  // ✅ BACKGROUND
  if (
    t.appearance === "custom" &&
    t.bgMode === "image" &&
    (t.bgImageUrl ?? "").length > 0
  ) {
    const clean = sanitizeBgUrl(t.bgImageUrl);
    const versioned = withVersion(clean);
    const overlay =
      "linear-gradient(0deg, rgba(255,255,255,0.42), rgba(255,255,255,0.22))";
    setVar("--bg-image", `url("${versioned}")`);
    setVar("--bg", `${overlay}, var(--bg-image)`);
  } else {
    setVar("--bg", surf.bg);
    setVar("--bg-image", "none");
  }

  // surfaces & text
  setVar("--surface-1", surf.surface1);
  setVar("--surface-2", surf.surface2);
  setVar("--border", surf.border);
  setVar("--text", surf.text);
  setVar("--text-dim", surf.textDim);
  setVar("--text-muted", surf.textMuted);
  setVar("--nav-bg", surf.navBg);
  setVar("--hover", surf.hover);

  // primary
  if (resolved === "dark") {
    setVar("--primary-fg", "#ffffff");
    setVar("--primary-bg", "var(--accent-300)");
    setVar("--primary-bg-hover", "var(--accent-400)");
    setVar("--primary-bg-active", "var(--accent-500)");
  } else {
    setVar("--primary-fg", "#000000");
    setVar("--primary-bg", "var(--accent-600)");
    setVar("--primary-bg-hover", "var(--accent-700)");
    setVar("--primary-bg-active", "var(--accent-800)");
  }

  // …rest stays the same as you had…
  // ring tokens
  {
    const ringTrack = resolved === "light" ? "#d9dee6" : "#3a3f48";
    let ringText = resolved === "light" ? "#0f172a" : "#ffffff";
    if (t.appearance === "custom") {
      ringText = ringTrack;
    }
    const progressKey = resolved === "light" ? "--accent-600" : "--accent-300";
    const computedAccent =
      getComputedStyle(root).getPropertyValue(progressKey).trim() ||
      (resolved === "light" ? pal["600"] : pal["300"]);
    setVar("--ring-track", ringTrack);
    setVar("--ring-progress", computedAccent);
    setVar("--ring-text", ringText);
    setVar("--ring-knob-outline", resolved === "light" ? "#ffffff" : "#0b0b0c");
  }

  // bottom nav
  if (resolved === "dark") {
    setVar("--accent-nav", "var(--accent-400)");
    setVar("--accent-nav-press", "var(--accent-500)");
  } else {
    setVar("--accent-nav", "var(--accent-600)");
    setVar("--accent-nav-press", "var(--accent-700)");
  }

  // browser chrome
  const themeMeta = document.querySelector(
    'meta[name="theme-color"]'
  ) as HTMLMetaElement | null;
  if (themeMeta) themeMeta.content = (surf as any).themeMeta ?? "#ffffff";

  function setVar(name: string, value: string) {
    root.style.setProperty(name, value);
  }
}

// ✅ cache-buster so dev sees the new image
function withVersion(url: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${ts}`;
}

export function bindSystemThemeReactivity(
  getAppearance: () => Appearance
): () => void {
  const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
  if (!mql) return () => {};
  const handler = () => {
    if (getAppearance() === "custom") {
      const current = loadTheme();
      applyTheme(current);
    }
  };
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}
