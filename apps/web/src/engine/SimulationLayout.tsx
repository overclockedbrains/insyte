'use client'

import { useEffect, useCallback } from 'react'
import type { Scene } from '@insyte/scene-engine'
import { useBoundStore } from '@/src/stores/store'
import { SimulationNav } from '@/components/simulation/SimulationNav'
import { ChallengesSection } from '@/components/simulation/ChallengesSection'
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
  slug: string
}

// ─── Layout selector ──────────────────────────────────────────────────────────

function LayoutComponent({ scene }: { scene: Scene }) {
  switch (scene.layout) {
    case 'text-left-canvas-right':
      return <TextLeftCanvasRight scene={scene} />
    case 'code-left-canvas-right':
      return <CodeLeftCanvasRight scene={scene} />
    case 'canvas-only':
    default:
      return <CanvasOnly scene={scene} />
  }
}

// ─── Chat FAB stub (Phase 8) ──────────────────────────────────────────────────

function ChatButtonStub() {
  return (
    <div
      className="fixed bottom-6 right-6 z-30 h-12 w-12 rounded-full
        bg-surface-container-high border border-outline-variant/30
        flex items-center justify-center
        shadow-lg cursor-pointer
        hover:border-primary/30 hover:bg-surface-container-highest
        transition-all duration-200"
      title="AI Chat (coming soon)"
      aria-label="AI Chat (coming soon)"
    >
      <span className="text-lg select-none" role="img" aria-label="chat">
        💬
      </span>
    </div>
  )
}

// ─── SimulationLayout ─────────────────────────────────────────────────────────

export function SimulationLayout({ scene, slug }: SimulationLayoutProps) {
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
      {/* ── Sticky simulation nav (below global Navbar at sticky top-14) ── */}
      <SimulationNav title={scene.title} category={scene.category} slug={slug} />

      {/* ── Canvas area ─────────────────────────────────────────────────────
           Fixed height = 100vh − global nav (3.5rem) − sim nav (3rem) = 6.5rem
           This keeps the canvas in-viewport regardless of what renders below.
           When expanded, pointer-events disabled so clicks pass to the overlay. ── */}
      <div
        className={[
          'h-[calc(100vh-6.5rem)] flex-shrink-0',
          'flex flex-col min-h-0',
          isExpanded ? 'pointer-events-none' : '',
        ].join(' ')}
      >
        <LayoutComponent scene={scene} />
      </div>

      {/* ── Challenges section (below the canvas fold, page scrolls to reach) ── */}
      {scene.challenges && scene.challenges.length > 0 && (
        <ChallengesSection challenges={scene.challenges} />
      )}

      {/* ── AI Chat FAB (stub — Phase 8 replaces this) ── */}
      <ChatButtonStub />
    </div>
  )
}
