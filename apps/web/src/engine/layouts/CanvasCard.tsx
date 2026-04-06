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

// Toggle to visualise each primitive's bounding box during development
const DEV_BORDERS = process.env.NEXT_PUBLIC_DEV_BORDERS === 'true'

function CanvasVisualization({ scene }: { scene: Scene }) {
  const { currentStep } = usePlayback()

  const visiblePopups = scene.popups.filter(
    (p) =>
      currentStep >= p.showAtStep &&
      (p.hideAtStep === undefined || currentStep < p.hideAtStep),
  )

  const textBadges = scene.visuals.filter((v) => v.type === 'text-badge')
  const counters = scene.visuals.filter((v) => v.type === 'counter')
  const canvasVisuals = scene.visuals.filter(
    (v) => v.type !== 'text-badge' && v.type !== 'counter',
  )

  const hasHud = textBadges.length > 0 || counters.length > 0
  const useAbsoluteLayout = canvasVisuals.some((v) => v.position != null)

  function getPopupAnchor(popup: typeof visiblePopups[number]): { x: number; y: number } {
    if (popup.anchor) return popup.anchor
    const visual = canvasVisuals.find((v) => v.id === popup.attachTo)
    if (visual?.position) return { x: visual.position.x, y: visual.position.y + 18 }
    return { x: 50, y: 75 }
  }

  function getMaxWidth(type: string): string {
    if (type === 'system-diagram') return '460px'
    if (type === 'queue') return '320px'
    if (type === 'graph') return '480px'
    return '260px'
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Dot grid spans the full area */}
      <div className="absolute inset-0 pointer-events-none">
        <DotGridBackground opacity={0.3} />
      </div>

      {/* ── HUD zone: badges + counters, fixed at top, never overlaps canvas ── */}
      {hasHud && (
        <>
          <div className="relative z-20 flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 pt-3 pb-2 pointer-events-none flex-shrink-0">
            {textBadges.map((visual) => {
              const PrimitiveComponent = PrimitiveRegistry[visual.type]
              if (!PrimitiveComponent) return null
              const state = computeVisualStateAtStep(scene, visual.id, currentStep)
              return (
                <PrimitiveComponent
                  key={visual.id}
                  id={visual.id}
                  state={state}
                  step={currentStep}
                  label={visual.label}
                />
              )
            })}
            {counters.length > 0 && (
              <div className="flex items-center gap-4 flex-shrink-0 ml-auto">
                {counters.map((visual) => {
                  const PrimitiveComponent = PrimitiveRegistry[visual.type]
                  if (!PrimitiveComponent) return null
                  const state = computeVisualStateAtStep(scene, visual.id, currentStep)
                  return (
                    <PrimitiveComponent
                      key={visual.id}
                      id={visual.id}
                      state={state}
                      step={currentStep}
                      label={visual.label}
                    />
                  )
                })}
              </div>
            )}
          </div>
          {/* Divider */}
          <div className="relative z-20 flex-shrink-0 px-6">
            <div className="h-px bg-outline-variant/20" />
          </div>
        </>
      )}

      {/* ── Canvas zone: fills remaining space, positions relative to this area ── */}
      <div className="relative flex-1 min-h-0 overflow-auto z-10">
        {canvasVisuals.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-on-surface-variant italic">
            No visuals defined in this scene.
          </p>
        )}

        {useAbsoluteLayout ? (
          <div className="relative w-full h-full min-h-[300px]">
            {canvasVisuals.map((visual) => {
              const PrimitiveComponent = PrimitiveRegistry[visual.type]
              if (!PrimitiveComponent) return null
              const state = computeVisualStateAtStep(scene, visual.id, currentStep)
              const pos = visual.position ?? { x: 50, y: 50 }
              const maxW = getMaxWidth(visual.type)
              return (
                <div
                  key={visual.id}
                  className={`absolute flex flex-col items-center${DEV_BORDERS ? ' border border-dashed border-primary/30' : ''}`}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -50%)',
                    maxWidth: maxW,
                    width: '100%',
                  }}
                >
                  {visual.label && (
                    <div className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant/60 mb-1 text-center select-none">
                      {visual.label}
                    </div>
                  )}
                  <PrimitiveComponent
                    id={visual.id}
                    state={state}
                    step={currentStep}
                    label={visual.label}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="relative w-full h-full p-4 flex flex-col items-center justify-center gap-4">
            {canvasVisuals.map((visual) => {
              const PrimitiveComponent = PrimitiveRegistry[visual.type]
              if (!PrimitiveComponent) return null
              const state = computeVisualStateAtStep(scene, visual.id, currentStep)
              return (
                <div key={visual.id} className={`flex flex-col items-center w-full${DEV_BORDERS ? ' border border-dashed border-primary/30' : ''}`}>
                  {visual.label && (
                    <div className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant/60 mb-1 text-center select-none">
                      {visual.label}
                    </div>
                  )}
                  <PrimitiveComponent
                    id={visual.id}
                    state={state}
                    step={currentStep}
                    label={visual.label}
                  />
                </div>
              )
            })}
          </div>
        )}

        {/* Popup annotations — simple absolute label near the attached visual */}
        {visiblePopups.map((popup) => {
          const pos = getPopupAnchor(popup)
          return (
            <div
              key={popup.id}
              className="absolute z-30 pointer-events-none"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <StepPopup text={popup.text} style={popup.style} visible={true} />
            </div>
          )
        })}

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
  const isPatchGlowing = useBoundStore((s) => s.isPatchGlowing)
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
      <motion.div
        className={[
          'bg-surface-container rounded-3xl border border-outline-variant/20 overflow-hidden',
          'flex flex-col flex-1 min-h-0',
          isExpanded ? 'invisible' : '',
        ].join(' ')}
        aria-hidden={isExpanded}
        animate={{
          boxShadow: isPatchGlowing
            ? '0 0 40px rgba(183,159,255,0.4), 0 0 80px rgba(183,159,255,0.15)'
            : '0 0 0px rgba(183,159,255,0)',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <CardContent scene={scene} />
      </motion.div>

      {/* ── Expanded overlay (fixed, above everything) ── */}
      {mounted
        ? createPortal(
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                key="canvas-expanded"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  boxShadow: isPatchGlowing
                    ? '0 0 60px rgba(183,159,255,0.35)'
                    : '0 0 0px rgba(183,159,255,0)',
                }}
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
