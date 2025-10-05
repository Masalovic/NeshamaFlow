import React, { useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

/**
 * Mobile-safe bottom sheet:
 * - hidden when closed (no overlay catching taps)
 * - full-screen overlay with high z-index
 * - content max-height within safe viewport, scrollable
 * - safe-area padding so it never sits under the bottom nav / gesture bar
 * - locks body scroll while open
 */
export default function Modal({ open, onClose, title, children }: Props) {
  // Lock the body scroll when open
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null; // <-- important: no invisible overlay when closed

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Dim background */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* Sheet */}
      <div className="absolute inset-x-0 bottom-0">
        <div
          className="
            mx-auto w-full max-w-[520px]
            rounded-t-2xl bg-white shadow-soft
            p-4 pt-5
            pb-[calc(16px+env(safe-area-inset-bottom))]
            max-h-[min(85vh,calc(100svh-80px))]
            overflow-y-auto overscroll-contain
          "
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            {title ? <h3 className="text-base font-semibold">{title}</h3> : <div />}
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
