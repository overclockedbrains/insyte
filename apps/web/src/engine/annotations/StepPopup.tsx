import { motion, AnimatePresence } from 'framer-motion'
import { Info, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react'

interface StepPopupProps {
  text: string
  style?: 'info' | 'success' | 'warning' | 'insight'
  visible: boolean
}

const StyleConfig = {
  info: { color: 'var(--color-on-surface-variant)', bg: 'rgba(25, 25, 31, 0.8)', border: 'var(--color-outline-variant)', Icon: Info },
  success: { color: 'var(--color-secondary)', bg: 'rgba(58, 223, 250, 0.1)', border: 'var(--color-secondary)', Icon: CheckCircle2 },
  warning: { color: 'var(--color-error)', bg: 'rgba(255, 110, 132, 0.1)', border: 'var(--color-error)', Icon: AlertTriangle },
  insight: { color: 'var(--color-primary)', bg: 'rgba(183, 159, 255, 0.1)', border: 'var(--color-primary)', Icon: Lightbulb },
}

export function StepPopup({ text, style = 'info', visible }: StepPopupProps) {
  const cfg = StyleConfig[style] || StyleConfig.info
  const Icon = cfg.Icon

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: 0 }}
          className="glass-panel glow-border rounded-2xl p-3 text-sm flex items-start gap-2 shadow-2xl max-w-[240px] pointer-events-none relative"
          style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
        >
          <div className="mt-[2px]">
            <Icon size={16} color={cfg.color} />
          </div>
          <div className="font-body text-on-surface leading-snug">{text}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
