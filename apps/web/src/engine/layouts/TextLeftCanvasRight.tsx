'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { Scene } from '@insyte/scene-engine'
import { useBoundStore } from '@/src/stores/store'
import { ExplanationPanel } from '../annotations/ExplanationPanel'
import { CanvasCard } from './CanvasCard'
import { usePlayback } from '../hooks/usePlayback'

// ─── TextLeftCanvasRight ──────────────────────────────────────────────────────
// Desktop (md+): explanation panel 35% left | canvas 65% right.
//   Expand mode: left panel animates out (width → 0, opacity → 0).
//   canvas motion.div has `layout` so it smoothly expands to fill space.
//
// Mobile (<md): canvas stacks on top (full width), explanation below.
//   Expand mode button is hidden on mobile (SimulationNav), so no animation needed.
//
// NOTE: Desktop and mobile sections are rendered independently so Framer Motion
// width animations never conflict with responsive Tailwind width classes.

interface Props {
  scene: Scene
}

export function TextLeftCanvasRight({ scene }: Props) {
  const isExpanded = useBoundStore((s) => s.isExpanded)
  const { currentStep } = usePlayback()

  return (
    <div className="h-full w-full min-h-0 flex flex-col">

      {/* ══ DESKTOP layout (md+) — side-by-side ══════════════════════════════ */}
      <div className="hidden md:flex flex-row w-full h-full min-h-0">

        {/* Left: explanation panel — animated in/out on expand */}
        <AnimatePresence initial={false}>
          {!isExpanded && (
            <motion.div
              key="text-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '35%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              // No CSS width class here — FM owns width on desktop entirely.
              // overflow-hidden clips the panel content as it slides to 0.
              className="flex-shrink-0 overflow-hidden border-r border-outline-variant/20 min-h-0"
            >
              <ExplanationPanel
                sections={scene.explanation}
                currentStep={currentStep}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right: canvas */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col p-4">
          <CanvasCard scene={scene} />
        </div>
      </div>

      {/* ══ MOBILE layout (<md) — stacked, no animation needed ══════════════ */}
      <div className="flex md:hidden flex-col w-full min-h-0 flex-1">
        {/* Canvas — top, takes ≈55vh so explanation is still visible below */}
        <div className="flex-shrink-0 h-[55vh] flex flex-col p-3">
          <CanvasCard scene={scene} />
        </div>

        {/* Explanation — below canvas, scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto border-t border-outline-variant/20">
          <ExplanationPanel
            sections={scene.explanation}
            currentStep={currentStep}
          />
        </div>
      </div>

    </div>
  )
}
