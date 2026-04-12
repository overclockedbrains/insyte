'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
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
import { useControlValues, type ControlValue } from '../hooks/useControls'
import ReactMarkdown from 'react-markdown'
import { CanvasContext } from '../CanvasContext'

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
  onRerunWithCustomInput?: (() => void) | null
}

// ─── Inner canvas visualization ───────────────────────────────────────────────

// Toggle to visualise each primitive's bounding box during development
const DEV_BORDERS = process.env.NEXT_PUBLIC_DEV_BORDERS === 'true'

function CanvasVisualization({ scene, controlValues }: { scene: Scene; controlValues: Record<string, ControlValue> }) {
  const { currentStep } = usePlayback()

  // ── Phase 18: ResizeObserver for unified coordinate system ──────────────────
  const canvasZoneRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = canvasZoneRef.current
    if (!el) return
    // Initial measurement
    setDims({ w: el.clientWidth, h: el.clientHeight })
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setDims({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // toPx converts percentage-based (0–100) scene positions to container pixels.
  // Memoised on dims so primitives only re-render when the container actually resizes.
  const toPx = useCallback(
    (pos: { x: number; y: number }) => ({
      x: (pos.x / 100) * (dims.w || 800),
      y: (pos.y / 100) * (dims.h || 600),
    }),
    [dims],
  )

  const canvasContextValue = { width: dims.w || 800, height: dims.h || 600, toPx }
  // ────────────────────────────────────────────────────────────────────────────

  // Evaluate a visual's showWhen condition against current control values
  const isVisible = (visual: { showWhen?: { control: string; equals: unknown } }) => {
    if (!visual.showWhen) return true
    const val = controlValues[visual.showWhen.control]
    return val === visual.showWhen.equals
  }

  const visiblePopups = scene.popups.filter(
    (p) =>
      currentStep >= p.showAtStep &&
      (p.hideAtStep === undefined || currentStep < p.hideAtStep) &&
      isVisible(p),
  )

  const textBadges = scene.visuals.filter((v) => v.type === 'text-badge' && isVisible(v))
  const counters = scene.visuals.filter((v) => v.type === 'counter' && isVisible(v))
  const canvasVisuals = scene.visuals.filter(
    (v) => v.type !== 'text-badge' && v.type !== 'counter' && isVisible(v),
  )

  // For canvas-only HLD scenes, show a floating explanation card
  const floatingExplanation =
    scene.layout === 'canvas-only'
      ? [...scene.explanation]
          .filter((s) => s.appearsAtStep <= currentStep)
          .pop()
      : null

  const hasHud = textBadges.length > 0 || counters.length > 0

  // Phase 18/19: popup anchor uses toPx so it lives in the same px space as the primitives.
  // position was removed from Visual in Phase 19 — fall back to canvas centre when no explicit anchor.
  function getPopupAnchorPx(popup: typeof visiblePopups[number]): { x: number; y: number } {
    if (popup.anchor) return toPx(popup.anchor)
    return toPx({ x: 50, y: 75 })
  }

  function getMaxWidth(type: string): string {
    if (type === 'system-diagram') return '100%'
    if (type === 'queue') return '320px'
    if (type === 'graph') return '100%'
    if (type === 'tree' || type === 'recursion-tree') return '100%'
    return '100%'
  }

  return (
    // Phase 18: wrap the whole visualization in CanvasContext so every child
    // primitive can read the measured pixel dimensions without prop-drilling.
    <CanvasContext.Provider value={canvasContextValue}>
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

        {/*
         * ── Canvas zone ──────────────────────────────────────────────────────
         * Phase 18: this ref is observed by ResizeObserver above so dims stay
         * accurate at every container size change (window resize, panel resize,
         * expand/collapse toggle).
         */}
        <div ref={canvasZoneRef} className="relative flex-1 min-h-0 overflow-auto z-10">
          {canvasVisuals.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-on-surface-variant italic">
              No visuals defined in this scene.
            </p>
          )}

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

          {/*
           * Phase 18: popup anchoring — positions derived via toPx() so they live
           * in the same absolute-pixel space as the SVG viewBox primitives.
           */}
          {visiblePopups.map((popup) => {
            const posPx = getPopupAnchorPx(popup)
            return (
              <div
                key={popup.id}
                className="absolute z-30 pointer-events-none"
                style={{
                  left: posPx.x,
                  top: posPx.y,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <StepPopup text={popup.text} style={popup.style} visible={true} />
              </div>
            )
          })}

          {/* Floating explanation card for canvas-only HLD scenes */}
          <AnimatePresence mode="wait">
            {floatingExplanation && (
              <motion.div
                key={floatingExplanation.heading}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                className="absolute z-40 pointer-events-none bottom-3 left-3 right-3 max-w-none md:bottom-4 md:left-4 md:right-auto md:max-w-[280px]"
              >
                <div className="glass-panel rounded-2xl border border-primary/15 px-4 py-3 shadow-lg"
                  style={{ boxShadow: '0 0 20px rgba(183,159,255,0.10)' }}>
                  <p className="text-[11px] font-semibold text-primary mb-1 uppercase tracking-widest">
                    {floatingExplanation.heading}
                  </p>
                  <div className="text-[11px] text-on-surface-variant leading-relaxed prose prose-invert prose-p:mb-1 prose-strong:text-on-surface max-w-none">
                    <ReactMarkdown>{floatingExplanation.body}</ReactMarkdown>
                  </div>
                  {floatingExplanation.callout && (
                    <div className="mt-2 bg-primary/8 rounded px-2 py-1.5 text-[10px] text-on-surface border border-primary/10">
                      <span className="font-semibold text-primary mr-1">▸</span>
                      {floatingExplanation.callout}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </CanvasContext.Provider>
  )
}

// ─── Shared card content ──────────────────────────────────────────────────────

function CardContent({
  scene,
  onRerunWithCustomInput,
}: {
  scene: Scene
  onRerunWithCustomInput?: (() => void) | null
}) {
  // Lift control values here so both CanvasVisualization and ControlBar share state.
  // This enables showWhen conditions to filter visuals based on current control values.
  const { values, setControlValue } = useControlValues(scene.controls)

  return (
    <>
      {/* Top: Playback controls */}
      <div className="px-3 md:px-4 pt-2 md:pt-4 pb-2 border-b border-outline-variant/10 flex-shrink-0">
        <PlaybackControls />
      </div>

      {/* Middle: visualization area */}
      <CanvasVisualization scene={scene} controlValues={values} />

      {/* Bottom: ControlBar */}
      <div className="flex-shrink-0">
        <ControlBar
          controls={scene.controls}
          values={values}
          onChange={setControlValue}
          onRerunWithCustomInput={onRerunWithCustomInput}
        />
      </div>
    </>
  )
}

// ─── CanvasCard ────────────────────────────────────────────────────────────────

export function CanvasCard({ scene, onRerunWithCustomInput = null }: CanvasCardProps) {
  const isExpanded = useBoundStore((s) => s.isExpanded)
  const setExpanded = useBoundStore((s) => s.setExpanded)
  const isPatchGlowing = useBoundStore((s) => s.isPatchGlowing)
  const patchGlowNonce = useBoundStore((s) => s.patchGlowNonce)
  const clearGlow = useBoundStore((s) => s.clearGlow)
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

  useEffect(() => {
    if (patchGlowNonce === 0 || !isPatchGlowing) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      clearGlow()
    }, 1000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [clearGlow, isPatchGlowing, patchGlowNonce])

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
        <CardContent scene={scene} onRerunWithCustomInput={onRerunWithCustomInput} />
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
                <CardContent scene={scene} onRerunWithCustomInput={onRerunWithCustomInput} />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )
        : null}
    </>
  )
}
