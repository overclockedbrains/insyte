import { motion, AnimatePresence } from 'framer-motion'

interface StepPopupProps {
  text: string
  style?: 'info' | 'success' | 'warning' | 'insight'
  visible: boolean
}

export const popupAccentColor: Record<string, string> = {
  info:    'rgba(140, 140, 160, 0.55)',
  success: 'rgba(58, 223, 250, 0.55)',
  warning: 'rgba(255, 110, 132, 0.55)',
  insight: 'rgba(183, 159, 255, 0.55)',
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
              background: 'rgba(10, 10, 16, 0.6)',
            }}
          >
            {text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
