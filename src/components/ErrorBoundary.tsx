import React from 'react'
import { clearAll as secureClearAll } from '../lib/secureStorage'
// (Optional) metrics – add 'app_error' to EventName in metrics.ts if you want to track
import { track } from '../lib/metrics'

type Props = { children: React.ReactNode }
type State = { hasError: boolean; errMsg?: string }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, errMsg: '' }

  static getDerivedStateFromError(err: unknown): State {
    return { hasError: true, errMsg: err instanceof Error ? err.message : String(err) }
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    try {
      track('app_error', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        componentStack: info.componentStack,
      })
    } catch {/* no-op */}
    // Also log to console for dev
    console.error('ErrorBoundary caught:', error, info)
  }

  hardReload = () => window.location.reload()

  clearCacheAndReload = async () => {
    if (!confirm('Clear local encrypted data and reload? This signs you out locally.')) return
    try {
      secureClearAll()
      // clear any rogue SW caches
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.allSettled(regs.map(r => r.unregister()))
        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.allSettled(keys.map(k => caches.delete(k)))
        }
      }
    } catch {/* ignore */}
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="min-h-[100svh] grid place-items-center bg-gray-50 px-4">
        <div className="max-w-[420px] w-full rounded-2xl border bg-white p-4 shadow-soft">
          <div className="text-lg font-semibold">Something went wrong</div>
          <p className="text-sm text-gray-600 mt-1">
            The app hit an unexpected error. You can try reloading or clearing the local cache.
          </p>
          {this.state.errMsg && (
            <pre className="mt-3 text-xs bg-gray-50 rounded-lg p-2 overflow-x-auto">
              {this.state.errMsg}
            </pre>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="btn btn-secondary w-full" onClick={this.hardReload}>Reload</button>
            <button className="btn btn-outline w-full" onClick={this.clearCacheAndReload}>
              Clear cache & reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
