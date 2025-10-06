import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/ui/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { ALL_RITUALS, titleForRitualId } from '../lib/ritualEngine'
import { guideFor } from '../lib/ritualGuides'
import { setItem as sSet } from '../lib/secureStorage'

export default function RitualLibrary() {
  const navigate = useNavigate()
  const [detail, setDetail] = useState<string | null>(null)

  // keep stable reference; if you later add search/sort, adjust here
  const list = useMemo(() => ALL_RITUALS, [])

async function start(id: string) {
    await sSet('draft.ritual', id)
    navigate('/ritual/start')
  }

  return (
    <div className="flex h-full flex-col">
      <Header title="Rituals" back />
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[480px] mx-auto space-y-3">
          {list.map(r => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{titleForRitualId(r.id)}</div>
                  {!!r.durationSec && (
                    <div className="text-xs text-gray-500">
                      ~ {Math.max(1, Math.round(r.durationSec / 60))} min
                    </div>
                  )}
                  {r.whyBullets?.length ? (
                    <ul className="mt-2 text-sm text-gray-600 list-disc pl-5 space-y-1">
                      {r.whyBullets.slice(0, 2).map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  ) : null}
                </div>
                <Button variant="primary" onClick={() => start(r.id)}>Start</Button>
              </div>

              <button
                className="mt-3 text-sm text-brand-700 underline"
                onClick={() => setDetail(r.id)}
              >
                Details
              </button>
            </Card>
          ))}
        </div>
      </main>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? titleForRitualId(detail) : ''}
      >
        {detail && (() => {
          const r = list.find(x => x.id === detail)!
          const g = guideFor(r) // ✅ pass Ritual object

          return (
            <div className="space-y-3">
              {r.why && <div className="text-sm text-gray-700">{r.why}</div>}
              {r.whyBullets?.length ? (
                <ul className="list-disc pl-5 space-y-1 text-gray-600 text-sm">
                  {r.whyBullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              ) : null}

              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Steps</div>
                <ol className="list-decimal pl-5 space-y-1 text-gray-700 text-sm">
                  {g.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
                {g.tip && <p className="text-xs text-gray-500 mt-2">{g.tip}</p>}
              </div>

              <div className="pt-2">
                <Button variant="primary" onClick={() => start(r.id)}>Start this</Button>
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
