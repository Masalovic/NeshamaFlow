import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/ui/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { ALL_RITUALS, titleForRitualId } from '../lib/ritualEngine'
import { guideFor } from '../lib/ritualGuides'
import { setItem as sSet } from '../lib/secureStorage'
import { track } from '../lib/metrics'
import { useDebounce } from '../hooks/useDebounce'

type FilterKey = 'all' | string

export default function RitualLibrary() {
  const navigate = useNavigate()
  const [detail, setDetail] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const q = useDebounce(query, 200)

  useEffect(() => { track('library_opened') }, [])

  // Build dynamic chips from all ritual tags if present
  const chips: FilterKey[] = useMemo(() => {
    const set = new Set<string>()
    for (const r of ALL_RITUALS) (r as any).tags?.forEach((t: string) => set.add(t))
    const arr = Array.from(set).sort()
    return (arr.length ? (['all', ...arr] as FilterKey[]) : (['all'] as FilterKey[]))
  }, [])

  const [filter, setFilter] = useState<FilterKey>('all')

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return ALL_RITUALS.filter(r => {
      const name = titleForRitualId(r.id).toLowerCase()
      const tags: string[] = (r as any).tags ?? []
      const matchesQ = !qq || name.includes(qq) || tags.some(t => t.toLowerCase().includes(qq))
      const matchesChip = filter === 'all' || tags.includes(filter)
      return matchesQ && matchesChip
    })
  }, [q, filter])

  async function start(id: string) {
    track('library_start_clicked', { ritualId: id })
    await sSet('draft.ritual', id)
    navigate('/ritual/start')
  }

  function openDetails(id: string) {
    setDetail(id)
    track('library_detail_viewed', { ritualId: id })
  }

  return (
    <div className="flex h-full flex-col">
      <Header title="Rituals" back />
      <main className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-[560px] space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search rituals…"
              className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-gray-400"
              autoCorrect="off"
              autoCapitalize="none"
              aria-label="Search rituals"
            />
            {query && (
              <Button variant="ghost" onClick={() => setQuery('')}>Clear</Button>
            )}
          </div>

          {/* Chips */}
          <div className="flex flex-wrap gap-2">
            {chips.map(k => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={[
                  'px-3 py-1.5 rounded-full text-sm border transition-colors',
                  filter === k
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-400'
                ].join(' ')}
                aria-pressed={filter === k}
              >
                {k === 'all' ? 'All' : k}
              </button>
            ))}
          </div>

          {/* List */}
          {!list.length ? (
            <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600">
              No matches. Try a different search or filter.
            </div>
          ) : (
            <div className="space-y-3">
              {list.map(r => (
                <Card key={r.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{titleForRitualId(r.id)}</div>
                      {!!r.durationSec && (
                        <div className="text-xs text-gray-500">
                          ~ {Math.max(1, Math.round(r.durationSec / 60))} min
                        </div>
                      )}
                      {(r as any).tags?.length ? (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {(r as any).tags.map((t: string) => (
                            <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {r.whyBullets?.length ? (
                        <ul className="mt-2 text-sm text-gray-600 list-disc pl-5 space-y-1">
                          {r.whyBullets.slice(0, 2).map((b, i) => <li key={i}>{b}</li>)}
                        </ul>
                      ) : null}
                    </div>
                    <Button variant="primary" onClick={() => start(r.id)}>Start</Button>
                  </div>

                  <button
                    className="mt-3 text-sm link-accent"
                    onClick={() => openDetails(r.id)}
                  >
                    Details
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Details modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? titleForRitualId(detail) : ''}
      >
        {detail && (() => {
          const r = ALL_RITUALS.find(x => x.id === detail)!
          const g = guideFor(r)
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
