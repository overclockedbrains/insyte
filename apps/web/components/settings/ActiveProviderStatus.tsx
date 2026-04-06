'use client'

import { useEffect, useState } from 'react'
import { useSettings } from '@/src/stores/hooks'
import type { Provider } from '@/src/stores/slices/settings-slice'

const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  groq: 'Groq',
}

interface RateLimitStatus {
  remaining: number
  resetAt: string
}

// ─── ActiveProviderStatus ─────────────────────────────────────────────────────

export function ActiveProviderStatus() {
  const { provider, model, apiKeys } = useSettings()
  const activeKey = apiKeys[provider]
  const hasByok = Boolean(activeKey)

  // null  = not yet fetched  |  RateLimitStatus = fetched
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus | null>(null)

  // Derive the loading state — avoids synchronous setState inside effects.
  // We're "loading" when we're on the free tier and haven't received a response yet.
  const isFetching = !hasByok && rateLimitStatus === null

  // Fetch rate-limit status whenever we switch to the free tier.
  // All setRateLimitStatus calls happen inside async callbacks, never
  // synchronously in the effect body — satisfying react-hooks/set-state-in-effect.
  useEffect(() => {
    if (hasByok) return

    let cancelled = false

    fetch('/api/rate-limit-status')
      .then((res) => res.json() as Promise<RateLimitStatus>)
      .then((data) => {
        if (!cancelled) setRateLimitStatus(data)
      })
      .catch(() => {
        // On error leave rateLimitStatus as null — the JSX falls back to "free tier"
      })

    return () => {
      cancelled = true
    }
  }, [hasByok])

  return (
    <div className="flex items-center gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3">
      {/* Live dot */}
      <span
        className={[
          'flex h-2 w-2 shrink-0 rounded-full',
          hasByok ? 'bg-secondary animate-pulse' : 'bg-outline',
        ].join(' ')}
      />

      <div className="flex-1 min-w-0">
        {hasByok ? (
          <p className="text-sm text-on-surface">
            Using your{' '}
            <span className="font-semibold text-secondary">
              {PROVIDER_LABELS[provider]}
            </span>{' '}
            key ·{' '}
            <span className="text-on-surface-variant text-xs font-mono truncate">
              {model}
            </span>{' '}
            · <span className="text-secondary">Unlimited requests</span>
          </p>
        ) : (
          <p className="text-sm text-on-surface">
            Using{' '}
            <span className="font-semibold text-primary">insyte&apos;s</span>{' '}
            Gemini key ·{' '}
            {isFetching ? (
              <span className="text-on-surface-variant text-xs animate-pulse">
                checking…
              </span>
            ) : rateLimitStatus ? (
              <span className="text-on-surface-variant text-xs">
                <span
                  className={
                    rateLimitStatus.remaining === 0
                      ? 'text-error font-semibold'
                      : 'text-on-surface'
                  }
                >
                  {rateLimitStatus.remaining}
                </span>{' '}
                requests remaining this hour
              </span>
            ) : (
              <span className="text-on-surface-variant text-xs">free tier</span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
