'use client'

import dynamic from 'next/dynamic'

// Lazy-loads LiveDemo on the client only.
// LiveDemo uses Zustand + Framer Motion + scene-engine — heavy client deps.
// ssr: false prevents SSR from attempting to render a simulation canvas.
const LiveDemoInner = dynamic(
  () => import('@/components/landing/LiveDemo').then((m) => m.LiveDemo),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full rounded-3xl border border-primary/20 bg-surface-container animate-pulse"
        style={{ aspectRatio: '16/11' }}
      />
    ),
  },
)

interface LiveDemoLoaderProps {
  compact?: boolean
}

export function LiveDemoLoader({ compact = false }: LiveDemoLoaderProps) {
  return <LiveDemoInner compact={compact} />
}
