'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { resolveHighlight, getLiveVizSurface } from '../styles/colors'
import { useThemeSync } from '../styles/useThemeSync'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface TextBadgeState {
  text: string
  style?: 'default' | 'highlight' | 'success' | 'error'
}

/** Map TextBadge style names to semantic highlight tokens */
function styleToHighlight(style: TextBadgeState['style']): string | undefined {
  switch (style) {
    case 'highlight': return 'active'
    case 'success':   return 'hit'
    case 'error':     return 'error'
    default:          return undefined
  }
}

// ─── TextBadgeViz ─────────────────────────────────────────────────────────────
//
// Phase 27: resolveHighlight() + viz-popup-text typography class.

export function TextBadgeViz({ state }: PrimitiveProps) {
  useThemeSync()
  const { text, style = 'default' } = state as TextBadgeState

  const highlightToken = styleToHighlight(style)
  const colors = resolveHighlight(highlightToken)
  const viz = getLiveVizSurface()
  const isHighlighted = !!highlightToken

  const bgColor     = isHighlighted ? colors.bg : viz.container
  const borderColor = isHighlighted ? colors.border : viz.border
  const shadow      = isHighlighted ? `0 0 15px ${colors.border}50` : 'none'

  return (
    <div className="relative inline-flex z-20">
      <AnimatePresence mode="wait">
        <motion.div
          key={text}
          initial={{ opacity: 0, scale: 0.9, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.05, y: -5 }}
          transition={{ duration: 0.15 }}
          className="px-4 py-2 rounded-full border backdrop-blur-md"
          style={{
            backgroundColor: bgColor,
            borderColor,
            boxShadow: shadow,
          }}
        >
          <span className="viz-popup-text tracking-wide">{text}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
