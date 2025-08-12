import React from 'react'
import Header from '../components/ui/Header'
import { encryptSave } from '../lib/storage'

export default function Settings(){
  function clearAll(){
    localStorage.clear()
    alert('All local data cleared.')
  }
  return (
    <div className="flex h-full flex-col">
      <Header title="Settings" back/>
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[360px] mx-auto space-y-4">
          <div className="card">
            <div className="text-sm font-medium">Privacy</div>
            <p className="text-sm text-gray-600 mt-1">
              Your moods and rituals are stored locally on your device and encrypted with your app secret.
            </p>
          </div>
          <button className="btn btn-secondary w-full" onClick={clearAll}>Clear all local data</button>
        </div>
      </main>
    </div>
  )
}
