'use client'

import { motion } from 'framer-motion'
import type { Control } from '@insyte/scene-engine'
import type { ControlValue } from '../hooks/useControls'

// ─── ToggleControl ────────────────────────────────────────────────────────────

interface ToggleControlProps {
  control: Control
  value: ControlValue | undefined
  onChange: (id: string, val: ControlValue) => void
}

export function ToggleControl({ control, value, onChange }: ToggleControlProps) {
  const isOn = typeof value === 'boolean' ? value : Boolean(value)

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-on-surface-variant">{control.label}</span>
      <button
        type="button"
        onClick={() => onChange(control.id, !isOn)}
        className={[
          'relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold',
          'border transition-all duration-200 cursor-pointer',
          isOn
            ? 'bg-secondary/15 text-secondary border-secondary/30'
            : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/20 hover:border-outline-variant/40 hover:text-on-surface',
        ].join(' ')}
        aria-pressed={isOn}
      >
        {/* Track */}
        <span
          className={[
            'relative inline-block w-8 h-4 rounded-full transition-colors duration-200',
            isOn ? 'bg-secondary' : 'bg-surface-bright',
          ].join(' ')}
        >
          <motion.span
            className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow"
            animate={{ x: isOn ? 16 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </span>
        {isOn ? 'On' : 'Off'}
      </button>
    </div>
  )
}
