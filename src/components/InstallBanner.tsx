import React from 'react';
import useInstallPrompt from '../hooks/useInstallPrompt';
import { Download } from 'lucide-react';

export default function InstallBanner() {
  const { canInstall, prompt, dismissFor } = useInstallPrompt();
  if (!canInstall) return null;

  return (
    <div className="pointer-events-auto fixed left-1/2 -translate-x-1/2 bottom-[72px] z-30 w-[min(92vw,380px)]">
      <div className="rounded-2xl bg-white shadow-soft border p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-brand-100/60 flex items-center justify-center">
          <Download size={18} className="text-brand-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">Install Neshama</div>
          <div className="text-xs text-gray-500 truncate">Add to Home Screen for a faster, full-screen experience.</div>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost h-9 px-3 text-xs"
            onClick={() => dismissFor(7)}
            aria-label="Not now"
          >
            Later
          </button>
          <button
            className="btn btn-primary h-9 px-3 text-xs"
            onClick={() => void prompt()}
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
