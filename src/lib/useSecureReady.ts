// src/lib/useSecureReady.ts
import { useEffect, useState } from 'react'
import { ready } from './secureStorage'

export function useSecureReady(pollMs = 250): boolean {
  const [ok, setOk] = useState(ready())
  useEffect(() => {
    if (ok) return
    const id = setInterval(() => setOk(ready()), pollMs)
    return () => clearInterval(id)
  }, [ok, pollMs])
  return ok
}
