// src/components/EmojiGrid.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';

export interface EmojiGridProps {
  selected?: string;               // emoji character (e.g., "😊")
  onSelect: (e: string) => void;
}

type MoodKey =
  | 'happy'
  | 'content'
  | 'calm'
  | 'sad'
  | 'neutral'
  | 'reflective'
  | 'stressed'
  | 'angry';

const MOODS: Array<{ key: MoodKey; e: string; fallback: string }> = [
  { key: 'happy',      e: '😊', fallback: 'Happy' },
  { key: 'content',    e: '🙂', fallback: 'Content' },
  { key: 'calm',       e: '😌', fallback: 'Calm/Relaxed' },
  { key: 'sad',        e: '😔', fallback: 'Sad' },
  { key: 'neutral',    e: '😐', fallback: 'Neutral' },
  { key: 'reflective', e: '🤔', fallback: 'Reflective' },
  { key: 'stressed',   e: '😫', fallback: 'Stressed' },
  { key: 'angry',      e: '😠', fallback: 'Angry' },
];

export default function EmojiGrid({ selected, onSelect }: EmojiGridProps) {
  const { t } = useTranslation('home');

  return (
    <div className="grid grid-cols-4 gap-3 p-1">
      {MOODS.map(({ key, e, fallback }) => {
        const label = t(`moods.${key}`, fallback);
        const active = selected === e;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(e)}
            className="flex flex-col items-center gap-1 focus:outline-none"
            aria-pressed={active}
            aria-label={label}
            title={label}
          >
            <span
              className={
                'w-12 h-12 text-[26px] flex items-center justify-center rounded-xl transition ' +
                (active ? 'ring-2 ring-brand-400' : 'hover:opacity-95')
              }
              style={{
                background: active ? 'var(--surface-2)' : 'var(--accent-50)',
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
