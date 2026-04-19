'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { SceneSchema } from '@insyte/scene-engine'
import type { Scene } from '@insyte/scene-engine'
import { useBoundStore } from '@/src/stores/store'
import { buildAIHeaders } from '@/lib/headers'
import { sandboxManager } from '@/src/sandbox/SandboxManager'
import type { TraceData } from '@/src/sandbox/types'

export type DSAPipelineStage =
  | 'idle'
  | 'instrumenting'
  | 'executing'
  | 'visualizing'
  | 'complete'
  | 'error'

interface VisualizeAwaiter {
  resolve: (scene: Scene) => void
  reject: (error: Error) => void
}

function buildClientHeaders(): Record<string, string> {
  const { provider, model, apiKeys, ollamaBaseURL, customBaseURL, customApiKey } = useBoundStore.getState()
  return buildAIHeaders({ provider, model, apiKeys, ollamaBaseURL, customBaseURL, customApiKey })
}

function customInputSuffix(language: 'python' | 'javascript', customInput?: string): string {
  if (!customInput?.trim()) {
    return ''
  }

  if (language === 'python') {
    return [
      '',
      '# Insyte custom re-run input',
      '_trace.clear()',
      customInput.trim(),
    ].join('\n')
  }

  return [
    '',
    '// Insyte custom re-run input',
    '_trace.length = 0;',
    customInput.trim(),
  ].join('\n')
}

export function useDSAPipeline() {
  const [stage, setStage] = useState<DSAPipelineStage>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [traceTruncated, setTraceTruncated] = useState(false)
  const [latestTrace, setLatestTrace] = useState<TraceData | null>(null)

  const setScene = useBoundStore((s) => s.setScene)
  const setDraftScene = useBoundStore((s) => s.setDraftScene)
  const setTotalSteps = useBoundStore((s) => s.setTotalSteps)
  const resetPlayback = useBoundStore((s) => s.reset)

  const instrumentedCodeRef = useRef<string | null>(null)
  const originalCodeRef = useRef<string | null>(null)
  const languageRef = useRef<'python' | 'javascript'>('python')
  const problemStatementRef = useRef<string>('')
  const visualizeAwaiterRef = useRef<VisualizeAwaiter | null>(null)

  const {
    object: partialScene,
    submit: submitVisualize,
    stop: stopVisualizing,
    clear: clearVisualizing,
  } = useObject({
    api: '/api/visualize-trace',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: SceneSchema as any,
    headers: buildClientHeaders,
    onFinish: ({ object, error: streamError }) => {
      if (streamError || !object) {
        visualizeAwaiterRef.current?.reject(
          streamError ?? new Error('Failed to build visualization scene.'),
        )
        visualizeAwaiterRef.current = null
        return
      }

      const scene = object as Scene
      setScene(scene)
      setTotalSteps(scene.steps.length)
      resetPlayback()
      visualizeAwaiterRef.current?.resolve(scene)
      visualizeAwaiterRef.current = null
    },
    onError: (streamError) => {
      visualizeAwaiterRef.current?.reject(streamError)
      visualizeAwaiterRef.current = null
    },
  })

  useEffect(() => {
    if (stage === 'visualizing' && partialScene) {
      setDraftScene(partialScene)
    }
  }, [partialScene, stage, setDraftScene])

  const visualizeTrace = useCallback(
    async (
      trace: TraceData,
      originalCode: string,
      language: 'python' | 'javascript',
      problemStatement: string,
    ): Promise<Scene> => {
      clearVisualizing()

      return await new Promise<Scene>((resolve, reject) => {
        visualizeAwaiterRef.current = { resolve, reject }
        submitVisualize({
          trace,
          originalCode,
          language,
          problemStatement,
        })
      })
    },
    [clearVisualizing, submitVisualize],
  )

  const executeInstrumented = useCallback(
    async (
      instrumentedCode: string,
      language: 'python' | 'javascript',
      customInput?: string,
    ): Promise<TraceData> => {
      const executableCode = `${instrumentedCode}${customInputSuffix(language, customInput)}`
      return sandboxManager.execute(executableCode, language)
    },
    [],
  )

  const run = useCallback(
    async (
      code: string,
      language: 'python' | 'javascript',
      problemStatement: string,
      customInput?: string,
    ) => {
      try {
        stopVisualizing()
        clearVisualizing()
        setError(null)
        setLatestTrace(null)
        setTraceTruncated(false)
        setProgress(5)
        setStage('instrumenting')
        setDraftScene({})

        originalCodeRef.current = code
        languageRef.current = language
        problemStatementRef.current = problemStatement

        const instrumentResponse = await fetch('/api/instrument', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...buildClientHeaders() },
          body: JSON.stringify({
            code,
            language,
            problemStatement,
          }),
        })

        if (!instrumentResponse.ok) {
          throw new Error(await instrumentResponse.text())
        }

        const instrumentPayload = (await instrumentResponse.json()) as { instrumentedCode?: string }
        const instrumentedCode = instrumentPayload.instrumentedCode?.trim()
        if (!instrumentedCode) {
          throw new Error('Instrumentation returned empty code.')
        }
        instrumentedCodeRef.current = instrumentedCode

        setStage('executing')
        setProgress(40)

        const trace = await executeInstrumented(instrumentedCode, language, customInput)
        setLatestTrace(trace)
        setTraceTruncated(Boolean(trace.truncated))
        if (trace.error) {
          throw new Error(trace.error)
        }

        setStage('visualizing')
        setProgress(70)

        await visualizeTrace(trace, code, language, problemStatement)

        setStage('complete')
        setProgress(100)
      } catch (pipelineError) {
        const message =
          pipelineError instanceof Error ? pipelineError.message : 'DSA pipeline failed.'
        setError(message)
        setStage('error')
        setProgress(0)
      }
    },
    [
      clearVisualizing,
      executeInstrumented,
      setDraftScene,
      stopVisualizing,
      visualizeTrace,
    ],
  )

  const rerun = useCallback(
    async (customInput?: string) => {
      const instrumentedCode = instrumentedCodeRef.current
      const originalCode = originalCodeRef.current
      const language = languageRef.current
      const problemStatement = problemStatementRef.current

      if (!instrumentedCode || !originalCode) {
        setError('No prior DSA run found to re-run.')
        setStage('error')
        return
      }

      try {
        setError(null)
        setTraceTruncated(false)

        setStage('executing')
        setProgress(45)

        const trace = await executeInstrumented(instrumentedCode, language, customInput)
        setLatestTrace(trace)
        setTraceTruncated(Boolean(trace.truncated))
        if (trace.error) {
          throw new Error(trace.error)
        }

        setStage('visualizing')
        setProgress(75)

        await visualizeTrace(trace, originalCode, language, problemStatement)

        setStage('complete')
        setProgress(100)
      } catch (rerunError) {
        const message = rerunError instanceof Error ? rerunError.message : 'DSA re-run failed.'
        setError(message)
        setStage('error')
        setProgress(0)
      }
    },
    [executeInstrumented, visualizeTrace],
  )

  const api = useMemo(
    () => ({
      stage,
      progress,
      error,
      run,
      rerun,
      traceTruncated,
      latestTrace,
    }),
    [stage, progress, error, run, rerun, traceTruncated, latestTrace],
  )

  return api
}
