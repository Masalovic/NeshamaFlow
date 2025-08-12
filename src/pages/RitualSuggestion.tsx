
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { decryptLoad } from '../lib/storage'
import { getRitualForMood, isMoodKey, type Ritual } from '../lib/ritualEngine'
import Header from '../components/ui/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'

export default function RitualSuggestion() {
  const navigate = useNavigate()
  const [ritual, setRitual] = useState<Ritual | null>(null)
  const [whyOpen, setWhyOpen] = useState(false)

  useEffect(() => {
    const moodRaw = decryptLoad<unknown>('mood')
    if (!isMoodKey(moodRaw)) {
      // mood missing or invalid → send user to log it again
      navigate('/log', { replace: true })
      return
    }
    setRitual(getRitualForMood(moodRaw))
  }, [navigate])

  if (!ritual) return null

  return (
    <div className="flex flex-col h-full">
      <Header title="Your Ritual" back />
      <main className="flex-1 overflow-y-auto px-4">
        <div className="max-w-[340px] mx-auto">
          <Card>
            <h2 className="text-xl font-semibold mb-1 font-heading">{ritual.title}</h2>
            <p className="text-xs text-gray-500 mb-4">~ {Math.round(ritual.durationSec / 60)} min</p>

            <Button onClick={() => navigate('/ritual/start')} variant="primary">
              Start Ritual
            </Button>

            <button
              onClick={() => setWhyOpen(true)}
              className="mt-3 text-sm text-brand-700 underline"
            >
              Why it works
            </button>

            <Modal open={whyOpen} onClose={() => setWhyOpen(false)} title="Why it works">
              <p className="text-sm text-gray-700">{ritual.why}</p>
              <ul className="mt-3 list-disc pl-5 space-y-1 text-gray-600 text-sm">
                {(ritual.whyBullets?.length ? ritual.whyBullets : [
                  'Activates parasympathetic nervous system',
                  'Evidence-backed micro-practice',
                  'Designed to finish in under 2 minutes',
                ]).map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </Modal>
          </Card>
        </div>
      </main>
    </div>
  )
}
