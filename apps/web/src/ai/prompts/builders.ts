import { loadPromptMarkdown } from './loadPrompt'
import { buildPromptGuide } from '@insyte/scene-engine'
import type { SceneSkeletonParsed, StepsParsed } from '../schemas'
import type { SceneType, VisualType } from '@insyte/scene-engine'

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
  'Each popup must attach to a declared canvas visual element and appear at a specific step range.'

export const STAGE4_SYSTEM =
  'You are an expert CS educator writing open-ended challenge questions for learners who just\n' +
  'watched an interactive visualization. Each challenge is a question prompt — NOT multiple choice.\n' +
  'Write questions that make the learner think, trace, or predict — not questions they can Google.'

// ─── appendErrorGuidance ──────────────────────────────────────────────────────

function appendErrorGuidance(base: string, lastError?: string): string {
  if (!lastError) return base
  const errorParts = lastError.split(/;\s*/).filter(Boolean)
  const formatted = errorParts.length === 1
    ? `- ${errorParts[0]}`
    : errorParts.map((e, i) => `${i + 1}. ${e}`).join('\n')
  return `${base}

---
Your previous attempt was rejected. Fix ALL of these issues — do not change anything that was already correct:

${formatted}`
}

// ─── Stage 0 ─────────────────────────────────────────────────────────────────

export function buildStage0Prompt(topic: string, mode?: SceneType): string {
  return loadPromptMarkdown('stage0-reasoning.md')
    .replace('{topic}', topic)
    .replace('{mode}', mode ?? 'auto')
}

// ─── Stage 1 ─────────────────────────────────────────────────────────────────

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

export function buildStage2Prompt(
  topic: string,
  reasoning: string,
  skeleton: SceneSkeletonParsed,
  lastError?: string,
): string {
  const canvasIdsList = skeleton.canvas
    .map(v => `- ${v.id} (${v.type}${v.variant ? `, variant: ${v.variant}` : ''})`)
    .join('\n')
  const skeletonJson = JSON.stringify(skeleton, null, 2)

  const canvasVisuals = skeleton.canvas.map(v => ({
    id:      v.id,
    type:    v.type as VisualType,
    variant: v.variant,
  }))
  const hudItems = skeleton.hud ?? []
  const promptGuide = buildPromptGuide(canvasVisuals, hudItems)

  const base = loadPromptMarkdown('stage2-steps.md')
    .replace('{canvasIdsList}', canvasIdsList)
    .replace('{skeletonJson}', skeletonJson)
    .replace('{reasoning}', reasoning)
    .replace('{stepCount}', String(skeleton.stepCount))
    .replace('{promptGuide}', promptGuide)
    .replace('{topic}', topic)
  return appendErrorGuidance(base, lastError)
}

// ─── Stage 3 ─────────────────────────────────────────────────────────────────

export function buildStage3Prompt(
  topic: string,
  skeleton: SceneSkeletonParsed,
  stepsParsed: StepsParsed | null,
  lastError?: string,
): string {
  const canvasIdsList = skeleton.canvas
    .map(v => `- ${v.id} (${v.type}${v.variant ? `, variant: ${v.variant}` : ''})`)
    .join('\n')
  const stepSummaries = stepsParsed
    ? stepsParsed.steps.map(s => {
      const targets = s.canvas ? Object.keys(s.canvas).join(', ') : ''
      return `Step ${s.index}: ${s.explanation.heading}${targets ? ` [canvas: ${targets}]` : ''}`
    }).join('\n')
    : Array.from({ length: skeleton.stepCount }, (_, i) => `Step ${i + 1}: (step ${i + 1})`).join('\n')
  const base = loadPromptMarkdown('stage3-popups.md')
    .replace('{canvasIdsList}', canvasIdsList)
    .replace('{stepCount}', String(skeleton.stepCount))
    .replace('{stepSummaries}', stepSummaries)
    .replace('{topic}', topic)
  return appendErrorGuidance(base, lastError)
}

// ─── Stage 4 ─────────────────────────────────────────────────────────────────

export function buildStage4Prompt(
  topic: string,
  skeleton: SceneSkeletonParsed,
  stepsParsed: StepsParsed | null,
  lastError?: string,
): string {
  const canvasList = skeleton.canvas
    .map(v => `${v.id} (${v.type}${v.variant ? `, variant: ${v.variant}` : ''})`)
    .join(', ')
  const stepSummaries = stepsParsed
    ? stepsParsed.steps.map(s => `${s.index}. ${s.explanation.heading}`).join('\n')
    : '(steps not available)'
  const base = loadPromptMarkdown('stage4-misc.md')
    .replace('{topic}', topic)
    .replace('{visualsList}', canvasList)
    .replace('{stepSummaries}', stepSummaries)
  return appendErrorGuidance(base, lastError)
}
