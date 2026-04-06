'use client'

import { motion } from 'framer-motion'
import type { Control } from '@insyte/scene-engine'
import type { ControlValue } from '../hooks/useControls'
import { usePlayerStore } from '@/src/stores/player-store'

// ─── ButtonControl ────────────────────────────────────────────────────────────

interface ButtonControlProps {
  control: Control
  onChange: (id: string, val: ControlValue) => void
}

export function ButtonControl({ control, onChange }: ButtonControlProps) {
  const jumpToStep = usePlayerStore((s) => s.jumpToStep)
  const pause = usePlayerStore((s) => s.pause)

  const {
    variant = 'primary',
    actionValue = 'triggered',
    goToStep,
  } = (control.config || {}) as {
    variant?: 'primary' | 'destructive' | 'secondary'
    actionValue?: string
    goToStep?: number
  }

  const isDestructive = variant === 'destructive'
  const isSecondary = variant === 'secondary'

  const handleClick = () => {
    if (typeof goToStep === 'number') {
      pause()
      jumpToStep(goToStep)
    } else {
      onChange(control.id, actionValue as ControlValue)
    }
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={handleClick}
      className={[
        'px-4 py-2 rounded-xl text-xs font-bold cursor-pointer',
        'border transition-all duration-150',
        isDestructive
          ? 'bg-error/15 text-error border-error/20 hover:bg-error/25'
          : isSecondary
            ? 'bg-secondary/15 text-secondary border-secondary/20 hover:bg-secondary/25'
            : 'bg-primary/15 text-primary border-primary/20 hover:bg-primary/25',
      ].join(' ')}
    >
      {control.label}
    </motion.button>
  )
}
