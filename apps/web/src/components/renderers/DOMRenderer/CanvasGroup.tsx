'use client'

import { motion } from 'framer-motion'
import type { SceneGroup } from '@insyte/scene-engine'
import { PrimitiveRegistry } from '@/src/engine/primitives'
import { getGroupState } from '../helpers'
import { DEV_BORDERS } from '../constants'

interface CanvasGroupProps {
  group: SceneGroup
  step: number
  speed: number
}

/**
 * Per-group motion wrapper with declarative FM entrance/exit.
 *
 * `layoutId` is intentionally absent: FM's shared-element projection system
 * writes opacity:0 directly to the DOM (bypassing motion values) when a
 * layoutId element "enters" inside a resizing parent, leaving it stuck until
 * a layout recalculation unsticks it. Groups are full-width flex items with
 * no position FLIP need; per-cell FLIP animations (HashMapViz etc.) use their
 * own internal layoutId scopes and are unaffected.
 */
export function CanvasGroup({ group, step, speed }: CanvasGroupProps) {
  const PrimitiveComponent = PrimitiveRegistry[group.visualType]
  if (!PrimitiveComponent) return null
  const state = getGroupState(group)

  return (
    <motion.div
      id={`sg-group-${group.id}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        opacity: { duration: 0.2 / speed },
        scale: { duration: 0.28 / speed },
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
        visual={group.visual}
      />
    </motion.div>
  )
}
