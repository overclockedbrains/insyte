'use client'

import { useEffect, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Scene } from '@insyte/scene-engine'
import { useBoundStore } from '@/src/stores/store'
import { DotGridBackground } from '@/components/layout/DotGridBackground'
import { PlaybackControls } from '../controls/PlaybackControls'
import { ControlBar } from '../controls/ControlBar'
import { StepPopup } from '../annotations/StepPopup'
import { PrimitiveRegistry } from '../primitives'
import { computeVisualStateAtStep } from '@insyte/scene-engine'
import { usePlayback } from '../hooks/usePlayback'

// ─── CanvasCard ────────────────────────────────────────────────────────────────
// The dark card container that wraps the simulation canvas visuals.
// Sections (top to bottom):
//   1. PlaybackControls bar (always present)
//   2. Visualization area (main area with primitives and popups)
//   3. ControlBar (sliders, toggles, stat cards)
//
// Full-canvas expand: card expands to fill viewport via fixed overlay.
// z-index: 60 — above global Navbar (z-50) and SimulationNav (z-40).

interface CanvasCardProps {
  scene: Scene
}

// ─── Inner canvas visualization ───────────────────────────────────────────────

function CanvasVisualization({ scene }: { scene: Scene }) {
  const { currentStep } = usePlayback()

  const visiblePopups = scene.popups.filter(
    (p) =>
      currentStep >= p.showAtStep &&
      (p.hideAtStep === undefined || currentStep < p.hideAtStep),
  )

  return (
    <div className="relative flex-1 min-h-0 overflow-auto">
      {/* Dot grid background */}
      <div className="absolute inset-0 pointer-events-none">
        <DotGridBackground opacity={0.3} />
      </div>

      {/* Content in normal flex flow: popups first (above), then primitives */}
      <div className="relative z-10 w-full min-h-full p-6 flex flex-col items-center gap-4 justify-start">
        {/* Step popups — in flow so they push primitives down, no overlap */}
        {visiblePopups.map((popup) => (
          <StepPopup
            key={popup.id}
            text={popup.text}
            style={popup.style}
            visible={true}
          />
        ))}

        {/* Primitives */}
        {scene.visuals.map((visual) => {
          const PrimitiveComponent = PrimitiveRegistry[visual.type]
          if (!PrimitiveComponent) return null
          const state = computeVisualStateAtStep(scene, visual.id, currentStep)
          return (
            <PrimitiveComponent
              key={visual.id}
              id={visual.id}
              state={state}
              step={currentStep}
            />
          )
        })}

        {scene.visuals.length === 0 && (
          <p className="text-sm text-on-surface-variant italic mt-10">
            No visuals defined in this scene.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Shared card content ──────────────────────────────────────────────────────

function CardContent({ scene }: { scene: Scene }) {
  return (
    <>
      {/* Top: Playback controls */}
      <div className="px-4 pt-4 pb-2 border-b border-outline-variant/10 flex-shrink-0">
        <PlaybackControls />
      </div>

      {/* Middle: visualization area */}
      <CanvasVisualization scene={scene} />

      {/* Bottom: ControlBar */}
      <div className="flex-shrink-0">
        <ControlBar controls={scene.controls} />
      </div>
    </>
  )
}

// ─── CanvasCard ────────────────────────────────────────────────────────────────

export function CanvasCard({ scene }: CanvasCardProps) {
  const isExpanded = useBoundStore((s) => s.isExpanded)
  const setExpanded = useBoundStore((s) => s.setExpanded)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Close expanded mode on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setExpanded(false)
      }
    },
    [isExpanded, setExpanded],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Lock body scroll when expanded
  useEffect(() => {
    document.body.style.overflow = isExpanded ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isExpanded])

  return (
    <>
      {/* ── Normal card (always in flow; invisible when expanded) ── */}
      <div
        className={[
          'bg-surface-container rounded-3xl border border-outline-variant/20 overflow-hidden',
          'flex flex-col flex-1 min-h-0',
          isExpanded ? 'invisible' : '',
        ].join(' ')}
        aria-hidden={isExpanded}
      >
        <CardContent scene={scene} />
      </div>

      {/* ── Expanded overlay (fixed, above everything) ── */}
      {mounted
        ? createPortal(
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  key="canvas-expanded"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  className={[
                    'fixed inset-0 z-[60]',
                    'bg-surface-container border-0 rounded-none',
                    'flex flex-col',
                  ].join(' ')}
                >
                  <CardContent scene={scene} />
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  )
}
