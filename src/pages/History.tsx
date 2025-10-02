import React, { useEffect, useState } from 'react'
import { loadHistory, type LogItem } from '../lib/history'
import { ready as storageReady } from '../lib/secureStorage'
import Heatmap28 from '../components/Heatmap28'

export default function History() {
  const [items, setItems] = useState<LogItem[] | null>(null)
  const [unlocked, setUnlocked] = useState<boolean>(storageReady())

  // Poll until AppLock sets the in-memory encryption key
  useEffect(() => {
    if (unlocked) return
    const id = setInterval(() => {
      if (storageReady()) {
        setUnlocked(true)
        clearInterval(id)
      }
    }, 250)
    return () => clearInterval(id)
  }, [unlocked])

  // Load history once unlocked
  useEffect(() => {
    if (!unlocked) return
    let alive = true
    ;(async () => {
      const list = await loadHistory()       // returns [] if nothing stored
      const last20 = list.slice(-20).reverse() // newest-first in UI
      if (alive) setItems(last20)
    })()
    return () => { alive = false }
  }, [unlocked])

  const empty = items && items.length === 0

  return (
    <div className="flex h-full flex-col bg-gray-50">
     <header className="h-12 flex items-center justify-between border-b bg-white px-3">
  <h1 className="text-lg font-semibold">History</h1>
  <a
    href="/insights"
    className="text-xs text-brand-700 underline"
    aria-label="See Insights"
  >
    Insights
  </a>
</header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[360px] mx-auto space-y-3">
          {/* Heatmap reads history internally; we'll refactor it later if needed */}
          <Heatmap28 />

          {items === null && (
            <div className="text-center text-gray-400">Loading…</div>
          )}

          {empty && (
            <div className="text-center text-gray-500">No sessions yet.</div>
          )}

          {(items ?? []).map(it => (
            <div
              key={it.id}
              className="bg-white rounded-lg shadow p-3 flex justify-between items-center"
            >
              <div>
                <div className="text-sm font-medium">
                  {new Date(it.ts).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Ritual: {it.ritualId}</div>
              </div>
              <div className="text-xl">🧘‍♀️</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
