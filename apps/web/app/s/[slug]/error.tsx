'use client'

import { useEffect } from 'react'

interface SimulationRouteErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function SimulationRouteError({ error, reset }: SimulationRouteErrorProps) {
  useEffect(() => {
    console.error('[Simulation route error]', error)
  }, [error])

  return (
    <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div className="glass-panel w-full max-w-xl rounded-3xl border border-error/30 p-6">
        <h2 className="text-lg font-bold font-headline text-on-surface">
          Simulation route failed
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          The page failed while loading this simulation. Retry the route.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-on-primary bg-primary hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
