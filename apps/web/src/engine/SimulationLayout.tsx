'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState } from 'react'
import type { Scene } from '@insyte/scene-engine'
import { useBoundStore } from '@/src/stores/store'
import { ChatButton } from '@/components/chat/ChatButton'
import { ErrorBoundary } from '@/src/components/ErrorBoundary'
import { TextLeftCanvasRight } from './layouts/TextLeftCanvasRight'
import { CodeLeftCanvasRight } from './layouts/CodeLeftCanvasRight'
import { CanvasOnly } from './layouts/CanvasOnly'
import { usePlaybackTick } from './hooks/usePlayback'
import { usePlaybackKeyboard } from '@/src/hooks/usePlaybackKeyboard'

const ChatCard = dynamic(
  () => import('@/components/chat/ChatCard').then((mod) => mod.ChatCard),
  { ssr: false },
)

const ChallengesSection = dynamic(
  () =>
    import('@/components/simulation/ChallengesSection').then(
      (mod) => mod.ChallengesSection,
    ),
  {
    loading: () => <ChallengesLoadingSkeleton />,
  },
)

interface SimulationLayoutProps {
  scene: Scene
  onRerunWithCustomInput?: (() => void) | null
}

function ChallengesLoadingSkeleton() {
  return (
    <section className="border-t border-outline-variant/20 bg-surface-container-low/40 px-4 sm:px-6 py-4">
      <div className="h-5 w-28 rounded animate-pulse bg-surface-container-high" />
      <div className="mt-4 flex gap-3 overflow-hidden" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-24 min-w-[220px] rounded-2xl animate-pulse bg-surface-container-high"
          />
        ))}
      </div>
    </section>
  )
}

function LayoutComponent({
  scene,
  onRerunWithCustomInput,
}: {
  scene: Scene
  onRerunWithCustomInput?: (() => void) | null
}) {
  switch (scene.layout) {
    case 'text-left-canvas-right':
      return <TextLeftCanvasRight scene={scene} />
    case 'code-left-canvas-right':
      return <CodeLeftCanvasRight scene={scene} onRerunWithCustomInput={onRerunWithCustomInput} />
    case 'canvas-only':
    default:
      return <CanvasOnly scene={scene} />
  }
}

export function SimulationLayout({
  scene,
  onRerunWithCustomInput = null,
}: SimulationLayoutProps) {
  usePlaybackTick()
  usePlaybackKeyboard()

  const toggleExpanded = useBoundStore((s) => s.toggleExpanded)
  const isExpanded = useBoundStore((s) => s.isExpanded)
  const isStreaming = useBoundStore((s) => s.isStreaming)
  const [layoutRenderKey, setLayoutRenderKey] = useState(0)

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        toggleExpanded()
      }
    },
    [toggleExpanded],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  return (
    <div className="flex flex-col">
      <ErrorBoundary onRetry={() => setLayoutRenderKey((prev) => prev + 1)}>
        <div
          key={layoutRenderKey}
          className={[
            'h-[calc(100vh-3.5rem)] flex-shrink-0',
            'flex flex-col min-h-0',
            isExpanded ? 'pointer-events-none' : '',
          ].join(' ')}
        >
          <LayoutComponent scene={scene} onRerunWithCustomInput={onRerunWithCustomInput} />
        </div>
      </ErrorBoundary>

      {scene.challenges && scene.challenges.length > 0 &&
        (isStreaming ? (
          <ChallengesLoadingSkeleton />
        ) : (
          <ChallengesSection challenges={scene.challenges} />
        ))}

      <ChatButton />
      <ChatCard />
    </div>
  )
}
