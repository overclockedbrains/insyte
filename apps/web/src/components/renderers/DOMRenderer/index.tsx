'use client'

import { Fragment } from 'react'
import { AnimatePresence } from 'framer-motion'
import type { SceneRendererProps } from '../types'
import { CanvasGroup } from './CanvasGroup'
import { PopupsLayer } from './PopupsLayer'

/**
 * DOMRenderer — React + Framer Motion implementation of SceneRendererProps.
 *
 * Thin orchestrator: classifies groups, composes the groups layer and popups
 * layer. Edge draw-on animations are handled locally by each primitive via
 * Framer Motion's key-based remount (initial/animate on motion.path).
 *
 * The SceneGraph is the boundary. Everything above (layout engine,
 * step engine, Zustand) is renderer-agnostic. Everything below is owned here.
 *
 * Layers:
 *   GroupsLayer  — AnimatePresence + one CanvasGroup per visible canvas group
 *   PopupsLayer  — resolvedPopups positioned in canvas-space
 *
 * Does NOT handle:
 *   - DotGridBackground (CanvasCard)
 *   - FloatingExplanation card (CanvasCard)
 *   - CanvasContext (CanvasCard — primitives read it via useCanvas())
 *   - showWhen filtering (useVisibleSceneGraph in CanvasCard)
 *   - Popup resolution (useResolvedPopups in CanvasCard)
 */
export function DOMRenderer({ sceneGraph, resolvedPopups, step, speed }: SceneRendererProps) {

  const canvasGroups = [...sceneGraph.groups.values()].filter(g => !g.isHud)

  return (
    <Fragment>
      <div className="relative w-full h-full p-4 flex flex-col items-center justify-center gap-4">

        {canvasGroups.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-on-surface-variant italic">
            No visuals defined in this scene.
          </p>
        )}

        <AnimatePresence>
          {canvasGroups.map(group => (
            <CanvasGroup
              key={group.id}
              group={group}
              step={step}
              speed={speed}
            />
          ))}
        </AnimatePresence>
      </div>

      <PopupsLayer popups={resolvedPopups} />
    </Fragment>
  )
}
