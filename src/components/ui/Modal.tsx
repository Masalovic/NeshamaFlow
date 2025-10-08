// src/components/ui/Modal.tsx
import React, { useEffect, useId } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Optional: keep as sheet on mobile, center on desktop */
  centerOnDesktop?: boolean;
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  centerOnDesktop = false,
}: Props) {
  // ❗ Always call hooks in a consistent order
  const titleId = useId();

  // Lock body scroll when open (effect runs each render, toggles by `open`)
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] "
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      {/* Scrim */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: 'var(--scrim, rgba(0,0,0,.35))', backdropFilter: 'blur(2px)' }}
      />

      {/* Sheet / Card */}
      <div
        className={[
          'absolute inset-x-0',
          centerOnDesktop ? 'bottom-0 sm:top-1/2 sm:-translate-y-1/2' : 'bottom-0',
          'grid place-items-center',
          'pointer-events-none',
        ].join(' ')}
      >
        <div
          className="
            pointer-events-auto
            mx-auto w-full max-w-[560px]
            rounded-t-2xl sm:rounded-2xl
            border border-token bg-surface-1 shadow-soft
            p-5 pt-5
            pb-[calc(20px+env(safe-area-inset-bottom))]
            max-h-[min(82vh,calc(100svh-80px))]
            overflow-y-auto overscroll-contain
            text-main
          "
        >
          <div className="flex items-center justify-between mb-2 ">
            {title ? <h3 id={titleId} className="text-base font-semibold text-main">{title}</h3> : <span aria-hidden className="w-5" />}
            <button
              onClick={onClose}
              className="rounded-full p-1 text-base hover:bg-[var(--hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-300)]"
              aria-label="Close modal"
              title="Close"
            >
              ×
            </button>
          </div>

          <div className="text-dim">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
