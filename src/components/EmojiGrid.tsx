import React from 'react';
import { useTranslation } from 'react-i18next';

export interface EmojiGridProps {
  /** currently selected emoji characters (e.g., ["😊","😞"]) */
  selected?: string[];
  /** called with the new selected list after a toggle */
  onChange: (emojis: string[]) => void;
  /** maximum selections allowed (default 3) */
  maxSelections?: number;
}

type MoodKey =
  | 'happy'        // 😊
  | 'content'      // 🙂
  | 'calm'         // 😌
  | 'sad'          // 😔
  | 'neutral'      // 😐
  | 'reflective'   // 🤔
  | 'stressed'     // 😫
  | 'angry'        // 😠
  | 'anxious'      // 😟
  | 'depressed'    // 😞
  | 'tired'        // 😴
  | 'unfocused';   // 😵

const ALL: Array<{ key: MoodKey; e: string; fallback: string }> = [
  { key: 'happy',      e: '😊',   fallback: 'Happy' },
  { key: 'content',    e: '🙂',   fallback: 'Content' },
  { key: 'calm',       e: '😌',   fallback: 'Calm/Relaxed' },
  { key: 'sad',        e: '😔',   fallback: 'Sad' },
  { key: 'neutral',    e: '😐',   fallback: 'Neutral' },
  { key: 'reflective', e: '🤔',   fallback: 'Reflective' },
  { key: 'stressed',   e: '😫',   fallback: 'Stressed' },
  { key: 'angry',      e: '😠',   fallback: 'Angry' },
  { key: 'anxious',    e: '😟',   fallback: 'Anxious' },
  { key: 'depressed',  e: '😞',   fallback: 'Depressed' },
  { key: 'tired',      e: '😴',   fallback: 'Tired' },
  { key: 'unfocused',  e: '😵', fallback: 'Unfocused' },
];

export default function EmojiGrid({
  selected = [],
  onChange,
  maxSelections = 3,
}: EmojiGridProps) {
  const { t } = useTranslation(['home', 'common']);

  const toggle = (emoji: string) => {
    const isActive = selected.includes(emoji);
    if (isActive) {
      onChange(selected.filter(e => e !== emoji));
      return;
    }
    if (selected.length >= maxSelections) {
      // at max; do nothing
      return;
    }
    onChange([...selected, emoji]);
  };

  // when at max selections, only already-selected options remain clickable
  const atMax = selected.length >= maxSelections;

  return (
    <div className="grid grid-cols-4 gap-3 p-1">
      {ALL.map(({ key, e, fallback }) => {
        const label = t(`moods.${key}`, fallback);
        const active = selected.includes(e);
        const disabled = atMax && !active;

        return (
          <button
            key={`${key}-${e}`}
            type="button"
            onClick={() => toggle(e)}
            className={
              'flex flex-col items-center gap-1 focus:outline-none ' +
              (disabled ? 'opacity-50 cursor-not-allowed' : '')
            }
            aria-pressed={active}
            aria-disabled={disabled}
            aria-label={label}
            title={label}
            disabled={disabled}
          >
            <span
              className={
                'w-12 h-12 text-[26px] flex items-center justify-center rounded-xl transition ' +
                (active ? 'ring-2' : 'hover:opacity-95')
              }
              style={{
                background: active ? 'var(--surface-2)' : 'var(--accent-50)',
                border: active ? '1px solid var(--border)' : '1px solid transparent',
                // Tailwind ring color via token
                // @ts-ignore
                '--tw-ring-color': 'var(--accent-400)',
              } as React.CSSProperties}
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
