'use client'

import { Slider } from '@/components/ui/slider'
import type { Control } from '@insyte/scene-engine'
import type { ControlValue } from '../hooks/useControls'

// ─── SliderControl ────────────────────────────────────────────────────────────

interface SliderControlProps {
  control: Control
  value: ControlValue | undefined
  onChange: (id: string, val: ControlValue) => void
}

export function SliderControl({ control, value, onChange }: SliderControlProps) {
  const { min = 0, max = 100, step = 1 } = (control.config || {}) as {
    min?: number
    max?: number
    step?: number
    defaultValue?: number
  }

  const numericValue = typeof value === 'number' ? value : Number(min)

  return (
    <div className="flex flex-col gap-2 min-w-[140px]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-on-surface-variant">{control.label}</span>
        <span className="text-xs font-mono font-bold text-primary tabular-nums">
          {numericValue}
        </span>
      </div>
      <Slider
        min={Number(min)}
        max={Number(max)}
        step={Number(step)}
        value={[numericValue]}
        onValueChange={(vals) => {
          // base-ui Slider passes number | readonly number[] to onValueChange.
          // noUncheckedIndexedAccess makes vals[0] → number|undefined, so we use ?? fallback.
          const newVal =
            typeof vals === 'number' ? vals : (vals[0] ?? numericValue)
          onChange(control.id, newVal)
        }}
        className="w-full"
      />
    </div>
  )
}
