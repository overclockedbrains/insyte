'use client'

import { streamText, Output } from 'ai'
import type { DeepPartial } from 'ai'
import { SceneSchema } from '@insyte/scene-engine'
import type { Scene } from '@insyte/scene-engine'
import { getAIProvider } from './providers'
import type { ProviderSettings } from './providers'
import { SCENE_SYSTEM_PROMPT, buildSceneUserMessage } from './prompts/scene-generation'
import { SceneGenerationError } from './generateScene'

// ─── generateSceneBrowserDirect ───────────────────────────────────────────────
//
// BYOK path: runs entirely in the browser with the user's own API key.
// The key is read from settings-store (localStorage) and passed directly
// to the AI SDK — it NEVER touches our servers.
//
// Calling this function instead of /api/generate ensures the BYOK contract:
//   "API keys must never reach the server."

export interface StreamSceneCallbacks {
  onPartial: (partial: DeepPartial<Scene>) => void
  onComplete: (scene: Scene) => void
  onError: (err: Error) => void
}

export async function generateSceneBrowserDirect(
  topic: string,
  settings: ProviderSettings,
  callbacks: StreamSceneCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const model = getAIProvider(settings)

  const result = streamText({
    model,
    output: Output.object({ schema: SceneSchema }),
    system: SCENE_SYSTEM_PROMPT,
    prompt: buildSceneUserMessage(topic),
    maxOutputTokens: 16384,
    abortSignal: signal,
  })

  try {
    for await (const partial of result.partialOutputStream) {
      callbacks.onPartial(partial as DeepPartial<Scene>)
    }

    const raw = await result.output
    callbacks.onComplete(raw as Scene)
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return
    callbacks.onError(
      err instanceof Error
        ? err
        : new SceneGenerationError('Browser-direct generation failed'),
    )
  }
}
