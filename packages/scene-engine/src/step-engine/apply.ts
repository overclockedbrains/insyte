import type { CanvasVisual, Step, Scene } from '../types'
import { buildRegistry, applyStructural, resolveState } from './merge'

function isIdentityBased(type: string): boolean {
  return type === 'graph' || type === 'tree' || type === 'system-diagram'
}

/**
 * Replay canvas state from step 0 (initialState) up to stepIndex (inclusive).
 * Returns a map of visualId → complete visual state at that step.
 *
 * Sequential primitives (linear, map, grid, chart): latest full-snapshot wins.
 * Identity-based primitives (graph, tree, system-diagram): entity registry
 * with sparse overlay — topology declared once in initialState, steps carry
 * only state changes.
 */
export function applyStepActionsUpTo(
  canvas: CanvasVisual[],
  steps: Step[],
  stepIndex: number,
): Map<string, Record<string, unknown>> {
  const stateMap = new Map<string, Record<string, unknown>>()

  for (const visual of canvas) {
    if (isIdentityBased(visual.type)) {
      // Phase 1: build entity registry from all steps up to stepIndex
      const registry = buildRegistry(visual)
      for (const step of steps) {
        if (step.index > stepIndex) break
        const stepData = (step.canvas as Record<string, unknown> | undefined)?.[visual.id]
        if (stepData) applyStructural(registry, stepData, visual.type)
      }
      // Phase 2: apply state overlay at target step only
      const targetData = (steps.find(s => s.index === stepIndex)?.canvas as Record<string, unknown> | undefined)?.[visual.id]
      stateMap.set(visual.id, resolveState(registry, targetData, visual.type))
    } else {
      // Sequential: seed from initialState
      stateMap.set(visual.id, { ...(visual.initialState as Record<string, unknown>) })
    }
  }

  // Apply sequential snapshots: latest wins
  for (const step of steps) {
    if (step.index > stepIndex) break
    if (!step.canvas) continue
    for (const [id, stepData] of Object.entries(step.canvas as Record<string, unknown>)) {
      const visual = canvas.find(v => v.id === id)
      if (visual && !isIdentityBased(visual.type)) {
        stateMap.set(id, { ...(stepData as Record<string, unknown>) })
      }
    }
  }

  return stateMap
}

/**
 * Replay activeText and hud overlay values from the scene's initial values
 * up to stepIndex (inclusive). Returns the resolved overlay state at that step.
 */
export function applyOverlaysAtStep(
  scene: Pick<Scene, 'activeText' | 'hud' | 'steps'>,
  stepIndex: number,
): { activeText: string | undefined; hud: Record<string, string | number> } {
  let activeText: string | undefined = scene.activeText?.initialValue

  const hud: Record<string, string | number> = {}
  if (scene.hud) {
    for (const item of scene.hud) {
      hud[item.id] = item.initialValue
    }
  }

  for (const step of scene.steps) {
    if (step.index > stepIndex) break
    if (step.activeText !== undefined) activeText = step.activeText
    if (step.hud) {
      for (const [id, value] of Object.entries(step.hud)) {
        hud[id] = value
      }
    }
  }

  return { activeText, hud }
}

/**
 * Convenience wrapper: get the state for a single canvas visual at a specific step.
 */
export function getVisualStateAtStep(
  visual: CanvasVisual,
  steps: Step[],
  stepIndex: number,
): Record<string, unknown> {
  const stateMap = applyStepActionsUpTo([visual], steps, stepIndex)
  return stateMap.get(visual.id) ?? (visual.initialState as Record<string, unknown>)
}
