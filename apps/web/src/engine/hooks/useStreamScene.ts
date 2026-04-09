'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import type { DeepPartial } from 'ai'
import type { Scene } from '@insyte/scene-engine'
import { SceneSchema, VisualSchema, StepSchema, ControlSchema, ExplanationSectionSchema, ChallengeSchema, PopupSchema } from '@insyte/scene-engine'
import { useBoundStore } from '@/src/stores/store'
import { validateGeneratedScene } from '@/src/ai/generateScene'
import { aiLog } from '@/lib/ai-logger'
import { va } from '@/src/lib/analytics'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseStreamSceneResult {
  isStreaming: boolean
  streamedFields: Set<string>
  error: string | null
  startStreaming: (topic: string, slug?: string) => void
  retry: () => void
  abort: () => void
}

// ─── Field promotion helpers ──────────────────────────────────────────────────

function promoteFields(
  draft: DeepPartial<Scene>,
  promoteDraftField: (field: keyof Scene) => void,
): Set<keyof Scene> {
  const promoted = new Set<keyof Scene>()

  if (typeof draft.title === 'string' && draft.title.length > 0) {
    promoteDraftField('title')
    promoted.add('title')
  }

  if (Array.isArray(draft.visuals)) {
    const valid = draft.visuals.filter((v) => v && VisualSchema.safeParse(v).success)
    if (valid.length > 0) { promoteDraftField('visuals'); promoted.add('visuals') }
  }

  if (Array.isArray(draft.steps)) {
    const valid = draft.steps.filter((s) => s && StepSchema.safeParse(s).success)
    if (valid.length > 0) { promoteDraftField('steps'); promoted.add('steps') }
  }

  if (Array.isArray(draft.controls)) {
    const valid = draft.controls.filter((c) => c && ControlSchema.safeParse(c).success)
    if (valid.length > 0) { promoteDraftField('controls'); promoted.add('controls') }
  }

  if (Array.isArray(draft.explanation)) {
    const valid = draft.explanation.filter((e) => e && ExplanationSectionSchema.safeParse(e).success)
    if (valid.length > 0) { promoteDraftField('explanation'); promoted.add('explanation') }
  }

  if (Array.isArray(draft.challenges)) {
    const valid = draft.challenges.filter((c) => c && ChallengeSchema.safeParse(c).success)
    if (valid.length > 0) { promoteDraftField('challenges'); promoted.add('challenges') }
  }

  if (Array.isArray(draft.popups)) {
    const valid = draft.popups.filter((p) => p && PopupSchema.safeParse(p).success)
    if (valid.length > 0) { promoteDraftField('popups'); promoted.add('popups') }
  }

  return promoted
}

// ─── useStreamScene ───────────────────────────────────────────────────────────

