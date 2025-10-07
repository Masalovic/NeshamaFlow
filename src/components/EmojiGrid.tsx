// src/components/EmojiGrid.tsx
import React from 'react';

export interface EmojiGridProps {
  selected?: string;
  onSelect: (e: string) => void;
}

const DATA = [
  { e: '😊', label: 'Happy' },
  { e: '🙂', label: 'Content' },
  { e: '😌', label: 'Calm/Relaxed' },
  { e: '😔', label: 'Sad' },
  { e: '😐', label: 'Neutral' },
  { e: '🤔', label: 'Reflective' },
  { e: '😫', label: 'Stressed' },
  { e: '😠', label: 'Angry' },
];

export default function EmojiGrid({ selected, onSelect }: EmojiGridProps) {
  return (
    <div className="grid grid-cols-4 gap-3 p-1">
      {DATA.map(({ e, label }) => {
        const active = selected === e;
        return (
          <button
            key={e}
            onClick={() => onSelect(e)}
            className="flex flex-col items-center gap-1 focus:outline-none"
            aria-pressed={active}
          >
            <span
              className={
                'w-12 h-12 text-[26px] flex items-center justify-center rounded-xl transition ' +
                (active
                  ? 'ring-2 ring-brand-400'
                  : 'hover:opacity-95')
              }
              // pastel accent chip; neutral when selected so the ring pops
              style={{
                background: active
                  ? 'var(--surface-2)'
                  : 'var(--accent-50)',
                border: active ? '1px solid var(--border)' : '1px solid transparent',
              }}
            >
              {e}
            </span>
            <span className="text-[11px] text-muted">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
