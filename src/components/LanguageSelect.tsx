// src/components/LanguageSelect.tsx
import React, { useEffect, useRef, useState } from "react";
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
  // Use BASE_URL so it also works when the app is deployed under a subpath.
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
        // graceful fallback → show 2-letter code pill
        const span = document.createElement("span");
        span.className =
          "h-4 w-6 rounded-[2px] bg-gray-200 text-[10px] flex items-center justify-center font-semibold text-gray-600";
        span.textContent = cc.toUpperCase();
        e.currentTarget.replaceWith(span);
      }}
    />
  );
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

  // keep internal state in sync with external value or i18n changes
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
          className="absolute right-0 z-20 mt-1 w-44 rounded-xl border bg-white shadow-lg p-1"
        >
          {SUPPORTED_LNGS.map((lng) => {
            const isActive = lng === current;
            const cc2 = LANG_FLAG_CC[lng];
            return (
              <button
                key={lng}
                role="option"
                aria-selected={isActive}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-[var(--hover)] ${
                  isActive ? "bg-[var(--hover)]" : ""
                }`}
                onClick={() => select(lng)}
              >
                <Flag cc={cc2} alt={`${lng.toUpperCase()} flag`} />
                <span>{LANG_LABELS[lng]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
