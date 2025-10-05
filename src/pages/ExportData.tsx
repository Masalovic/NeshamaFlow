// src/pages/ExportData.tsx
import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import Header from '../components/ui/Header';
import { loadHistory, type LogItem } from '../lib/history';
import { ready as storageReady } from '../lib/secureStorage';
import { track } from '../lib/metrics';
import { titleForRitualId } from '../lib/ritualEngine';

function toCSV(rows: (string | number | null)[][], header: string[]): string {
  const esc = (v: string | number | null) => {
    const s = v === null ? '' : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [header, ...rows].map(r => r.map(esc).join(','));
  // BOM so Excel opens as UTF-8
  return '\uFEFF' + lines.join('\n');
}

// Share if possible (mobile), else download
async function shareOrDownload(filename: string, mime: string, data: string) {
  const blob = new Blob([data], { type: mime });
  const file = new File([blob], filename, { type: mime });

  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return;
    }
  } catch {
    // fall through to download
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ExportData() {
  const [unlocked, setUnlocked] = useState<boolean>(storageReady());
  const [list, setList] = useState<LogItem[] | null>(null);

  // Wait for secureStorage key (after AppLock)
  useEffect(() => {
    if (unlocked) return;
    const id = setInterval(() => {
      if (storageReady()) {
        setUnlocked(true);
        clearInterval(id);
      }
    }, 250);
    return () => clearInterval(id);
  }, [unlocked]);

  // Load history
  useEffect(() => {
    if (!unlocked) return;
    let alive = true;
    (async () => {
      const h = await loadHistory();
      if (alive) setList(h);
    })();
    return () => {
      alive = false;
    };
  }, [unlocked]);

  const count = list?.length ?? 0;
  const ts = useMemo(() => dayjs().format('YYYYMMDD-HHmm'), []);
  const base = `neshama-history-${ts}`;

  async function exportJSON() {
    const data = JSON.stringify(list ?? [], null, 2);
    await shareOrDownload(`${base}.json`, 'application/json;charset=utf-8', data);
    track('export_json');
  }

  async function exportCSV() {
    const rows = (list ?? []).map(h => [
      h.id,
      h.ts,
      h.mood,
      h.ritualId,
      titleForRitualId(h.ritualId), // friendly name
      h.durationSec,
      h.note ?? '',
      h.source ?? '',
    ]);

    const header = [
      'id',
      'ts',
      'mood',
      'ritualId',
      'ritualTitle',
      'durationSec',
      'note',
      'source',
    ];

    const csv = toCSV(rows, header);
    await shareOrDownload(`${base}.csv`, 'text/csv;charset=utf-8', csv);
    track('export_csv');
  }

  const loading = list === null && unlocked;

  return (
    <div className="flex h-full flex-col">
      <Header title="Export (Pro)" back />
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[420px] mx-auto space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm font-medium">Your data</div>

            {!unlocked && (
              <p className="text-sm text-gray-600 mt-1">Unlocking secure storage…</p>
            )}

            {loading && (
              <p className="text-sm text-gray-600 mt-1">Loading sessions…</p>
            )}

            {list !== null && (
              <>
                <p className="text-sm text-gray-600 mt-1">
                  You currently have <span className="font-semibold">{count}</span> sessions stored on this device.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    className="btn btn-outline w-full"
                    onClick={exportJSON}
                    disabled={count === 0}
                  >
                    Export JSON
                  </button>
                  <button
                    className="btn btn-outline w-full"
                    onClick={exportCSV}
                    disabled={count === 0}
                  >
                    Export CSV
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  Exports include only your own logs from this device (synced entries included).
                  On mobile, we’ll try to open the system Share sheet; otherwise the file will download.
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
