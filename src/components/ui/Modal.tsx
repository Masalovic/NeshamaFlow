import React, { useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export default function Modal({ open, onClose, title, children }: Props) {
  // Lock the body scroll when open
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title ?? 'Dialog'}>
      {/* Dim background */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 touch-none"
      />

      {/* Sheet */}
      <div className="absolute inset-x-0 bottom-0">
        <div
          className="
            mx-auto w-full max-w-[520px]
            rounded-t-2xl bg-white shadow-soft
            p-4 pt-5
            pb-[calc(16px+env(safe-area-inset-bottom))]
            max-h-[min(80vh,calc(100svh-80px))]
            overflow-y-auto overscroll-contain
          "
        >
          <div className="flex items-center justify-between mb-2">
            {title ? (
              <h3 ref={titleRef} tabIndex={-1} className="text-base font-semibold">
                {title}
              </h3>
            ) : <div />}
            <button
              onClick={onClose}
              className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
              aria-label="Close modal"
              title="Close"
            >
              ×
            </button>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
