// src/components/LanguageSelect.tsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import i18n, { SUPPORTED_LNGS, type SupportedLng } from "../lib/i18n";
import { LANG_LABELS, LANG_FLAG_CC } from "../lib/i18nFlags";

type Props = {
  value?: SupportedLng;
  onChange?: (lng: SupportedLng) => void;
  className?: string;
  buttonClassName?: string;
};

const ASSET_BASE = (import.meta as any)?.env?.BASE_URL ?? "/";

function Flag({
  cc,
  alt,
  className = "h-4 w-6 rounded-[2px] object-cover",
}: {
  cc: string;
  alt: string;
  className?: string;
}) {
  const src = `${ASSET_BASE}flags/${cc}.svg`;
  return (
    <img
      src={src}
      alt={alt}
      width={24}
      height={16}
      className={className}
      loading="lazy"
      onError={(e) => {
        const span = document.createElement("span");
        span.className =
          "h-4 w-6 rounded-[2px] bg-gray-200 text-[10px] flex items-center justify-center font-semibold text-gray-600";
        span.textContent = cc.toUpperCase();
        e.currentTarget.replaceWith(span);
      }}
    />
  );
}

/** Best-effort: read --bg and decide if UI is dark. */
function detectDarkTheme(): boolean {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    // quick luminance test for rgb/hex; fallback to false
    const toRGB = (s: string): [number, number, number] | null => {
      if (!s) return null;
      if (s.startsWith("#")) {
        const n = s.slice(1);
        const hex = n.length === 3 ? n.split("").map((c) => c + c).join("") : n;
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return [r, g, b];
      }
      const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (m) return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
      return null;
    };
    const rgb = toRGB(v);
    if (!rgb) return false;
    const [r, g, b] = rgb.map((x) => x / 255);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum < 0.5;
  } catch {
    return false;
  }
}

export default function LanguageSelect({
  value,
  onChange,
  className = "",
  buttonClassName = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<SupportedLng>(
    (value ?? (i18n.resolvedLanguage as SupportedLng)) || "en"
  );
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (value) setCurrent(value);
  }, [value]);

  useEffect(() => {
    const handler = (lng: string) => {
      if (SUPPORTED_LNGS.includes(lng as SupportedLng)) {
        setCurrent(lng as SupportedLng);
      }
    };
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, []);

  function select(lng: SupportedLng) {
    setCurrent(lng);
    onChange?.(lng);
    setOpen(false);
  }

  // close on outside click
  useEffect(() => {
    function closeOnOutside(e: MouseEvent) {
      if (!open) return;
      if (!btnRef.current) return;
      if (!btnRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", closeOnOutside);
    return () => document.removeEventListener("click", closeOnOutside);
  }, [open]);

  const isDark = useMemo(detectDarkTheme, [open]); // re-check when opened
  const cc = LANG_FLAG_CC[current];
  const label = LANG_LABELS[current];

  return (
    <div className={`relative min-w-[180px] ${className}`}>
      <button
        ref={btnRef}
        type="button"
        className={`input h-9 px-2 pr-8 flex items-center gap-2 ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Flag cc={cc} alt={`${current.toUpperCase()} flag`} />
        <span className="text-sm">{label}</span>
        <span className="ml-auto text-[10px] opacity-60">▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          className={
            // Light/custom keeps the original white card;
            // Dark uses black panel + white text.
            "absolute right-0 z-20 mt-1 w-44 rounded-xl shadow-lg p-1 border " +
            (isDark
              ? "bg-black text-white border-[var(--border)]"
              : "bg-white text-[var(--text)] border-[var(--border)]")
          }
        >
          {SUPPORTED_LNGS.map((lng) => {
            const isActive = lng === current;
            const cc2 = LANG_FLAG_CC[lng];
            return (
              <button
                key={lng}
                role="option"
                aria-selected={isActive}
                className={
                  "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm " +
                  (isActive
                    ? (isDark
                        // Dark: white chip + dark text
                        ? "bg-white text-black"
                        // Light: subtle selection + accent text
                        : "bg-[var(--hover)] text-[var(--accent-600)]")
                    : "hover:bg-[var(--hover)]")
                }
                onClick={() => select(lng)}
              >
                <Flag cc={cc2} alt={`${lng.toUpperCase()} flag`} />
                <span className={isActive && isDark ? "text-black" : undefined}>
                  {LANG_LABELS[lng]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
