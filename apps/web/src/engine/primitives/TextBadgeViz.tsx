import { motion, AnimatePresence } from 'framer-motion'
import type { PrimitiveProps } from '.'
import { resolveHighlight } from '../styles/colors'

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
  const { text, style = 'default' } = state as TextBadgeState

  const highlightToken = styleToHighlight(style)
  const colors = resolveHighlight(highlightToken)
  const isHighlighted = !!highlightToken

  const bgColor     = isHighlighted ? colors.bg : 'rgba(25, 25, 31, 0.6)'
  const borderColor = isHighlighted ? colors.border : 'rgba(72, 71, 77, 0.8)'
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
