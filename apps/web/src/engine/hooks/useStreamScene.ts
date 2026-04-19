'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Scene } from '@insyte/scene-engine'
import { safeParseScene } from '@insyte/scene-engine'
import { useBoundStore } from '@/src/stores/store'
import { aiLog } from '@/lib/ai-logger'
import { analytics } from '@/src/lib/analytics'
import type { GenerationEvent } from '@/src/ai/pipeline'
import { buildAIHeaders } from '@/lib/headers'

// Re-export so consumers don't need to import from the AI module directly
export type { GenerationEvent }

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * How many times the client will automatically re-fire /api/generate on a
 * retryable failure before surfacing the error to the user.
 *
 * Set NEXT_PUBLIC_CLIENT_MAX_RETRIES=0 in .env.local to disable auto-retry
 * entirely (useful in development to avoid burning tokens on repeated attempts).
 * Defaults to 1 (one automatic retry).
 */
const _clientRetries = parseInt(process.env.NEXT_PUBLIC_CLIENT_MAX_RETRIES ?? '', 10)
const CLIENT_MAX_RETRIES = Math.max(0, isNaN(_clientRetries) ? 1 : _clientRetries)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseStreamSceneResult {
  isStreaming: boolean
  /** For Phase 26 progressive rendering — empty in Phase 25, filled on complete */
  streamedFields: Set<string>
  /** Stage 0 free reasoning text — shown as "Thinking..." during generation */
  reasoningText: string | null
  /** True after 30s of active streaming with no completion — show a patience message */
  isSlowGeneration: boolean
  error: string | null
  startStreaming: (topic: string, slug?: string) => void
  retry: () => void
  abort: () => void
}

// ─── SSE reader ───────────────────────────────────────────────────────────────

/**
 * Reads a text/event-stream response body and yields each parsed GenerationEvent.
 * Handles chunked delivery and multi-line data.
 */
