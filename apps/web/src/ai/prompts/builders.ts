import { loadPromptMarkdown } from './loadPrompt'
import type { ISCLParsed } from '@insyte/scene-engine'
import type { SceneType } from '@insyte/scene-engine'

// ─── Stage 1 ─────────────────────────────────────────────────────────────────

/**
 * Builds the Stage 1 prompt that asks the AI to generate ISCL.
 * mode is optional — if omitted the AI picks the type from the topic.
 */
export function buildStage1Prompt(topic: string, mode?: SceneType): string {
  const template = loadPromptMarkdown('stage1-iscl.md')
  let out = template.replace('{topic}', topic)
  if (mode) {
    out = out + `\n## Preferred type\n\nUse TYPE ${mode} unless the topic strongly implies a different type.\n`
  }
  return out
}

// ─── Stage 2a ────────────────────────────────────────────────────────────────

/**
 * Builds the Stage 2a prompt for initial visual states.
 * Injects visualDecls as a JSON array and passes the topic for context.
 */
export function buildStage2aPrompt(parsed: ISCLParsed, topic: string): string {
  const template = loadPromptMarkdown('stage2a-states.md')
  const visualDecls = JSON.stringify(
    parsed.visualDecls.map(d => ({ id: d.id, type: d.type })),
    null,
    2,
  )
  return template
    .replace('{visualDecls}', visualDecls)
    .replace('{topic}', topic)
}

// ─── Stage 2b ────────────────────────────────────────────────────────────────

/**
 * Builds the Stage 2b prompt for step params.
 * Injects visualIdList and isclSteps as hard constraints so the AI selects
 * from enumerated IDs rather than hallucinating new ones.
 */
export function buildStage2bPrompt(parsed: ISCLParsed): string {
  const template = loadPromptMarkdown('stage2b-steps.md')
  const visualIdList = [...parsed.visualIds].join(', ')
  const isclSteps = parsed.steps
    .filter(s => !s.isInit)
    .map(s =>
      `STEP ${s.index}: ${s.sets.map(set => `SET ${set.visualId} ${set.field}=${set.rawValue}`).join(' | ')}`,
    )
    .join('\n')

  return template
    .replace(/{visualIdList}/g, visualIdList)
    .replace(/{stepCount}/g, String(parsed.stepCount))
    .replace(/{maxStepIndex}/g, String(parsed.stepCount - 1))
    .replace('{isclSteps}', isclSteps)
}

// ─── Stage 3 ─────────────────────────────────────────────────────────────────

/**
 * Builds the Stage 3 prompt for annotations.
 * visualIds and stepCount are injected as literal constraints — the AI selects
 * valid values from the list rather than recalling them from generation history.
 */
export function buildStage3Prompt(parsed: ISCLParsed, topic: string): string {
  const template = loadPromptMarkdown('stage3-annotations.md')
  const visualIdList = [...parsed.visualIds].join(', ')
  return template
    .replace(/{visualIdList}/g, visualIdList)
    .replace(/{stepCount}/g, String(parsed.stepCount))
    .replace(/{maxStepIndex}/g, String(parsed.stepCount - 1))
    .replace('{topic}', topic)
}

// ─── Stage 4 ─────────────────────────────────────────────────────────────────

/**
 * Builds the Stage 4 prompt for challenges and controls.
 * Fully independent — no cross-references to inject.
 */
export function buildStage4Prompt(topic: string): string {
  const template = loadPromptMarkdown('stage4-misc.md')
  return template.replace('{topic}', topic)
}
