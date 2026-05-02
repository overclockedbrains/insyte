/**
 * StepPopup — pure presentational popup attached to a scene element.
 *
 * Phase 18 (Coordinate System Unification): This component itself is unchanged.
 * Positioning is now handled by CanvasCard, which converts popup anchor
 * coordinates via toPx() (px, not %) before passing them to the wrapper div.
 * No coordinate math lives here.
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { getLivePopupAccentColors, getLiveVizSurface } from '@/src/engine/styles/colors'
import { useThemeSync } from '@/src/engine/styles/useThemeSync'

interface StepPopupProps {
  text: string
  style?: 'info' | 'success' | 'warning' | 'insight'
  visible: boolean
}

export function StepPopup({ text, style = 'info', visible }: StepPopupProps) {
  useThemeSync()
  const accent = getLivePopupAccentColors()
  const viz = getLiveVizSurface()
  const popupAccentColor: Record<string, string> = {
    info:    accent.neutral,
    success: accent.cyan,
    warning: accent.red,
    insight: accent.purple,
  }
  const color = popupAccentColor[style] ?? popupAccentColor.info

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-none select-none"
        >
          <div
            className="text-[10px] font-mono leading-snug max-w-[160px] px-2.5 py-1.5"
            style={{
              color,
              borderLeft: `2px solid ${color}`,
              background: viz.popupBg,
            }}
          >
            {text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
