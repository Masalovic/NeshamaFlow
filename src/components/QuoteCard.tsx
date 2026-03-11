// src/components/QuoteCard.tsx
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import Card from "./ui/Card";

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pickDailyQuote(quotes: string[]) {
  if (!quotes.length) return "";
  const dayKey = new Date().toDateString(); // menja se 1x dnevno
  const idx = hashString(dayKey) % quotes.length;
  return quotes[idx] ?? quotes[0] ?? "";
}

export default function QuoteCard() {
  const { t } = useTranslation(["home"]);

  const title = t("home:quoteCard.title", "Today’s thought");
  const subtitle = t("home:quoteCard.subtitle", "");
  const quotes = t("home:quoteCard.quotes", { returnObjects: true }) as unknown;

  const list = useMemo(() => {
    return Array.isArray(quotes)
      ? quotes.filter((x) => typeof x === "string" && x.trim().length > 0)
      : [];
  }, [quotes]);

  const quote = useMemo(() => pickDailyQuote(list), [list]);

  if (!quote) return null;

  return (
    <Card
      className="relative overflow-hidden p-4"
      style={{
        background:
          "color-mix(in oklab, var(--accent-400) 16%, var(--surface-1))",
        borderColor:
          "color-mix(in oklab, var(--accent-400) 30%, var(--border))",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-lg" aria-hidden>
          ✨
        </div>

        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-dim">
            {title}
          </div>

          {/* fade each time quote changes */}
          <div
            key={quote}
            className="quote-fade mt-1 text-sm text-main leading-relaxed"
          >
            “{quote}”
          </div>

          {subtitle ? (
            <div className="quote-fade mt-2 text-xs text-muted">{subtitle}</div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
