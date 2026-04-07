'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { useBoundStore } from '@/src/stores/store'
import { SimulationLayout } from '@/src/engine/SimulationLayout'
import { useDSAPipeline } from '@/src/engine/hooks/useDSAPipeline'
import { PyodideLoader } from '@/components/simulation/PyodideLoader'

interface DSAPipelineViewProps {
  slug: string
  languageHint?: 'python' | 'javascript'
}

interface DSAPayload {
  code: string
  language: 'python' | 'javascript'
  problemStatement: string
}

const STAGE_MESSAGE: Record<string, string> = {
  idle: 'Preparing DSA pipeline...',
  instrumenting: 'AI is reading your code...',
  executing: 'Executing in sandbox...',
  visualizing: 'Building visualization...',
  complete: 'Visualization complete.',
  error: 'Pipeline failed.',
}

function readDSAPayload(slug: string, languageHint: 'python' | 'javascript'): DSAPayload | null {
  const raw = sessionStorage.getItem(`insyte:dsa:${slug}`)
  if (!raw) return null

  const parsed = JSON.parse(raw) as Partial<DSAPayload>
  if (typeof parsed.code !== 'string' || !parsed.code.trim()) {
    return null
  }

  return {
    code: parsed.code.trim(),
    language:
      parsed.language === 'python' || parsed.language === 'javascript'
        ? parsed.language
        : languageHint,
    problemStatement: (parsed.problemStatement ?? '').trim(),
  }
}

export function DSAPipelineView({ slug, languageHint = 'python' }: DSAPipelineViewProps) {
  const startRef = useRef(false)
  const activeScene = useBoundStore((s) => s.activeScene)

  const { stage, progress, error, run, rerun, traceTruncated } = useDSAPipeline()

  const { payload, payloadError } = useMemo(() => {
    if (typeof window === 'undefined') {
      return { payload: null as DSAPayload | null, payloadError: null as string | null }
    }

    try {
      const loaded = readDSAPayload(slug, languageHint)
      if (!loaded) {
        return {
          payload: null as DSAPayload | null,
          payloadError:
            'No DSA payload found for this URL. Start from the homepage input to launch a DSA trace.',
        }
      }

      return { payload: loaded, payloadError: null as string | null }
    } catch {
      return {
        payload: null as DSAPayload | null,
        payloadError: 'Failed to read DSA payload from session storage.',
      }
    }
  }, [slug, languageHint])

  useEffect(() => {
    startRef.current = false
  }, [slug, languageHint])

  useEffect(() => {
    if (!payload || startRef.current) return
    startRef.current = true
    void run(payload.code, payload.language, payload.problemStatement)
  }, [payload, run])

  const handleRerunWithCustomInput = useCallback(() => {
    if (!payload) return

    const defaultSnippet =
      payload.language === 'python'
        ? 'nums = [3, 2, 4]\ntarget = 6\nfinalResult = two_sum(nums, target)'
        : 'const nums = [3, 2, 4];\nconst target = 6;\nfinalResult = twoSum(nums, target);'

    const snippet = window.prompt(
      'Enter code snippet to set custom input and assign finalResult:',
      defaultSnippet,
    )

    if (snippet == null) return
    void rerun(snippet)
  }, [payload, rerun])

  const stageMessage = useMemo(() => STAGE_MESSAGE[stage] ?? 'Running pipeline...', [stage])

  if (payloadError) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
        <div className="max-w-xl w-full rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-on-surface">
          {payloadError}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {payload?.language === 'python' && (
        <div className="px-4 sm:px-6 py-3">
          <PyodideLoader active={stage !== 'complete'} />
        </div>
      )}

      {(stage !== 'complete' || error || traceTruncated) && (
        <div className="px-4 sm:px-6 pb-3">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-outline-variant/30 bg-surface-container-low/80 px-4 py-3"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-on-surface">{stageMessage}</span>
              <span className="font-mono text-on-surface-variant">{Math.round(progress)}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-surface-container">
              <motion.div
                className="h-full rounded-full bg-secondary"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                transition={{ type: 'spring', stiffness: 180, damping: 28 }}
              />
            </div>
            {error && <p className="mt-2 text-xs text-error">{error}</p>}
            {traceTruncated && (
              <p className="mt-2 text-xs text-on-surface">
                Trace truncated at 1000 steps.
              </p>
            )}
          </motion.div>
        </div>
      )}

      {activeScene ? (
        <SimulationLayout
          scene={activeScene}
          onRerunWithCustomInput={handleRerunWithCustomInput}
        />
      ) : (
        <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low/60 px-5 py-4 text-sm text-on-surface-variant">
            {stageMessage}
          </div>
        </div>
      )}
    </div>
  )
}
