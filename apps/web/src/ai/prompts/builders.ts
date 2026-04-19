import { loadPromptMarkdown } from './loadPrompt'
import type { SceneSkeletonParsed, StepsParsed } from '../schemas'
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

export const STAGE4_SYSTEM =
  'You are an expert CS educator writing open-ended challenge questions for learners who just\n' +
  'watched an interactive visualization. Each challenge is a question prompt — NOT multiple choice.\n' +
  'Write questions that make the learner think, trace, or predict — not questions they can Google.'

// ─── appendErrorGuidance ──────────────────────────────────────────────────────

/**
 * Appends the previous validation error(s) to a prompt so the model knows
 * exactly what to fix on the next attempt — not just "try again".
 * Errors separated by "; " are split into a numbered list for clarity.
 */
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
 * Per visual type: the exact params shape the renderer reads.
 * Only types present in the skeleton are injected — keeps the guide tight.
 */
const VISUAL_PARAMS_REFERENCE: Record<string, { shape: string; notes: string }> = {
  'system-diagram': {
    shape: '{ "components": [{"id": "a", "label": "Node A", "icon": "server", "status": "normal|active|overloaded|dead", "sublabel": "optional"}], "connections": [{"from": "a", "to": "b", "label": "edge text", "active": false, "style": "solid|dashed"}] }',
    notes: 'FULL-STATE SNAPSHOT — repeat every component and every connection in every action (not a delta). Valid icons: server, database, mobile, web, compute, cloud, shield, layers, zap.\n  CHOREOGRAPHY RULE: when a call travels A→B→C, activate the ENTIRE path simultaneously in that step: set status="active" on A, B, and C, and set active=true on both the A→B and B→C connections. Do not activate only the caller — every node and edge the call passes through must light up together. Reset all to status="normal"/active=false in the next step unless the call is still in flight.',
  },
  'hashmap': {
    shape: '{ "entries": [{"id": "e1", "key": "goal", "value": "Find capital of Spain"}] }',
    notes: 'Each entry must have id, key, value. Use entries:[] for an empty initial state. Add entries to entries array as context is gathered.',
  },
  'text-badge': {
    shape: '{ "text": "Thinking: I need to find the city first", "style": "default|highlight|success|error" }',
    notes: '"text" is REQUIRED — never omit it or leave it empty. style: default=gray, highlight=cyan, success=green, error=red.\n  PERSISTENCE RULE: once a badge has shown a real value (e.g. "Paris"), keep that value in all subsequent steps unless the algorithm explicitly produces a new value. Never reset to the initial placeholder mid-flow — the value represents committed state, not a transient display.\n  SEMANTIC IDENTITY RULE: a badge\'s ID is a contract about what it displays. Never put content that contradicts the ID — e.g. do not show retrieval results on a badge named "augmented-prompt-badge". If no badge fits the content, omit it rather than misuse an existing badge.',
  },
  'array': {
    shape: '{ "items": [{"id": "a0", "value": 1}, {"id": "a1", "value": 3, "highlight": "active"}] }',
    notes: 'Each item needs id and value. Set highlight="active" on the current element being examined.\n  ZERO-STATE RULE: initialState must be empty (`"items": []`) unless the algorithm truly starts with pre-filled data. The first step that adds elements should animate the insertion — never pre-populate just to have something visible at frame 0.',
  },
  'stack': {
    shape: '{ "items": [{"id": "s0", "value": "A"}, {"id": "s1", "value": "B"}] }',
    notes: 'Items ordered bottom-to-top. Push = append to end. Pop = remove from end.\n  ZERO-STATE RULE: initialState must be empty (`"items": []`) unless the algorithm truly starts with a pre-filled stack. The first push should appear in step actions, not initialState.',
  },
  'queue': {
    shape: '{ "items": [{"id": "q0", "value": "task1"}] }',
    notes: 'Items ordered front-to-back. Enqueue = append. Dequeue = remove first.\n  ZERO-STATE RULE: initialState must be empty (`"items": []`) unless the algorithm truly starts with a pre-filled queue. The first enqueue should appear in step actions, not initialState.',
  },
  'linked-list': {
    shape: '{ "nodes": [{"id": "n0", "value": 1}, {"id": "n1", "value": 2}] }',
    notes: 'Edges between adjacent nodes are auto-generated. Each node needs id and value.',
  },
  'tree': {
    shape: '{ "root": {"id": "root", "value": 10, "left": {"id": "l1", "value": 5, "left": null, "right": null}, "right": null} }',
    notes: 'Binary tree — use left/right for children. null = no child.',
  },
  'recursion-tree': {
    shape: '{ "root": {"id": "r0", "value": "f(4)", "children": [{"id": "r1", "value": "f(3)", "children": []}]} }',
    notes: 'N-ary tree — use children array (may be empty []).',
  },
  'graph': {
    shape: '{ "nodes": [{"id": "A", "label": "A"}], "edges": [{"id": "e0", "from": "A", "to": "B", "label": "optional"}] }',
    notes: 'Both nodes and edges arrays are required. Edge id must be unique.',
  },
  'dp-table': {
    shape: '{ "cells": [[{"id": "r0c0", "value": 0, "highlight": "active|null"}, {"id": "r0c1", "value": 1}]] }',
    notes: 'cells is a 2D array (rows of columns). Each cell needs id and value.',
  },
  'counter': {
    shape: '{ "label": "Iterations", "value": 0 }',
    notes: 'label is the display title, value is the number shown.',
  },
}

