import React from 'react'
import { loadHistory } from '../lib/history'
import Heatmap28 from '../components/Heatmap28'


export default function History(){
  const items = loadHistory().slice(-20).reverse()
  return (
    <div className="flex h-full flex-col bg-gray-50">
      <header className="h-12 flex items-center justify-center border-b bg-white">
        <h1 className="text-lg font-semibold">History</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-4">
      <div className="max-w-[360px] mx-auto space-y-3">
        <Heatmap28/>
          {items.length===0 && <div className="text-center text-gray-500">No sessions yet.</div>}
          {items.map((it, idx)=>(
            <div key={idx} className="bg-white rounded-lg shadow p-3 flex justify-between items-center">
              <div>
                <div className="text-sm font-medium">{new Date(it.ts).toLocaleString()}</div>
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