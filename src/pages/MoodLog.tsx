import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import EmojiGrid from '../components/EmojiGrid'
import Header from '../components/ui/Header'
import StreakCard from '../components/StreakCard'
import { encryptSave } from '../lib/storage'
import { loadHistory } from '../lib/history'
import { Music2, Info, Plus, SlidersHorizontal } from 'lucide-react'

export default function MoodLog() {
  const [mood, setMood] = useState('')
  const [note, setNote] = useState('')
  const nav = useNavigate()

  const last = useMemo(() => {
    const h = loadHistory(); const item = h[h.length-1]; if(!item) return null
    return { emoji: item.mood, date: dayjs(item.ts).format('YYYY-MM-DD') }
  }, [])

  function next(){
    if(!mood) return
    encryptSave('mood', mood); encryptSave('note', note.trim())
    nav('/ritual')
  }

  return (
    <div className="flex h-full flex-col">
      <Header title="How are you feeling?" />
      <main className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="max-w-[360px] mx-auto space-y-4">
          <EmojiGrid selected={mood} onSelect={setMood} />

          <input className="input" value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note…" maxLength={280} />

          
          {last && (
            <p className="text-xs text-gray-500 px-1">
              Last Logged Mood: <span className="text-base">{last.emoji}</span> on {last.date}
            </p>
          )}

        
          <button onClick={next} disabled={!mood} className="btn btn-primary w-full mt-1 disabled:opacity-40">
            Start Ritual
          </button>
        </div>
      </main>
    </div>
  )
}
