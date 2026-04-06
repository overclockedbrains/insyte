'use client'

import { motion } from 'framer-motion'
import type { Control } from '@insyte/scene-engine'
import type { ControlValue } from '../hooks/useControls'

// ─── ToggleGroupControl ───────────────────────────────────────────────────────

interface ToggleGroupControlProps {
  control: Control
  value: ControlValue | undefined
  onChange: (id: string, val: ControlValue) => void
}

export function ToggleGroupControl({ control, value, onChange }: ToggleGroupControlProps) {
  const { options = [] } = (control.config || {}) as { options?: string[]; defaultValue?: string }
  const activeOption = typeof value === 'string' ? value : (options[0] ?? '')

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-on-surface-variant">{control.label}</span>
      <div className="flex items-center gap-1 p-0.5 bg-surface-container-lowest rounded-xl border border-outline-variant/20">
        {options.map((option) => {
          const isActive = option === activeOption
          return (
            <motion.button
              key={option}
              type="button"
              onClick={() => onChange(control.id, option)}
              whileTap={{ scale: 0.97 }}
              className={[
                'relative px-3 py-1 rounded-lg text-xs font-bold transition-colors duration-150 cursor-pointer',
                isActive
                  ? 'text-on-secondary'
                  : 'text-on-surface-variant hover:text-on-surface',
              ].join(' ')}
            >
              {isActive && (
                <motion.span
                  layoutId={`toggle-group-${control.id}-pill`}
                  className="absolute inset-0 rounded-lg bg-secondary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{option}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
