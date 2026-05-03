'use client'

// ─── StreamingError ───────────────────────────────────────────────────────────
// Shown when generation fails and there is no activeScene to fall back on.

type ErrorCode = 'rate_limit' | 'overloaded' | 'unknown'

interface StreamingErrorProps {
  topic: string
  error: string
  errorCode: ErrorCode | null
  onRetry: () => void
}

const ERROR_CONTENT: Record<ErrorCode, { heading: string; suggestion: string }> = {
  rate_limit: {
    heading: 'Rate limit reached for this provider',
    suggestion: 'Switch provider in Settings or add a BYOK key for unlimited access.',
  },
  overloaded: {
    heading: 'Provider is handling too many requests right now',
    suggestion: 'Try again in a moment.',
  },
  unknown: {
    heading: 'Something went wrong during generation',
    suggestion: 'Try again.',
  },
}

export function StreamingError({ topic, errorCode, onRetry }: StreamingErrorProps) {
  const code: ErrorCode = errorCode ?? 'unknown'
  const { heading, suggestion } = ERROR_CONTENT[code]

  return (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">

        <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
          <span className="text-error text-xl">✕</span>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-on-surface font-semibold">
            Could not generate simulation for &ldquo;{topic}&rdquo;
          </p>
          <p className="text-on-surface-variant text-sm">{heading}</p>
          <p className="text-on-surface-variant/70 text-xs">{suggestion}</p>
        </div>

        <button
          onClick={onRetry}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-primary hover:opacity-90 transition-all duration-200"
          style={{ background: 'var(--gradient-brand-explore)' }}
        >
          Try again →
        </button>

      </div>
    </div>
  )
}
