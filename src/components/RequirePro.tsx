import React, { useEffect, useState } from 'react'
import { isPro, setPro } from '../lib/pro'
import { track } from '../lib/metrics'

type Props = {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function RequirePro({ children, fallback }: Props) {
  const [pro, setProState] = useState<boolean | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const val = await isPro()
      if (alive) setProState(val)
    })()
    return () => { alive = false }
  }, [])

  if (pro === null) return null // or a tiny spinner

  if (!pro) {
    if (fallback) return <>{fallback}</>
    return (
      <div className="rounded-xl border p-4 bg-white text-sm">
        <div className="font-medium mb-1">Pro feature</div>
        <p className="text-gray-600 mb-3">
          Unlock this feature with Pro (preview toggle during dev).
        </p>
        <button
          className="btn btn-primary"
          onClick={async () => {
            track('upgrade_click', { source: 'require_pro' })
            await setPro(true)
            setProState(true)
            track('pro_enabled')
          }}
        >
          Enable Pro
        </button>
      </div>
    )
  }

  return <>{children}</>
}
