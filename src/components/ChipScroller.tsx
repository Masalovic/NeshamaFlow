import React from "react";

type Opt<T extends string> = { key: T; label: string };

interface ChipScrollerProps<T extends string> {
  options: Array<Opt<T>>;
  value: T;
  onChange: (v: T) => void;
  className?: string;
  moreChip?: React.ReactNode; // optional trailing chip (e.g., “More filters”)
  ariaLabel?: string;
}

export default function ChipScroller<T extends string>({
  options,
  value,
  onChange,
  className = "",
  moreChip,
  ariaLabel,
}: ChipScrollerProps<T>) {
  return (
    <div
      className={`relative overflow-x-auto no-scrollbar -mx-2 px-2 ${className}`}
      aria-label={ariaLabel}
    >
      <div className="flex gap-1.5 py-0.5">
        {options.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              aria-pressed={active}
              className={"chip flex flex-wrap items-center justify-center text-sm h-8 px-3 py-1.5 whitespace-nowrap " + (active ? "ring-2" : "")}
              style={{ "--tw-ring-color": "var(--accent-400)" } as React.CSSProperties}
              title={opt.label}
            >
              {opt.label}
            </button>
          );
        })}
        {moreChip}
      </div>
    </div>
  );
}
