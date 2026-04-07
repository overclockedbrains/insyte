'use client'

import { useEffect, useCallback } from 'react'
import type { Scene } from '@insyte/scene-engine'
import { useBoundStore } from '@/src/stores/store'
import { ChallengesSection } from '@/components/simulation/ChallengesSection'
import { ChatButton } from '@/components/chat/ChatButton'
import { ChatCard } from '@/components/chat/ChatCard'
import { TextLeftCanvasRight } from './layouts/TextLeftCanvasRight'
import { CodeLeftCanvasRight } from './layouts/CodeLeftCanvasRight'
import { CanvasOnly } from './layouts/CanvasOnly'
import { usePlaybackTick } from './hooks/usePlayback'

// ─── SimulationLayout ─────────────────────────────────────────────────────────
// Phase 4 orchestrator component. Renders:
//   1. SimulationNav (sticky, below global Navbar)
//   2. Correct layout component based on scene.layout
//   3. ChallengesSection below the canvas
//   4. ChatButton FAB stub (Phase 8 wires the real one)
//
// Also owns the 'f' keyboard shortcut for expand/collapse.

interface SimulationLayoutProps {
  scene: Scene
  onRerunWithCustomInput?: (() => void) | null
}

// ─── Layout selector ──────────────────────────────────────────────────────────

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

// ─── SimulationLayout ─────────────────────────────────────────────────────────

export function SimulationLayout({
  scene,
  onRerunWithCustomInput = null,
}: SimulationLayoutProps) {
  // Drive auto-advance ticks at the orchestrator level (exactly once)
  usePlaybackTick()

  const toggleExpanded = useBoundStore((s) => s.toggleExpanded)
  const isExpanded = useBoundStore((s) => s.isExpanded)

  // 'f' key toggles full-canvas expand/collapse
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      // Don't fire when user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
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
    // Root is a plain flex-col — height determined by its children, page scrolls.
    <div className="flex flex-col">
      {/* ── Canvas area ─────────────────────────────────────────────────────
           Fixed height = 100vh − global Navbar (3.5rem = h-14).
           Scene title/share/expand live in the Navbar when activeScene is set.
           When expanded, pointer-events disabled so clicks pass to the overlay. ── */}
      <div
        className={[
          'h-[calc(100vh-3.5rem)] flex-shrink-0',
          'flex flex-col min-h-0',
          isExpanded ? 'pointer-events-none' : '',
        ].join(' ')}
      >
        <LayoutComponent scene={scene} onRerunWithCustomInput={onRerunWithCustomInput} />
      </div>

      {/* ── Challenges section (below the canvas fold, page scrolls to reach) ── */}
      {scene.challenges && scene.challenges.length > 0 && (
        <ChallengesSection challenges={scene.challenges} />
      )}

      {/* ── AI Chat FAB + card ── */}
      <ChatButton />
      <ChatCard />
    </div>
  )
}
