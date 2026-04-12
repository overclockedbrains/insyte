'use client'

/**
 * Phase 27 — Sub-step choreography hook.
 *
 * Sequences animations through prepare → act → settle phases so the user's
 * eye can follow each individual change (VisualGo-style).
 *
 * Total duration at 1× speed: 100ms + 300ms + 200ms = 600ms per step.
 *
 * Usage in a primitive component:
 *   const [scope, animateStep] = useAnimateStep()
 *   // Attach `scope` ref to the container element
 *   await animateStep([
 *     { phase: 'prepare', targets: '.node-3', props: { boxShadow: '0 0 12px #7c3aed' }, duration: 100 },
 *     { phase: 'act',     targets: '.node-3', props: { backgroundColor: '#2d1b69' }, duration: 300 },
 *     { phase: 'settle',  targets: '.node-3', props: { border: '1px solid #10b981' }, duration: 200 },
 *   ])
 */

import { useAnimate } from 'framer-motion'

export type StepPhase = 'prepare' | 'act' | 'settle'

export interface SubStep {
  /** Semantic phase label (used to pick easing). */
  phase: StepPhase
  /** CSS selector string(s) scoped to the ref element. */
  targets: string
  /** CSS property → value map passed to Framer Motion animate(). */
  props: Record<string, unknown>
  /** Duration in milliseconds at 1× speed. */
  duration: number
  /** Optional stagger delay in milliseconds at 1× speed. */
  delay?: number
}

/**
 * Returns `[scope, animateStep]` — attach `scope` as a ref on the container,
 * then call `await animateStep(subSteps)` on step change.
 */
export function useAnimateStep(speed: number = 1): [
  ReturnType<typeof useAnimate>[0],
  (subSteps: SubStep[]) => Promise<void>,
] {
  const [scope, animate] = useAnimate()

  const animateStep = async (subSteps: SubStep[]): Promise<void> => {
    for (const subStep of subSteps) {
      const scaledDuration = subStep.duration / 1000 / speed

      await animate(
        subStep.targets,
        subStep.props as Parameters<typeof animate>[1],
        {
          duration: scaledDuration,
          delay: subStep.delay != null ? subStep.delay / 1000 / speed : 0,
          ease: subStep.phase === 'act' ? 'easeOut' : 'easeInOut',
        },
      )
    }
  }

  return [scope, animateStep]
}
