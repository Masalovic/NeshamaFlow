import React, { useEffect, useRef, useState } from "react";
import i18n from "../lib/i18n";
import { LANG_META } from "../lib/i18nFlags";
import type { SupportedLng } from "../lib/i18n";

type Props = {
  value?: SupportedLng;
  onChange: (lng: SupportedLng) => void;
  className?: string;
  buttonClassName?: string;
};

function FlagImg({
  src,
  alt,
  cc,
}: {
  src?: string;
  alt: string;
  cc: string;
}) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    // Graceful fallback if the image is missing or fails to load
    return (
      <span
        aria-label={alt}
        className="h-4 w-6 rounded-[2px] bg-gray-200 text-[10px] flex items-center justify-center font-semibold text-gray-600"
      >
        {cc.toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="h-4 w-6 rounded-[2px] object-cover"
      loading="lazy"
      onError={() => setErr(true)}
    />
  );
}

export default function LanguageSelect({
  value,
  onChange,
  className = "",
  buttonClassName = "",
}: Props) {
  const initial =
    (value as SupportedLng | undefined) ??
    ((i18n.resolvedLanguage as SupportedLng) || "en");

  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<SupportedLng>(initial);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCurrent(
      (value as SupportedLng | undefined) ??
        ((i18n.resolvedLanguage as SupportedLng) || "en")
    );
  }, [value]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const opts = Object.keys(LANG_META) as SupportedLng[];
  const cur = LANG_META[current];

  function choose(code: SupportedLng) {
    setCurrent(code);
    setOpen(false);
    onChange(code);
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        className={`input h-9 px-2 pr-8 flex items-center gap-2 ${buttonClassName}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <FlagImg src={cur.flag} alt={cur.alt} cc={cur.cc} />
        <span className="text-sm">{cur.label}</span>
        <span className="ml-auto text-[10px] opacity-60">▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-20 mt-1 w-44 rounded-xl border bg-white shadow-lg p-1"
        >
          {opts.map((code) => {
            const m = LANG_META[code];
            const active = code === current;
            return (
              <button
                key={code}
                role="option"
                aria-selected={active}
                onClick={() => choose(code)}
                className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-[var(--hover)] ${
                  active ? "bg-[var(--hover)] font-medium" : ""
                }`}
              >
                <FlagImg src={m.flag} alt={m.alt} cc={m.cc} />
                <span className="truncate">{m.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