export function useStreamScene(): UseStreamSceneResult {
  const [error, setError] = useState<string | null>(null)
  const lastTopicRef = useRef<string>('')
  const lastSlugRef = useRef<string | undefined>(undefined)
  const retryCountRef = useRef(0)
  // Per-run state flags, reset on each startStreaming call
  const hasInitializedSceneRef = useRef(false)
  const hasLoggedFirstPartialRef = useRef(false)
  const loggedPromotionsRef = useRef(new Set<keyof Scene>())
  // Ref so retry callbacks always see the latest runStream without circular deps
  const runStreamRef = useRef<(topic: string, slug?: string) => void>(() => { })

  const setScene = useBoundStore((s) => s.setScene)
  const clearScene = useBoundStore((s) => s.clearScene)
  const setDraftScene = useBoundStore((s) => s.setDraftScene)
  const promoteDraftField = useBoundStore((s) => s.promoteDraftField)
  const setStreaming = useBoundStore((s) => s.setStreaming)
  const isStreaming = useBoundStore((s) => s.isStreaming)
  const streamedFields = useBoundStore((s) => s.streamedFields)

  // ─── Core stream logic ────────────────────────────────────────────────────

  const handlePartial = useCallback(
    (partial: DeepPartial<Scene>) => {
      setDraftScene(partial)

      if (!hasLoggedFirstPartialRef.current) {
        hasLoggedFirstPartialRef.current = true
        aiLog.stream.firstPartial()
      }

      if (
        !hasInitializedSceneRef.current &&
        partial.id &&
        partial.title &&
        partial.type &&
        partial.layout
      ) {
        hasInitializedSceneRef.current = true
        aiLog.stream.sceneInit(partial.title as string)
      }

      const promoted = promoteFields(partial, promoteDraftField)
      for (const field of promoted) {
        if (!loggedPromotionsRef.current.has(field)) {
          loggedPromotionsRef.current.add(field)
          aiLog.stream.promote(field)
        }
      }
    },
    [setDraftScene, promoteDraftField],
  )

  const handleComplete = useCallback(
    (raw: unknown, topic: string) => {
      try {
        const validatedScene = validateGeneratedScene(raw)
        const { provider, model, apiKeys } = useBoundStore.getState()
        aiLog.stream.validated(true)
        va.track('scene_generated', {
          provider,
          model,
          byok: Boolean(apiKeys[provider]),
          scene_type: validatedScene.type,
          layout: validatedScene.layout,
          steps: validatedScene.steps.length,
          visuals: validatedScene.visuals.length,
        })
        setScene(validatedScene)
        aiLog.store.setScene('final', validatedScene.title)
        setStreaming(false)
        aiLog.store.setStreaming(false)
        aiLog.stream.complete()
        retryCountRef.current = 0
      } catch (err) {
        aiLog.stream.validated(false)
        if (retryCountRef.current < 1) {
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
          const msg = err instanceof Error ? err.message : 'Scene validation failed'
          aiLog.stream.error(msg)
          setError(msg)
        }
      }
    },
    [setScene, clearScene, setStreaming],
  )

  // Stable refs so useObject callbacks (defined at hook init) can always access
  // the latest handlePartial / handleComplete without being re-created every render.
  const handlePartialRef = useRef(handlePartial)
  const handleCompleteRef = useRef(handleComplete)
  useEffect(() => { handlePartialRef.current = handlePartial }, [handlePartial])
  useEffect(() => { handleCompleteRef.current = handleComplete }, [handleComplete])

  // ─── useObject ────────────────────────────────────────────────────────────
  // experimental_useObject consumes the toTextStreamResponse() stream from
  // /api/generate and progressively parses it into a typed DeepPartial<Scene>.
  //
  // headers is a function — called at submit() time — so it always reads the
  // latest settings from the store without re-initialising the hook.
  // BYOK keys are forwarded as x-api-key / x-provider / x-model headers;
  // the route uses them if present, otherwise falls back to the server key.
  //
  // IMPORTANT: toTextStreamResponse() is what useObject expects.
  // Do NOT change the server to toDataStreamResponse() — that is for useChat.

  const { submit, stop } = useObject({
    api: '/api/generate',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: SceneSchema as any,
    headers: (): Record<string, string> => {
      const { provider, model, apiKeys, user } = useBoundStore.getState()
      const key = apiKeys[provider]
      const headers: Record<string, string> = {}

      if (key) {
        headers['x-api-key'] = key
        headers['x-provider'] = provider
        headers['x-model'] = model
      }

      if (user?.id) {
        headers['x-user-id'] = user.id
      }

      return headers
    },
    onFinish: ({ object }) => {
      handleCompleteRef.current(object, lastTopicRef.current)
    },
    onError: (err) => {
      if (retryCountRef.current < 1) {
        retryCountRef.current++
        aiLog.stream.retry(retryCountRef.current, 'server-error')
        setError('Generation failed — retrying...')
        setTimeout(
          () => runStreamRef.current(lastTopicRef.current, lastSlugRef.current),
          800,
        )
      } else {
        retryCountRef.current = 0
        setStreaming(false)
        aiLog.store.setStreaming(false)
        clearScene()
        aiLog.store.clearScene()
        aiLog.stream.error(err.message)
        setError(err.message)
      }
    },
  })

  // Note: we do NOT sync hookIsLoading to setStreaming via effects or during render.
  // Instead, setStreaming(true) is called right before submit(), and setStreaming(false)
  // is handled reliably by onFinish (via handleComplete), onError, and abort().

  // ─── runStream ────────────────────────────────────────────────────────────

  const runStream = useCallback(
    (topic: string, slug?: string) => {
      hasInitializedSceneRef.current = false
      hasLoggedFirstPartialRef.current = false
      loggedPromotionsRef.current = new Set()

      aiLog.stream.start(topic, slug)
      setError(null)
      setDraftScene({})
      setStreaming(true)
      aiLog.store.setStreaming(true)

      // All generation goes through /api/generate.
      // BYOK headers are injected via the headers function above.
      submit({ topic, slug })
    },
    [setDraftScene, setStreaming, submit],
  )

  useEffect(() => {
    runStreamRef.current = runStream
  }, [runStream])

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
    stop()
    setStreaming(false)
    aiLog.store.setStreaming(false)
  }, [stop, setStreaming])

  return { isStreaming, streamedFields, error, startStreaming, retry, abort }
}
