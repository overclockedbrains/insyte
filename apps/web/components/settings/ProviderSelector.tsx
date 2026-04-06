'use client'

import { motion } from 'framer-motion'
import { useSettings } from '@/src/stores/hooks'
import type { Provider } from '@/src/stores/slices/settings-slice'

// ─── Provider metadata ────────────────────────────────────────────────────────

interface ProviderMeta {
  id: Provider
  name: string
  subtitle: string
  badge?: string
  color: string
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'gemini',
    name: 'Gemini',
    subtitle: 'Google',
    badge: 'Default · Free',
    color: 'text-blue-400',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    subtitle: 'GPT models',
    color: 'text-emerald-400',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    subtitle: 'Claude models',
    color: 'text-orange-400',
  },
  {
    id: 'groq',
    name: 'Groq',
    subtitle: 'Llama / Mixtral',
    color: 'text-rose-400',
  },
]

const INITIALS: Record<Provider, string> = {
  gemini: 'G',
  openai: '⊕',
  anthropic: 'A',
  groq: 'Q',
}

// ─── Provider logo — avatar circle with optional "key saved" badge ────────────

function ProviderLogo({
  provider,
  color,
  hasKey,
}: {
  provider: Provider
  color: string
  hasKey: boolean
}) {
  return (
    <div className="relative shrink-0">
      <div
        className={[
          'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold',
          'bg-surface-container-highest border border-outline-variant/30',
          color,
        ].join(' ')}
      >
        {INITIALS[provider]}
      </div>

      {/* BYOK key-saved badge — bottom-right of avatar, like a status dot */}
      {hasKey && (
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-secondary border-2 border-surface-container-high" />
      )}
    </div>
  )
}

// ─── ProviderSelector ─────────────────────────────────────────────────────────

export function ProviderSelector() {
  const { provider, apiKeys, setProvider } = useSettings()

  return (
    <div className="grid grid-cols-2 gap-3">
      {PROVIDERS.map((p) => {
        const isActive = provider === p.id
        const hasKey = Boolean(apiKeys[p.id])

        return (
          <motion.button
            key={p.id}
            type="button"
            onClick={() => setProvider(p.id)}
            whileTap={{ scale: 0.97 }}
            className={[
              'relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer',
              isActive
                ? 'border-primary/60 bg-surface-container-high'
                : 'border-outline-variant/20 bg-surface-container-low hover:border-outline-variant/40 hover:bg-surface-container',
            ].join(' ')}
          >
            <ProviderLogo provider={p.id} color={p.color} hasKey={hasKey} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-on-surface">
                  {p.name}
                </span>
                {p.badge && (
                  <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-secondary/10 text-secondary">
                    {p.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant truncate">
                {p.subtitle}
              </p>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
