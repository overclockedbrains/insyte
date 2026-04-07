'use client'

import type { Control } from '@insyte/scene-engine'
import type { ControlValue } from '../hooks/useControls'
import { SliderControl } from './SliderControl'
import { ToggleControl } from './ToggleControl'
import { ToggleGroupControl } from './ToggleGroupControl'
import { InputControl } from './InputControl'
import { ButtonControl } from './ButtonControl'
import { StatCard } from './StatCard'

// ─── ControlBar ───────────────────────────────────────────────────────────────
// Reads scene.controls array and renders each control type.
// Stat cards (type:'stat') float to the right of the bar.
// Accepts external values/onChange from parent (CanvasCard lifts control state
// so that showWhen conditions can be evaluated on the visualization layer).

interface ControlBarProps {
  controls: Control[]
  values: Record<string, ControlValue>
  onChange: (id: string, val: ControlValue) => void
}

export function ControlBar({ controls, values, onChange: setControlValue }: ControlBarProps) {

  if (controls.length === 0) return null

  // Separate known interactive controls from anything else (e.g. future 'stat' type)
  const interactiveTypes = new Set<string>(['slider', 'toggle', 'toggle-group', 'input', 'button'])
  const interactiveControls = controls.filter((c) => interactiveTypes.has(c.type))
  const statControls = controls.filter((c) => !interactiveTypes.has(c.type))


  return (
    <div className="flex flex-wrap items-end gap-4 px-4 py-3 border-t border-outline-variant/20 bg-surface-container-low/60">
      {/* Interactive controls */}
      {interactiveControls.map((control) => {
        const props = {
          control,
          value: values[control.id],
          onChange: setControlValue,
        }
        switch (control.type) {
          case 'slider':
            return <SliderControl key={control.id} {...props} />
          case 'toggle':
            return <ToggleControl key={control.id} {...props} />
          case 'toggle-group':
            return <ToggleGroupControl key={control.id} {...props} />
          case 'input':
            return <InputControl key={control.id} {...props} />
          case 'button':
            return <ButtonControl key={control.id} control={control} onChange={setControlValue} />
          default:
            return null
        }
      })}

      {/* Stat cards pushed to the right */}
      {statControls.length > 0 && (
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          {statControls.map((control) => {
            const cfg = (control.config || {}) as Record<string, unknown>
            return (
              <StatCard
                key={control.id}
                label={control.label}
                value={String(values[control.id] ?? cfg.defaultValue ?? '—')}
                accent={cfg.accent as 'primary' | 'secondary' | 'error' | undefined}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
