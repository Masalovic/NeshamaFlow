import React from 'react'
import { setPro } from '../lib/pro'
import { track } from '../lib/metrics'

export default function UpgradeCard() {
  return (
    <div className="rounded-xl border p-4 bg-white text-sm">
      <div className="font-medium mb-1">Pro feature</div>
      <p className="text-gray-600 mb-3">Get deeper insights and export your data.</p>
      <button
        className="btn btn-primary"
        onClick={async () => {
          track('upgrade_click', { source: 'upgrade_card' })
          await setPro(true)
          track('pro_enabled')
        }}
      >
        Upgrade to Pro
      </button>
    </div>
  )
}
