'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FlaskConical, CheckCircle, XCircle, Loader2, X, RotateCcw } from 'lucide-react'
import { useSettings } from '@/src/stores/hooks'
import { buildAIHeaders } from '@/lib/headers'

type TestStatus = 'idle' | 'loading' | 'ok' | 'error'

interface TestResult {
  model: string
  error?: string
}

export function ConnectionTestButton() {
  const settings = useSettings()
  const [status, setStatus] = useState<TestStatus>('idle')
  const [result, setResult] = useState<TestResult | null>(null)

  const runTest = useCallback(async () => {
    setStatus('loading')
    setResult(null)

    const headers = buildAIHeaders(settings)

    try {
      const res = await fetch('/api/test-key', { headers })
      const data = await res.json() as { ok: boolean; model: string; error?: string }
      setResult({ model: data.model, error: data.error })
      setStatus(data.ok ? 'ok' : 'error')
    } catch {
      setResult({ model: settings.model, error: 'Network error' })
      setStatus('error')
    }
  }, [settings])

  const dismiss = useCallback(() => {
    setStatus('idle')
    setResult(null)
  }, [])

  return (
    <AnimatePresence mode="wait">
      {status === 'idle' && (
        <motion.button
          key="btn"
          type="button"
          onClick={runTest}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 rounded-lg border border-outline-variant/30 bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:border-outline-variant/60 transition-colors cursor-pointer shrink-0"
        >
          <FlaskConical className="h-3 w-3" />
          Test
        </motion.button>
      )}

      {status === 'loading' && (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-1.5 rounded-lg border border-outline-variant/20 px-3 py-1.5 text-xs text-on-surface-variant shrink-0"
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          Testing…
        </motion.div>
      )}

      {status === 'ok' && result && (
        <motion.div
          key="ok"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2 rounded-lg border border-secondary/30 bg-secondary/5 pl-3 pr-2 py-1.5 text-xs font-medium text-secondary shrink-0"
        >
          <CheckCircle className="h-3 w-3 shrink-0" />
          <span>Works · {result.model}</span>
          <button
            type="button"
            onClick={dismiss}
            className="ml-0.5 rounded p-0.5 hover:bg-secondary/15 transition-colors cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </motion.div>
      )}

      {status === 'error' && result && (
        <motion.div
          key="error"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2 rounded-lg border border-error/30 bg-error/5 pl-3 pr-2 py-1.5 text-xs font-medium text-error shrink-0 max-w-[260px]"
        >
          <XCircle className="h-3 w-3 shrink-0" />
          <span className="truncate flex-1" title={result.error}>
            {result.error ?? 'Failed'}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={runTest}
              className="rounded p-0.5 hover:bg-error/15 transition-colors cursor-pointer"
              aria-label="Retry"
              title="Retry"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded p-0.5 hover:bg-error/15 transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
