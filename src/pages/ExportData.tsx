import React, { useEffect, useState } from 'react'
import Header from '../components/ui/Header'
import { loadHistory, type LogItem } from '../lib/history'

function download(name: string, mime: string, data: string) {
  const blob = new Blob([data], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function ExportData() {
  const [history, setHistory] = useState<LogItem[] | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const list = await loadHistory()
      if (alive) setHistory(list)
    })()
    return () => { alive = false }
  }, [])

  function exportJSON() {
    const data = JSON.stringify(history ?? [], null, 2)
    download('neshama-history.json', 'application/json;charset=utf-8', data)
  }

  function exportCSV() {
    const rows = (history ?? []).map(h => [
      h.id,
      h.ts,
      h.mood,
      h.ritualId,
      h.durationSec,
      (h.note ?? '').replaceAll('"', '""'),
      h.source ?? ''
    ])
    const header = ['id','ts','mood','ritualId','durationSec','note','source']
    const csv = [header, ...rows].map(r =>
      r.map(x => (typeof x === 'string' ? `"${x}"` : String(x))).join(',')
    ).join('\n')
    download('neshama-history.csv', 'text/csv;charset=utf-8', csv)
  }

  const count = history?.length ?? 0

  return (
    <div className="flex h-full flex-col">
      <Header title="Export (Pro)" back />
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[420px] mx-auto space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm font-medium">Your data</div>
            <p className="text-sm text-gray-600 mt-1">
              You currently have <span className="font-semibold">{count}</span> sessions stored locally.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="btn btn-secondary w-full" onClick={exportJSON}>Export JSON</button>
              <button className="btn btn-secondary w-full" onClick={exportCSV}>Export CSV</button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Exports contain only your own logs from this device (synced items included).
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
