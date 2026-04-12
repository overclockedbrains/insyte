'use client'

import { Fragment, useEffect, useRef } from 'react'
import { motion, AnimatePresence, animate } from 'framer-motion'
import type { SceneGraph } from '@insyte/scene-engine'
import { diffSceneGraphs } from '@insyte/scene-engine'
import { PrimitiveRegistry } from '@/src/engine/primitives'
import { StepPopup } from '@/src/engine/annotations/StepPopup'
import { useCanvas } from '@/src/engine/CanvasContext'
import type { SceneRendererProps } from './types'
import { getGroupState } from './helpers'
import { DEV_BORDERS } from './constants'

/**
 * DOMRenderer — React + Framer Motion implementation of SceneRendererProps.
 *
 * Receives a pre-computed, pre-filtered SceneGraph and renders it.
 * All scene-schema concerns (showWhen evaluation, popup resolution, visual
 * metadata) are resolved upstream in CanvasCard before this component runs.
 *
 * Responsibilities:
 *   - Canvas groups — one <motion.div> per group, layoutId for FLIP
 *   - Diff-driven animations — enter/exit effects via diffSceneGraphs
 *   - Popup anchoring — toPx converts 0-100 % coords to container pixels
 *
 * Does NOT handle:
 *   - DotGridBackground (CanvasCard)
 *   - FloatingExplanation card (CanvasCard)
 *   - CanvasContext (CanvasCard — SVG primitives read it via useCanvas())
 *   - showWhen filtering (useVisibleSceneGraph in CanvasCard)
 *   - Popup resolution (useResolvedPopups in CanvasCard)
 */
export function DOMRenderer({
  sceneGraph,
  resolvedPopups,
  step,
  speed,
}: SceneRendererProps) {
  const prevGraphRef = useRef<SceneGraph | null>(null)

  // ── Diff-driven group-level enter animations ──────────────────────────────
  // Targets group containers by CSS id after each sceneGraph update.
  // Node-level state changes (color, highlight) are handled inside each
  // primitive component via its own animation logic.
  useEffect(() => {
    const prev = prevGraphRef.current
    prevGraphRef.current = sceneGraph
    if (!prev) return

    const diff = diffSceneGraphs(prev, sceneGraph)

    // Groups entering (new visual becoming active at this step)
    const addedGroupIds = new Set(diff.added.map(n => n.groupId))
    addedGroupIds.forEach(gid => {
      animate(
        `#sg-group-${gid}`,
        { scale: [0.88, 1.03, 1], opacity: [0, 1] },
        { duration: 0.28 / speed },
      )
    })

    // New edges draw-on (SVG edges with id sg-edge-{id} inside primitives)
    diff.addedEdges.forEach(edge => {
      animate(`#sg-edge-${edge.id}`, { pathLength: [0, 1] }, { duration: 0.3 / speed })
    })
  }, [sceneGraph, speed])

  // ── Coordinate conversion ─────────────────────────────────────────────────
  // Popup anchors are stored as 0–100 % values in scene JSON.
  // toPx is provided by CanvasContext (set up in CanvasCard via ResizeObserver).
  const { toPx } = useCanvas()

  // ── Group classification ──────────────────────────────────────────────────
  // SceneGroup.isHud is set in computeSceneGraphAtStep from visual.type.
  // sceneGraph is already filtered by useVisibleSceneGraph (control-toggle
  // hidden groups have been removed before reaching this component).
  const allGroups = [...sceneGraph.groups.values()]
  const canvasGroups = allGroups.filter(g => !g.isHud)

  return (
    <Fragment>
      <div className="relative w-full h-full p-4 flex flex-col items-center justify-center gap-4">

        {canvasGroups.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-on-surface-variant italic">
            No visuals defined in this scene.
          </p>
        )}

        <AnimatePresence>
          {canvasGroups.map(group => {
            const PrimitiveComponent = PrimitiveRegistry[group.visualType]
            if (!PrimitiveComponent) return null
            const state = getGroupState(group, sceneGraph)

            return (
              <motion.div
                key={group.id}
                id={`sg-group-${group.id}`}
                layoutId={`sg-group-${group.id}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  layout: { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 / speed },
                  scale: { duration: 0.2 / speed },
                }}
                className={`flex flex-col items-center w-full${DEV_BORDERS ? ' border border-dashed border-primary/30' : ''}`}
              >
                {group.label && (
                  <div className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant/60 mb-1 text-center select-none">
                    {group.label}
                  </div>
                )}
                <PrimitiveComponent
                  id={group.id}
                  state={state}
                  step={step}
                  label={group.label}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* ── Popups ─────────────────────────────────────────────────────── */}
      {/*
      * resolvedPopups are pre-filtered by useResolvedPopups (step range +
      * control-toggle). Anchor is in 0–100 % space; toPx() converts to px.
      */}
      {resolvedPopups.map(popup => {
        const posPx = popup.anchor ? toPx(popup.anchor) : toPx({ x: 50, y: 75 })
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
    </Fragment>
  )
}
