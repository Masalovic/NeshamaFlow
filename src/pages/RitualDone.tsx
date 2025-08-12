import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { encryptSave } from '../lib/storage'
export default function RitualDone(){
  const navigate = useNavigate()
  useEffect(()=>{ encryptSave('mood', null); encryptSave('note', '') }, [])
  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow p-6 text-center max-w-[320px]">
          <div className="text-2xl font-semibold mb-2">Nice work ✨</div>
          <p className="text-gray-600 mb-4">Your ritual is logged.</p>
          <div className="flex gap-3">
            <button className="flex-1 h-12 rounded-md bg-purple-600 text-white" onClick={()=>navigate('/log')}>Log another mood</button>
            <button className="flex-1 h-12 rounded-md border" onClick={()=>navigate('/log')}>Home</button>
          </div>
        </div>
      </div>
    </div>
  )
}