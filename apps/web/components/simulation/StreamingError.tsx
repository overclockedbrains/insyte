'use client'

// ─── StreamingError ───────────────────────────────────────────────────────────
// Shown when generation fails and there is no activeScene to fall back on.

interface StreamingErrorProps {
  topic: string
  error: string
  onRetry: () => void
}

export function StreamingError({ topic, error, onRetry }: StreamingErrorProps) {
  const isRateLimit = error.includes('Rate limit')

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
          <p className="text-on-surface-variant text-sm">
            {isRateLimit
              ? 'You have reached the free generation limit. Add a BYOK key in Settings for unlimited access.'
              : 'The AI generation failed. This sometimes happens with complex topics.'}
          </p>
        </div>

        <button
          onClick={onRetry}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-primary hover:opacity-90 transition-all duration-200"
          style={{ background: 'linear-gradient(135deg, #b79fff 0%, #ab8ffe 100%)' }}
        >
          Try again →
        </button>

      </div>
    </div>
  )
}
