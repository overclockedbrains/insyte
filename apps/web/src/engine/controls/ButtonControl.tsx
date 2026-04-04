'use client'

import { motion } from 'framer-motion'
import type { Control } from '@insyte/scene-engine'
import type { ControlValue } from '../hooks/useControls'

// ─── ButtonControl ────────────────────────────────────────────────────────────

interface ButtonControlProps {
  control: Control
  onChange: (id: string, val: ControlValue) => void
}

export function ButtonControl({ control, onChange }: ButtonControlProps) {
  const { variant = 'primary', actionValue = 'triggered' } = control.config as {
    variant?: 'primary' | 'destructive'
    actionValue?: string
  }

  const isDestructive = variant === 'destructive'

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={() => onChange(control.id, actionValue)}
      className={[
        'px-4 py-2 rounded-xl text-xs font-bold cursor-pointer',
        'border transition-all duration-150',
        isDestructive
          ? 'bg-error/15 text-error border-error/20 hover:bg-error/25'
          : 'bg-primary/15 text-primary border-primary/20 hover:bg-primary/25',
      ].join(' ')}
    >
      {control.label}
    </motion.button>
  )
}
