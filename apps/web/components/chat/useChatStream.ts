'use client'

import { useCallback } from 'react'
import { useBoundStore } from '@/src/stores/store'
import { applyDiff } from '@/src/ai/applyDiff'
import type { ScenePatch } from '@/src/ai/applyDiff'
import { buildSceneContext } from '@/src/ai/liveChat'
import { PATCH_START, PATCH_END } from '@/src/ai/prompts/live-chat'
import { va } from '@/src/lib/analytics'

// ─── useChatStream ────────────────────────────────────────────────────────────
// Handles the full lifecycle of a streaming chat request:
//   1. Pushes user message + empty assistant placeholder to store
//   2. Calls /api/chat and reads the text stream chunk-by-chunk
//   3. Appends each chunk to the last assistant message for typing cursor effect
//   4. After stream ends, detects %%PATCH_START%% / %%PATCH_END%% markers
//   5. Strips the patch block from the displayed message
//   6. Applies the patch to the active scene and resolves the PlaybackIntent
//   7. Triggers canvas glow on success; shows inline error on failure
//
// BYOK: reads provider/model/apiKeys from settings-store and passes as headers.

export function useChatStream() {
  const addUserMessage = useBoundStore((s) => s.addUserMessage)
  const addAssistantMessage = useBoundStore((s) => s.addAssistantMessage)
  const appendToLastMessage = useBoundStore((s) => s.appendToLastMessage)
  const setLastMessageContent = useBoundStore((s) => s.setLastMessageContent)
  const setLoading = useBoundStore((s) => s.setLoading)

  const activeScene = useBoundStore((s) => s.activeScene)
  const currentStep = useBoundStore((s) => s.currentStep)
  const messages = useBoundStore((s) => s.messages)

  const setScene = useBoundStore((s) => s.setScene)
  const pause = useBoundStore((s) => s.pause)
  const jumpToStep = useBoundStore((s) => s.jumpToStep)
  const setTotalSteps = useBoundStore((s) => s.setTotalSteps)
  const triggerGlow = useBoundStore((s) => s.triggerGlow)

  const provider = useBoundStore((s) => s.provider)
  const model = useBoundStore((s) => s.model)
  const apiKeys = useBoundStore((s) => s.apiKeys)

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !activeScene) return

      // 1. Push user message and empty assistant placeholder
      addUserMessage(text)
      addAssistantMessage('')
      setLoading(true)
      va.track('chat_sent', {
        scene_id: activeScene.id,
        scene_type: activeScene.type,
        provider,
        model,
        byok: Boolean(apiKeys[provider]),
      })

      // Build scene context (minimal — no full JSON)
      const sceneContext = buildSceneContext(activeScene, currentStep)

      // Build history snapshot BEFORE the new user message (exclude the two we just pushed)
      const history = messages.slice(0, -2)

      // BYOK headers — only set if the user has a key for their selected provider
      const byokKey = apiKeys[provider]
      const extraHeaders: Record<string, string> = byokKey
        ? {
            'x-api-key': byokKey,
            'x-provider': provider,
            'x-model': model,
          }
        : {}

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...extraHeaders },
          body: JSON.stringify({ message: text, sceneContext, history }),
        })

        if (!response.ok || !response.body) {
          throw new Error(`Server error ${response.status}`)
        }

        // 2. Stream text chunks
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''
        let patchStartIdx = -1

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const rawChunk = decoder.decode(value, { stream: true })

          // The toTextStreamResponse format prefixes each chunk with "0:" (Vercel AI protocol).
          // Strip the protocol prefix if present.
          const chunk = parseTextStreamChunk(rawChunk)
          if (!chunk) continue

          accumulated += chunk

          // Check if the patch separator has appeared yet
          if (patchStartIdx === -1) {
            patchStartIdx = accumulated.indexOf(PATCH_START)
          }

          if (patchStartIdx === -1) {
            // No patch marker yet — append this chunk directly for real-time streaming
            appendToLastMessage(chunk)
          }
          // If patch marker found, stop appending visible text (patch section is stripped later)
        }

        // Flush any remaining bytes in the decoder
        const remaining = decoder.decode()
        if (remaining) {
          accumulated += remaining
          // Re-locate patch start since we got more data
          patchStartIdx = accumulated.indexOf(PATCH_START)
        }

        // 3. Extract and apply patch if present
        const patchEndIdx =
          patchStartIdx !== -1 ? accumulated.indexOf(PATCH_END, patchStartIdx) : -1

        if (patchStartIdx !== -1 && patchEndIdx !== -1) {
          // Clean text = everything before the patch block
          const cleanText = accumulated.slice(0, patchStartIdx).trimEnd()
          setLastMessageContent(cleanText)

          // Extract raw JSON between markers
          const patchRaw = accumulated
            .slice(patchStartIdx + PATCH_START.length, patchEndIdx)
            .trim()

          try {
            const patch = JSON.parse(patchRaw) as ScenePatch
            const { scene: patchedScene, intent } = applyDiff(
              activeScene,
              patch,
              currentStep,
            )

            // Apply patched scene
            setScene(patchedScene)
            setTotalSteps(patchedScene.steps.length)

            // Resolve PlaybackIntent atomically
            if (intent.action === 'pause') {
              pause()
            } else if (intent.action === 'rewind') {
              jumpToStep(intent.targetStep)
            }

            // Canvas glow — only on success
            triggerGlow()
          } catch (patchErr) {
            const errMsg =
              patchErr instanceof Error ? patchErr.message : 'Unknown patch error'
            setLastMessageContent(
              `${accumulated.slice(0, patchStartIdx).trimEnd()}\n\n⚠ Could not apply visualization patch: ${errMsg}`,
            )
          }
        } else if (patchStartIdx !== -1) {
          // Patch marker started but no end marker — treat as malformed, show clean text
          const cleanText = accumulated.slice(0, patchStartIdx).trimEnd()
          setLastMessageContent(cleanText)
        }
        // If no patch markers: accumulated text is already displayed correctly
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Request failed'
        setLastMessageContent(`⚠ Chat error: ${errMsg}`)
      } finally {
        setLoading(false)
      }
    },
    [
      activeScene,
      currentStep,
      messages,
      provider,
      model,
      apiKeys,
      addUserMessage,
      addAssistantMessage,
      appendToLastMessage,
      setLastMessageContent,
      setLoading,
      setScene,
      setTotalSteps,
      pause,
      jumpToStep,
      triggerGlow,
    ],
  )

  return { sendMessage }
}

// ─── parseTextStreamChunk ─────────────────────────────────────────────────────
// toTextStreamResponse() returns plain text chunks — no protocol envelope.
// Just return the raw decoded bytes as-is.

function parseTextStreamChunk(raw: string): string {
  return raw
}
