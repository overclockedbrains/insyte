'use client'

import { useState } from 'react'
import type { Control } from '@insyte/scene-engine'
import type { ControlValue } from '../hooks/useControls'

// ─── InputControl ─────────────────────────────────────────────────────────────

interface InputControlProps {
  control: Control
  value: ControlValue | undefined
  onChange: (id: string, val: ControlValue) => void
}

export function InputControl({ control, value, onChange }: InputControlProps) {
  const { placeholder = 'Enter value...' } = (control.config || {}) as { placeholder?: string }
  const [draft, setDraft] = useState<string>(String(value ?? ''))

  const handleCommit = () => {
    if (draft.trim()) {
      onChange(control.id, draft.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleCommit()
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-on-surface-variant">{control.label}</span>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          placeholder={String(placeholder)}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          className={[
            'flex-1 px-3 py-1.5 rounded-xl text-xs font-mono',
            'bg-surface-container-lowest border border-outline-variant/20',
            'text-on-surface placeholder:text-on-surface-variant/40',
            'focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20',
            'transition-colors duration-150',
          ].join(' ')}
        />
        <button
          type="button"
          onClick={handleCommit}
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/15 text-primary hover:bg-primary/25 transition-colors duration-150 cursor-pointer border border-primary/20"
        >
          Go
        </button>
      </div>
    </div>
  )
}
