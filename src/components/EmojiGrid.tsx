import React from 'react'

export interface EmojiGridProps { selected?: string; onSelect: (e:string)=>void }

const DATA = [
  { e:'😊', label:'Happy' }, { e:'🙂', label:'Content' }, { e:'😌', label:'Calm/Relaxed' }, { e:'😔', label:'Sad' },
  { e:'😐', label:'Neutral' }, { e:'🤔', label:'Reflective' }, { e:'😫', label:'Stressed' }, { e:'😠', label:'Angry' }
]

export default function EmojiGrid({ selected, onSelect }: EmojiGridProps) {
  return (
    <div className="grid grid-cols-4 gap-3 p-4 bg-white rounded-2xl border border-brand-200/40">
      {DATA.map(({e,label}) => (
        <button key={e} onClick={()=>onSelect(e)} className="flex flex-col items-center gap-1">
          <span className={
            'w-12 h-12 text-[26px] flex items-center justify-center rounded-xl bg-brand-200/40 ' +
            (selected===e ? 'ring-2 ring-brand-300 bg-white' : 'hover:bg-brand-200/60')
          } aria-pressed={selected===e}>{e}</span>
          <span className="text-[11px] text-gray-600">{label}</span>
        </button>
      ))}
    </div>
  )
}
