import type React from 'react'
import type { SceneRendererProps } from './types'
import { DOMRenderer } from './DOMRenderer'
import { CanvasRenderer } from './CanvasRenderer'

/**
 * Renderer registry — maps NEXT_PUBLIC_RENDERER values to implementations.
 *
 * To add a new renderer:
 *   1. Create a component implementing SceneRendererProps
 *   2. Add it here
 *   3. Set NEXT_PUBLIC_RENDERER=<key> in .env.local
 *   No other files need to change.
 */
const RENDERERS: Record<string, React.ComponentType<SceneRendererProps>> = {
  dom: DOMRenderer,
  canvas: CanvasRenderer,
}

export const ActiveRenderer: React.ComponentType<SceneRendererProps> =
  RENDERERS[process.env.NEXT_PUBLIC_RENDERER ?? 'dom'] ?? DOMRenderer
