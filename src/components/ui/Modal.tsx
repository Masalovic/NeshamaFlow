import React from 'react'

export default function Modal({ open, onClose, title, children }:{
  open:boolean; onClose:()=>void; title:string; children:React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30">
      <div className="bg-white w-full sm:w-[380px] rounded-t-2xl sm:rounded-2xl shadow-soft p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="btn btn-ghost h-8 px-2">✕</button>
        </div>
        <div className="text-sm text-gray-700">{children}</div>
      </div>
    </div>
  )
}
