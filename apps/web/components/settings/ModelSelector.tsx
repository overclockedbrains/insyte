'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSettings } from '@/src/stores/hooks'
import type { Provider } from '@/src/stores/slices/settings-slice'

// ─── Model catalogue ──────────────────────────────────────────────────────────

interface ModelOption {
  id: string
  label: string
  badge?: string // e.g. "free", "fast"
}

const MODELS_BY_PROVIDER: Record<Provider, ModelOption[]> = {
  gemini: [
    { id: 'gemini-2.5-flash', label: 'Flash 2.5', badge: 'fast' },
    { id: 'gemini-2.5-pro', label: 'Pro 2.5' },
    { id: 'gemini-2.0-flash', label: 'Flash 2.0' },
    { id: 'gemini-3-flash-preview', label: 'Flash 3.0', badge: 'new' },
    { id: 'gemini-3.1-pro-preview', label: 'Pro 3.1', badge: 'new' }
  ],
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o mini', badge: 'fast' },
    { id: 'gpt-5.4', label: 'GPT-5.4', badge: 'new' },
    { id: 'gpt-4.1', label: 'GPT-4.1' },
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'o3-mini', label: 'o3-mini' },
    { id: 'o1', label: 'o1' },
  ],
  anthropic: [
    { id: 'claude-opus-4-6', label: 'Opus 4.6', badge: 'new' },
    { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
    { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5', badge: 'fast' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
    { id: 'llama-3.1-8b-instant', label: 'Llama 8B', badge: 'fast' },
    { id: 'openai/gpt-oss-120b', label: 'GPT OSS 120B', badge: 'new' },
  ],
}

// ─── ModelSelector ────────────────────────────────────────────────────────────

export function ModelSelector() {
  const { provider, model, setModel } = useSettings()
  const options = MODELS_BY_PROVIDER[provider] || []

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
