'use client'

import { useEffect, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Scene, SceneGraph } from '@insyte/scene-engine'
import { useBoundStore } from '@/src/stores/store'
import { DotGridBackground } from '@/components/layout/DotGridBackground'
import { PlaybackControls } from '../controls/PlaybackControls'
import { ControlBar } from '../controls/ControlBar'
import { usePlayback } from '../hooks/usePlayback'
import { useControlValues, type ControlValue } from '../hooks/useControls'
import ReactMarkdown from 'react-markdown'
import { CanvasContextProvider } from '../CanvasContext'
import { useSceneRuntime } from '@/src/hooks/useSceneRuntime'
import { useVisibleSceneGraph } from '@/src/hooks/useVisibleSceneGraph'
import { useResolvedPopups } from '@/src/hooks/useResolvedPopups'
import { ActiveRenderer } from '@/src/components/renderers/registry'
import { PrimitiveRegistry } from '@/src/engine/primitives'
import { getGroupState } from '@/src/components/renderers/helpers'

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

// ─── HUD zone: badges + counters ────────────────────────────────────
function HudZone({ sceneGraph, step }: { sceneGraph: SceneGraph, step: number }) {
  const allGroups = [...sceneGraph.groups.values()]
  const hudGroups = allGroups.filter(g => g.isHud)
  const textBadgeGroups = hudGroups.filter(g => g.visualType === 'text-badge')
  const counterGroups = hudGroups.filter(g => g.visualType === 'counter')
  const hasHud = hudGroups.length > 0

  return (
    <>
      {hasHud && (
        <>
          <div className="relative z-20 flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 pt-3 pb-2 pointer-events-none flex-shrink-0">
            {textBadgeGroups.map(group => {
              const PrimitiveComponent = PrimitiveRegistry[group.visualType]
              if (!PrimitiveComponent) return null
              const state = getGroupState(group, sceneGraph)
              return (
                <PrimitiveComponent
                  key={group.id}
                  id={group.id}
                  state={state}
                  step={step}
                  label={group.label}
                />
              )
            })}
            {counterGroups.length > 0 && (
              <div className="flex items-center gap-4 flex-shrink-0 ml-auto">
                {counterGroups.map(group => {
                  const PrimitiveComponent = PrimitiveRegistry[group.visualType]
                  if (!PrimitiveComponent) return null
                  const state = getGroupState(group, sceneGraph)
                  return (
                    <PrimitiveComponent
                      key={group.id}
                      id={group.id}
                      state={state}
                      step={step}
                      label={group.label}
                    />
                  )
                })}
              </div>
            )}
          </div>
          <div className="relative z-20 flex-shrink-0">
            <div className="h-px bg-outline-variant/20" />
          </div>
        </>
      )}
    </>
  )
}

// ─── Floating explanation card ───────────────────────────────────────────────

function FloatingExplanationCard({ scene, step }: { scene: Scene, step: number }) {
  // For canvas-only HLD scenes, overlay the active explanation section
  const floatingExplanation =
    scene.layout === 'canvas-only'
      ? [...scene.explanation].filter((s) => s.appearsAtStep <= step).pop()
      : null

  return (
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
          <div
            className="glass-panel rounded-2xl border border-primary/15 px-4 py-3 shadow-lg"
            style={{ boxShadow: '0 0 20px rgba(183,159,255,0.10)' }}
          >
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
  )
}

// ─── Inner canvas visualization ───────────────────────────────────────────────

function CanvasVisualization({ scene, controlValues }: { scene: Scene, controlValues: Record<string, ControlValue> }) {
  const { currentStep, speed } = usePlayback()
  const { sceneGraph } = useSceneRuntime(scene, currentStep)
  const visibleGraph = useVisibleSceneGraph(sceneGraph ?? { nodes: new Map(), edges: new Map(), groups: new Map(), stepIndex: currentStep }, controlValues)
  const resolvedPopups = useResolvedPopups(scene, currentStep, controlValues)

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <HudZone sceneGraph={visibleGraph} step={currentStep} />

        {sceneGraph && (
          <CanvasContextProvider as="div" className="relative flex-1 min-h-0 overflow-auto z-10">
            <DotGridBackground opacity={0.3} />
            <ActiveRenderer
              sceneGraph={visibleGraph}
              resolvedPopups={resolvedPopups}
              step={currentStep}
              speed={speed}
            />
          </CanvasContextProvider>
        )}
      </div>

      <FloatingExplanationCard scene={scene} step={currentStep} />
    </div>
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
      {/* Top: Playback Controls */}
      <div className="px-3 md:px-4 pt-2 md:pt-4 pb-2 flex-shrink-0">
        <PlaybackControls />
      </div>

      {/* Middle: HUD + Visualization Area */}
      <CanvasVisualization scene={scene} controlValues={values} />

      {/* Bottom: Control Bar */}
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
