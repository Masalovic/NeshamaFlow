import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import EmojiGrid from '../components/EmojiGrid'
import Header from '../components/ui/Header'
import StreakCard from '../components/StreakCard'
import { loadHistory, type LogItem } from '../lib/history'
import { track } from '../lib/metrics'
import { setItem as sSet } from '../lib/secureStorage'
import { SlidersHorizontal } from 'lucide-react'

export default function MoodLog() {
  const [mood, setMood] = useState('')
  const [note, setNote] = useState('')
  const [last, setLast] = useState<{ emoji: string; date: string } | null>(null)
  const nav = useNavigate()

  // Last logged item (from encrypted local history)
  useEffect(() => {
    let alive = true
    ;(async () => {
      const items: LogItem[] = await loadHistory()
      if (!alive || !items.length) return
      const it = items[0]
      setLast({
        emoji: String(it.mood),
        date: dayjs(it.ts).format('DD MMM, HH:mm'),
      })
    })()
    return () => { alive = false }
  }, [])

  async function next() {
    if (!mood) return
    // Persist current selection for the ritual flow (encrypted)
    await sSet('mood', mood)
    await sSet('note', note.trim())
    track('mood_selected', { mood })
   // If this is the first ever mood (no history yet), tag it
    try {
      const items = await loadHistory()
      if (!items.length) track('first_mood', { mood })
     } catch {}
    nav('/ritual')
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <Header title="How are you feeling?" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[420px] mx-auto p-4 space-y-4">
          <StreakCard />

          <div className="rounded-2xl bg-white shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Select your mood</div>
              <button
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                onClick={() => nav('/settings')}
                aria-label="Settings"
                title="Settings"
              >
                <SlidersHorizontal size={14} />
                Settings
              </button>
            </div>

            {/* match EmojiGrid API */}
            <EmojiGrid selected={mood} onSelect={setMood} />
          </div>

          <div className="rounded-2xl bg-white shadow p-4">
            <label className="block text-sm text-gray-600 mb-2">Add a note (optional)</label>
            <textarea
              className="w-full min-h-[80px] rounded-xl border px-3 py-2 text-sm"
              placeholder="What’s on your mind?"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            {last && (
              <p className="text-xs text-gray-500 px-1 mt-2">
                Last Logged Mood: <span className="text-base">{last.emoji}</span> on {last.date}
              </p>
            )}
          </div>

          {/* Primary action */}
          <button
            onClick={next}
            disabled={!mood}
            className="btn btn-primary w-full mt-1 disabled:opacity-40"
          >
            Start Ritual
          </button>
        </div>
      </main>
    </div>
  )
}