function buildVisualParamsGuide(skeleton: SceneSkeletonParsed): string {
  const lines: string[] = []
  for (const visual of skeleton.visuals) {
    const ref = VISUAL_PARAMS_REFERENCE[visual.type]
    if (!ref) continue
    lines.push(`${visual.id} (${visual.type}):`)
    lines.push(`  params shape: ${ref.shape}`)
    lines.push(`  notes: ${ref.notes}`)
    lines.push('')
  }
  lines.push('CRITICAL: params must NEVER be empty {}. Every action must supply the COMPLETE state for that visual — this is a full snapshot, not a delta.')
  lines.push('STATE PERSISTENCE: visual state is cumulative. If a visual was not targeted in this step, its last state remains visible. If it IS targeted, carry forward all existing values and only change what the algorithm logically changes — never silently reset a field back to its initial placeholder value.')
  return lines.join('\n')
}

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
  const visualParamsGuide = buildVisualParamsGuide(skeleton)
  const base = loadPromptMarkdown('stage2-steps.md')
    .replace('{visualIdsList}', visualIdsList)
    .replace('{skeletonJson}', skeletonJson)
    .replace('{reasoning}', reasoning)
    .replace('{stepCount}', String(skeleton.stepCount))
    .replace('{visualParamsGuide}', visualParamsGuide)
    .replace('{topic}', topic)
  return appendErrorGuidance(base, lastError)
}

// ─── Stage 3 ─────────────────────────────────────────────────────────────────

/**
 * Stage 3 — popups only.
 * Uses STAGE3_SYSTEM as the system prompt.
 * Injects step headings + which visuals each step updates so popup showAtStep
 * is grounded in when each visual actually receives content — not just topic
 * knowledge. Full action params are omitted to avoid context rot.
 */
export function buildStage3Prompt(
  topic: string,
  skeleton: SceneSkeletonParsed,
  stepsParsed: StepsParsed | null,
  lastError?: string,
): string {
  const visualIdsList = skeleton.visuals.map(v => `- ${v.id} (${v.type})`).join('\n')
  const stepSummaries = stepsParsed
    ? stepsParsed.steps.map(s => {
        const targets = [...new Set(s.actions.map(a => a.target))].join(', ')
        return `Step ${s.index}: ${s.explanation.heading} [updates: ${targets}]`
      }).join('\n')
    : Array.from({ length: skeleton.stepCount }, (_, i) => `Step ${i + 1}: (step ${i + 1})`).join('\n')
  const base = loadPromptMarkdown('stage3-popups.md')
    .replace('{visualIdsList}', visualIdsList)
    .replace('{stepCount}', String(skeleton.stepCount))
    .replace('{stepSummaries}', stepSummaries)
    .replace('{topic}', topic)
  return appendErrorGuidance(base, lastError)
}

// ─── Stage 4 ─────────────────────────────────────────────────────────────────

/**
 * Stage 4 — misc challenges.
 * Injects what visuals and step headings were shown so challenges are grounded
 * in the actual animation, not generic topic knowledge.
 */
export function buildStage4Prompt(
  topic: string,
  skeleton: SceneSkeletonParsed,
  stepsParsed: StepsParsed | null,
  lastError?: string,
): string {
  const visualsList = skeleton.visuals.map(v => `${v.id} (${v.type})`).join(', ')
  const stepSummaries = stepsParsed
    ? stepsParsed.steps.map(s => `${s.index}. ${s.explanation.heading}`).join('\n')
    : '(steps not available)'
  const base = loadPromptMarkdown('stage4-misc.md')
    .replace('{topic}', topic)
    .replace('{visualsList}', visualsList)
    .replace('{stepSummaries}', stepSummaries)
  return appendErrorGuidance(base, lastError)
}
