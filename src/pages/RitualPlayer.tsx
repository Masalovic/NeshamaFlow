import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { decryptLoad } from '../lib/storage'
import { getRitualForMood } from '../lib/ritualEngine'
import type { Ritual, MoodKey } from '../lib/ritualEngine'
import { appendHistory } from '../lib/history'
import { syncHistoryUp } from '../lib/sync'
import ProgressRing from '../components/ProgressRing'
import Header from '../components/ui/Header'

const MOOD_KEYS: MoodKey[] = ['😊','🙂','😌','😔','😐','🤔','😫','😠']
const isMoodKey = (x: unknown): x is MoodKey =>
  typeof x === 'string' && MOOD_KEYS.includes(x as MoodKey)

export default function RitualPlayer() {
  const navigate = useNavigate()

  // load mood & note from encrypted local storage
  const rawMood = decryptLoad<unknown>('mood')
  const note = decryptLoad<string>('note') || ''
  const mood: MoodKey | null = isMoodKey(rawMood) ? rawMood : null

  // pick ritual for mood
  const ritual: Ritual | null = useMemo(
    () => (mood ? getRitualForMood(mood) : null),
    [mood]
  )

  const [remaining, setRemaining] = useState<number>(ritual?.durationSec ?? 120)
  const [running, setRunning] = useState(false)
  const timerRef = useRef<number | null>(null)

  // redirect if no ritual/mood
  useEffect(() => {
    if (!mood || !ritual) navigate('/log')
  }, [mood, ritual, navigate])

  // keep timer in sync with ritual duration
  useEffect(() => {
    setRemaining(ritual?.durationSec ?? 120)
    setRunning(false)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [ritual])

  // ticking
  useEffect(() => {
    if (!running) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      return
    }
    timerRef.current = window.setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [running])

  if (!ritual) return null

  const progress = 1 - remaining / ritual.durationSec
  const timeLabel =
    `${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`

  async function handleComplete() {
    if (!mood || !ritual) return
    appendHistory({ ts: Date.now(), mood, note, ritualId: ritual.id, durationSec: ritual.durationSec })
    ;(navigator as any).vibrate?.(20)
    syncHistoryUp().catch(() => {})   // fire-and-forget
    navigate('/ritual/done')
  }

  return (
    <div className="flex h-full flex-col">
      <Header title={ritual.title} back />
      <main className="flex-1 p-6 flex flex-col items-center justify-center gap-6">
        <ProgressRing progress={progress}>{timeLabel}</ProgressRing>

        <div className="text-center text-gray-600 max-w-[320px]">
          Breathe softly. If thoughts arise, let them pass and return to your breath.
        </div>

        <div className="flex gap-3 w-full max-w-[320px]">
          <button onClick={() => setRunning(r => !r)} className="btn btn-secondary flex-1">
            {running ? 'Pause' : 'Start'}
          </button>
          <button
            onClick={handleComplete}
            disabled={remaining > 0}
            className="btn btn-primary flex-1 disabled:opacity-40"
          >
            Complete
          </button>
        </div>
      </main>
    </div>
  )
}
