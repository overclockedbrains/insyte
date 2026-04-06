'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSettings } from '@/src/stores/hooks'
import { REGISTRY } from '@/src/ai/registry'
import type { Provider } from '@/src/ai/registry'

// ─── ModelSelector ────────────────────────────────────────────────────────────

export function ModelSelector() {
  const { provider, model, setModel } = useSettings()
  const options = REGISTRY[provider as Provider]?.models ?? []

  // Track if current model is a known preset
  const isKnownModel = options.some(opt => opt.id === model)

  // Default the custom text input to the model if it's custom
  const [customModel, setCustomModel] = useState(!isKnownModel ? model : '')
  const [prevModel, setPrevModel] = useState(model)

  // Sync customModel when the external model changes (e.g., from preset click or provider change)
  if (model !== prevModel) {
    setPrevModel(model)
    const isNowKnown = options.some(opt => opt.id === model)
    if (isNowKnown) {
      setCustomModel('')
    } else if (model && model !== customModel) {
      setCustomModel(model)
    }
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCustomModel(val)
    if (val.trim()) {
      setModel(val.trim())
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isActive = model === opt.id
          return (
            <motion.button
              key={opt.id}
              type="button"
              onClick={() => setModel(opt.id)}
              whileTap={{ scale: 0.95 }}
              className={[
                'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer',
                isActive
                  ? 'bg-secondary text-on-secondary'
                  : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/20 hover:border-outline-variant/50 hover:text-on-surface',
              ].join(' ')}
            >
              {opt.label}
              {opt.badge && (
                <span
                  className={[
                    'text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded',
                    isActive
                      ? 'bg-on-secondary/20 text-on-secondary'
                      : 'bg-outline-variant/20 text-on-surface-variant',
                  ].join(' ')}
                >
                  {opt.badge}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>

      <div className="flex items-center mt-1 relative">
        <input
          type="text"
          placeholder="Or type a custom model ID..."
          value={customModel}
          onChange={handleCustomChange}
          className={[
            'flex-1 min-w-0 bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm transition-all focus:outline-none focus:border-primary/50',
            (!isKnownModel && model)
              ? 'border-secondary text-on-surface ring-1 ring-secondary/20'
              : 'border-outline-variant/30 text-on-surface-variant placeholder:text-on-surface-variant/50 hover:border-outline-variant/50'
          ].join(' ')}
        />
        {(!isKnownModel && model) && (
          <span className="absolute right-3 text-[9px] font-bold uppercase tracking-wider bg-on-secondary/20 text-on-secondary px-1.5 py-0.5 rounded pointer-events-none">
            Selected
          </span>
        )}
      </div>
    </div>
  )
}
