import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCcw } from 'lucide-react';

export default function PWAUpdateBanner() {
  const { needRefresh, updateServiceWorker } = useRegisterSW();
  const [closed, setClosed] = useState(false);

  // If a new refresh cycle starts later, allow the banner to show again
  useEffect(() => {
    if (!needRefresh) setClosed(false);
  }, [needRefresh]);

  if (!needRefresh || closed) return null;

  async function onUpdate() {
    // Hide immediately for snappier UX; SW will reload the page soon after
    setClosed(true);
    try {
      await updateServiceWorker(true); // skipWaiting + reload
    } catch {
      // If reload doesn't happen for any reason, we keep it hidden for this session
    }
  }

  return (
    <div
      className="fixed left-0 right-0 z-40 px-3 pb-[env(safe-area-inset-bottom)]
                 bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom))]
                 pointer-events-none"
      aria-live="polite"
    >
      <div className="mx-auto max-w-[420px] rounded-xl border bg-white shadow-soft p-3
                      flex items-center gap-3 pointer-events-auto">
        <RefreshCcw size={16} className="text-brand-700" />
        <div className="flex-1 text-sm">A new version is available.</div>
        <button className="btn btn-primary" onClick={onUpdate}>
          Update
        </button>
      </div>
    </div>
  );
}
