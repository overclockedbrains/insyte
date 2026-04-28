/**
 * StepPopup — pure presentational popup attached to a scene element.
 *
 * Phase 18 (Coordinate System Unification): This component itself is unchanged.
 * Positioning is now handled by CanvasCard, which converts popup anchor
 * coordinates via toPx() (px, not %) before passing them to the wrapper div.
 * No coordinate math lives here.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { POPUP_ACCENT_COLORS, VIZ_SURFACE } from '@/src/engine/styles/colors'

interface StepPopupProps {
  text: string
  style?: 'info' | 'success' | 'warning' | 'insight'
  visible: boolean
}

export const popupAccentColor: Record<string, string> = {
  info:    POPUP_ACCENT_COLORS.neutral,
  success: POPUP_ACCENT_COLORS.cyan,
  warning: POPUP_ACCENT_COLORS.red,
  insight: POPUP_ACCENT_COLORS.purple,
}

export function StepPopup({ text, style = 'info', visible }: StepPopupProps) {
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
              background: VIZ_SURFACE.popupBg,
            }}
          >
            {text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
