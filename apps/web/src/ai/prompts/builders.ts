import { loadPromptMarkdown } from './loadPrompt'
import type { SceneSkeletonParsed } from '../schemas'
import type { SceneType } from '@insyte/scene-engine'

// ─── System prompts (one per structured stage) ───────────────────────────────

export const STAGE1_SYSTEM =
  'You are building the skeleton for an interactive CS visualization.\n' +
  'Output only what the schema requires — no extra fields, no explanations.'

export const STAGE2_SYSTEM =
  'You are an expert CS educator and interactive simulation author.\n' +
  'Your job: write step-by-step animations that teach a concept through visual change,\n' +
  'with explanations that justify every visual action.'

export const STAGE3_SYSTEM =
  'You are adding popup callouts to an existing CS visualization.\n' +
  'Each popup must attach to a declared visual element and appear at a specific step range.'

// Stage 4 has no system prompt — the task is fully defined in the user turn.

// ─── appendErrorGuidance ──────────────────────────────────────────────────────

/**
 * Appends the previous validation error to a prompt so the model knows
 * exactly what to fix on the next attempt — not just to "try again".
 */
function appendErrorGuidance(base: string, lastError?: string): string {
  if (!lastError) return base
  return `${base}

---
Your previous attempt was rejected with this validation error:
"${lastError}"
Fix exactly that issue. Do not change anything else.`
}

// ─── Stage 0 ─────────────────────────────────────────────────────────────────

/**
 * Stage 0 — free reasoning, thinking model.
 * No system prompt. Single user turn. No few-shot. No "think step by step".
 * Stage 0 failures abort immediately (no schema to validate against, no retry).
 */
export function buildStage0Prompt(topic: string, mode?: SceneType): string {
  return loadPromptMarkdown('stage0-reasoning.md')
    .replace('{topic}', topic)
    .replace('{mode}', mode ?? 'auto')
}

// ─── Stage 1 ─────────────────────────────────────────────────────────────────

/**
 * Stage 1 — skeleton with Stage 0 context.
 * Uses STAGE1_SYSTEM as the system prompt in the generateObject call.
 */
export function buildStage1Prompt(
  topic: string,
  reasoning: string,
  lastError?: string,
): string {
  const base = loadPromptMarkdown('stage1-skeleton.md')
    .replace('{reasoning}', reasoning)
    .replace('{topic}', topic)
  return appendErrorGuidance(base, lastError)
}

// ─── Stage 2 ─────────────────────────────────────────────────────────────────

/**
 * Stage 2 — steps + explanations with constrained visual ID enum.
 * Uses STAGE2_SYSTEM as the system prompt.
 * Context rot mitigation: visual IDs at top, reasoning summary in middle, topic last.
 */
export function buildStage2Prompt(
  topic: string,
  reasoning: string,
  skeleton: SceneSkeletonParsed,
  lastError?: string,
): string {
  const visualIdsList = skeleton.visuals.map(v => `- ${v.id} (${v.type})`).join('\n')
  const skeletonJson = JSON.stringify(skeleton, null, 2)
  const base = loadPromptMarkdown('stage2-steps.md')
    .replace('{visualIdsList}', visualIdsList)
    .replace('{skeletonJson}', skeletonJson)
    .replace('{reasoning}', reasoning)
    .replace('{stepCount}', String(skeleton.stepCount))
    .replace('{topic}', topic)
  return appendErrorGuidance(base, lastError)
}

// ─── Stage 3 ─────────────────────────────────────────────────────────────────

/**
 * Stage 3 — popups only.
 * Uses STAGE3_SYSTEM as the system prompt.
 * Does NOT include Stage 2 output — popups reference step indices
 * (schema-constrained) and visual IDs (schema-constrained). Stage 2 content
 * adds context rot with no benefit.
 */
export function buildStage3Prompt(
  topic: string,
  skeleton: SceneSkeletonParsed,
  lastError?: string,
): string {
  const visualIdsList = skeleton.visuals.map(v => `- ${v.id}`).join('\n')
  const base = loadPromptMarkdown('stage3-popups.md')
    .replace('{visualIdsList}', visualIdsList)
    .replace('{stepCount}', String(skeleton.stepCount))
    .replace('{topic}', topic)
  return appendErrorGuidance(base, lastError)
}

// ─── Stage 4 ─────────────────────────────────────────────────────────────────

/**
 * Stage 4 — misc challenges.
 * No system prompt — fully independent, topic-only.
 */
export function buildStage4Prompt(topic: string, lastError?: string): string {
  const base = loadPromptMarkdown('stage4-misc.md')
    .replace('{topic}', topic)
  return appendErrorGuidance(base, lastError)
}