async function* readSSE(
  response: Response,
  signal: AbortSignal,
): AsyncGenerator<GenerationEvent> {
  if (!response.body) return

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      if (signal.aborted) break

      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('data: ')) {
          try {
            const event = JSON.parse(trimmed.slice(6)) as GenerationEvent
            yield event
          } catch {
            // Malformed SSE line — skip silently
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ─── useStreamScene ───────────────────────────────────────────────────────────

/**
 * Drives the AI pipeline SSE stream from the client.
 *
 * Phase 25 implementation: consumes GenerationEvent stream from /api/generate,
 * handles 'complete' (validate + store scene) and 'error' events.
 * 'plan', 'content', 'annotations', 'misc' events are received but not yet
 * applied progressively — Phase 26 will add skeleton rendering.
 */
export function useStreamScene(): UseStreamSceneResult {
  const [error, setError] = useState<string | null>(null)
  const [reasoningText, setReasoningText] = useState<string | null>(null)
  const [isSlowGeneration, setIsSlowGeneration] = useState(false)
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTopicRef = useRef<string>('')
  const lastSlugRef = useRef<string | undefined>(undefined)
  const retryCountRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const setScene = useBoundStore((s) => s.setScene)
  const clearScene = useBoundStore((s) => s.clearScene)
  const setStreaming = useBoundStore((s) => s.setStreaming)
  const isStreaming = useBoundStore((s) => s.isStreaming)
  const streamedFields = useBoundStore((s) => s.streamedFields)

  // Clear slow-gen warning automatically when streaming stops
  useEffect(() => {
    if (!isStreaming) {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
      setIsSlowGeneration(false)
    }
  }, [isStreaming])

  // Stable ref so retry callbacks always call the latest runStream
  const runStreamRef = useRef<(topic: string, slug?: string) => void>(() => { })

  // ─── handleScene ─────────────────────────────────────────────────────────

  const handleScene = useCallback(
    (raw: Scene, topic: string) => {
      const result = safeParseScene(raw)
      if (result.success) {
        const { provider, model, apiKeys } = useBoundStore.getState()
        aiLog.stream.validated(true)
        analytics.track('scene_generated', {
          provider,
          model,
          byok: Boolean(apiKeys[provider]),
          scene_type: result.scene.type,
          layout: result.scene.layout,
          steps: result.scene.steps.length,
          visuals: result.scene.visuals.length,
        })
        setScene(result.scene)
        aiLog.store.setScene('final', result.scene.title)
        setStreaming(false)
        aiLog.store.setStreaming(false)
        aiLog.stream.complete()
        retryCountRef.current = 0
      } else {
        aiLog.stream.validated(false)
        if (retryCountRef.current < CLIENT_MAX_RETRIES) {
          retryCountRef.current++
          aiLog.stream.retry(retryCountRef.current, 'validation')
          setError('Validation failed — retrying...')
          setTimeout(() => runStreamRef.current(topic, lastSlugRef.current), 500)
        } else {
          retryCountRef.current = 0
          setStreaming(false)
          aiLog.store.setStreaming(false)
          clearScene()
          aiLog.store.clearScene()
          const msg = 'Scene validation failed after pipeline assembly'
          aiLog.stream.error(msg)
          setError(msg)
        }
      }
    },
    [setScene, clearScene, setStreaming],
  )

  // ─── runStream ────────────────────────────────────────────────────────────

  const runStream = useCallback(
    (topic: string, slug?: string) => {
      aiLog.stream.start(topic, slug)
      setError(null)
      setReasoningText(null)
      setIsSlowGeneration(false)
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
      slowTimerRef.current = setTimeout(() => setIsSlowGeneration(true), 30_000)
      setStreaming(true)
      aiLog.store.setStreaming(true)

      // Cancel any in-flight stream
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller

      const {
        provider,
        model,
        apiKeys,
        user,
        ollamaBaseURL,
        customBaseURL,
        customApiKey,
        detectedMode,
      } = useBoundStore.getState()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...buildAIHeaders({ provider, model, apiKeys, ollamaBaseURL, customBaseURL, customApiKey, userId: user?.id }),
      }

      // Fire the fetch and consume the SSE stream
      void (async () => {
        try {
          const response = await fetch('/api/generate', {
            method: 'POST',
            headers,
            body: JSON.stringify({ topic, slug, mode: detectedMode ?? undefined }),
            signal: controller.signal,
          })

          if (!response.ok) {
            // Non-2xx (e.g. 429 rate limit, 400 bad request)
            const text = await response.text().catch(() => '')
            let msg = `Generation failed (${response.status})`
            try {
              const json = JSON.parse(text)
              if (json.error) msg = json.error
            } catch { /* use default msg */ }
            throw new Error(msg)
          }

          for await (const event of readSSE(response, controller.signal)) {
            if (controller.signal.aborted) break

            switch (event.type) {
              case 'reasoning':
                // Stage 0 free reasoning complete — show "Thinking..." text
                setReasoningText(event.text)
                aiLog.stream.firstPartial()
                break

              case 'plan':
                aiLog.stream.sceneInit(event.skeleton.title)
                break

              case 'content':
                break

              case 'annotations':
                console.debug('[stream] annotations received:', event.popups.popups.length, 'popups')
                // Phase 26: store popups progressively here
                break

              case 'misc':
                console.debug('[stream] misc received:', event.misc.challenges.length, 'challenges')
                // Phase 26: store challenges progressively here
                break

              case 'complete':
                handleScene(event.scene, topic)
                return  // stream done, handleScene manages setStreaming(false)

              case 'error':
                if (event.retryable && retryCountRef.current < CLIENT_MAX_RETRIES) {
                  retryCountRef.current++
                  aiLog.stream.retry(retryCountRef.current, `stage-${event.stage}`)
                  setError(`Stage ${event.stage} failed — retrying...`)
                  setTimeout(() => runStreamRef.current(topic, slug), 800)
                } else {
                  retryCountRef.current = 0
                  setStreaming(false)
                  aiLog.store.setStreaming(false)
                  clearScene()
                  aiLog.store.clearScene()
                  aiLog.stream.error(event.message)
                  setError(event.message)
                }
                return
            }
          }

          // Stream closed without a 'complete' event — treat as an error
          if (!controller.signal.aborted) {
            throw new Error('Pipeline stream closed without completing')
          }
        } catch (err) {
          if (controller.signal.aborted) {
            // User-initiated abort — clean up silently
            setStreaming(false)
            aiLog.store.setStreaming(false)
            return
          }

          const msg = err instanceof Error ? err.message : 'Generation failed'

          if (retryCountRef.current < CLIENT_MAX_RETRIES) {
            retryCountRef.current++
            aiLog.stream.retry(retryCountRef.current, 'fetch-error')
            setError('Generation failed — retrying...')
            setTimeout(() => runStreamRef.current(topic, slug), 800)
          } else {
            retryCountRef.current = 0
            setStreaming(false)
            aiLog.store.setStreaming(false)
            clearScene()
            aiLog.store.clearScene()
            aiLog.stream.error(msg)
            setError(msg)
          }
        }
      })()
    },
    [setStreaming, clearScene, handleScene],
  )

  // Keep ref up to date for retry callbacks
  runStreamRef.current = runStream

  // ─── Public API ───────────────────────────────────────────────────────────

  const startStreaming = useCallback(
    (topic: string, slug?: string) => {
      lastTopicRef.current = topic
      lastSlugRef.current = slug
      retryCountRef.current = 0
      runStream(topic, slug)
    },
    [runStream],
  )

  const retry = useCallback(() => {
    if (lastTopicRef.current) {
      retryCountRef.current = 0
      runStream(lastTopicRef.current, lastSlugRef.current)
    }
  }, [runStream])

  const abort = useCallback(() => {
    aiLog.stream.abort()
    abortControllerRef.current?.abort()
    setStreaming(false)
    aiLog.store.setStreaming(false)
  }, [setStreaming])

  return { isStreaming, streamedFields, reasoningText, isSlowGeneration, error, startStreaming, retry, abort }
}
