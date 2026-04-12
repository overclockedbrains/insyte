# Phase 24 — ISCL Grammar & Parser

**Goal:** Design and implement the Insyte Scene Language (ISCL) — a purpose-built text DSL that AI generates instead of Scene JSON. A deterministic TypeScript parser converts ISCL to a structured parse result that downstream pipeline stages use as ground truth. The grammar physically cannot express XY coordinates, making broken layout structurally impossible. All cross-references are validated by the parser, not the LLM.

**Source research:** `advanced-ai-pipeline.md` Part 2 (§2.3–2.7), `ARCHITECTURE_V3.md` Part 2 (§2.1–2.6), `ARCHITECTURE_RECOMMENDATIONS_V2.md` Track B §B2

**Estimated effort:** 5–6 days

**Prerequisite:** Phase 19 (schema types needed for ISCLParseResult)

**Note:** This phase is independent of phases 20–23 (layout engine, scene graph, runtime) and can be developed in parallel.

---

## Why ISCL Exists

Direct Scene JSON generation asks the LLM to produce 4,000–8,000 tokens of cross-referentially consistent JSON in one pass. Failure rate: 50–60% of generations.

ISCL changes the generation contract:
- **AI generates ISCL** (~600–900 tokens) — a flat line-oriented text script
- **Parser converts to ISCLParseResult** — deterministically, with full reference validation
- **Pipeline uses ISCLParseResult as ground truth** — visual IDs and step count are facts, not recalled outputs

The grammar is designed so that:
1. XY coordinates **cannot be expressed** — broken layout is impossible by construction
2. All visual IDs are declared in a header — downstream references are validated against this registry
3. Step count is implicit — counted from STEP lines, injected into downstream stages as a hard constraint
4. Flat line structure — lower LLM perplexity than nested JSON

**Expected outcome: 80–90% reduction in generation failures** (from ~50–60% to ~5–10%).

---

## Complete ISCL Grammar

```
# ─── Top-level declarations (required, must appear first) ─────────────────────
SCENE "<title>"
TYPE <concept | dsa-trace | lld | hld>
LAYOUT <text-left-canvas-right | canvas-only | code-left-canvas-right>

# ─── Visual declarations ──────────────────────────────────────────────────────
# IDs established here are the ONLY valid targets in all subsequent lines.
# Parser rejects any reference to an undeclared ID.
VISUAL <type> <id> [HINT <layoutHint>] [SLOT <slotPosition>]

# type:         array | hashmap | linked-list | tree | graph | stack | queue |
#               dp-table | grid | recursion-tree | system-diagram | text-badge | counter
# layoutHint:   dagre-TB | dagre-LR | dagre-BT | tree-RT | linear-H | linear-V |
#               grid-2d | hashmap-buckets | radial
# slotPosition: top-left | top-center | top-right | bottom-left | bottom-center |
#               bottom-right | left-center | right-center | overlay-top | overlay-bottom | center

# ─── Step declarations ────────────────────────────────────────────────────────
# STEP 0 must always be init (no SET lines — initial state comes from Stage 2a)
# Steps must be monotonically numbered from 0 with no gaps
# Step count is implicit — parser counts STEP lines
STEP 0 : init
STEP <n> : SET <id> <field>=<value> [| SET <id> <field>=<value> ...]

# Field/value examples (type-specific):
#   cells=[{v:1,h:active},{v:3}]               array
#   items=[{value:X,h:active}]                 stack/queue
#   entries=[{key:foo,value:bar,h:insert}]     hashmap
#   nodes=[{id:n1,label:A}] edges=[{from:n1,to:n2}]    graph/system-diagram
#   root={id:n1,value:8,left:{id:n2,value:4},right:null}  tree
#   value=42                                   counter
#   text="message here"                        text-badge

# ─── Explanation ──────────────────────────────────────────────────────────────
# Step indices validated against STEP count at parse time
# Parser rejects any index >= stepCount
EXPLANATION
  <n> : "<heading>" | "<body>"
  <n> : "<heading>" | "<body>"

# ─── Popups ───────────────────────────────────────────────────────────────────
# <id> validated against VISUAL ids at parse time
# AT <n> validated against step count at parse time
POPUP <id> AT <n> [UNTIL <n>] : "<text>" [STYLE <info | success | warning | insight>]

# ─── Challenges ───────────────────────────────────────────────────────────────
CHALLENGES
  <predict | break-it | optimize | scenario> : "<text>"

# ─── Controls (optional) ──────────────────────────────────────────────────────
CONTROL slider <id> "<label>" MIN <n> MAX <n> DEFAULT <n>
CONTROL toggle <id> "<label>" [on | off]
CONTROL button <id> "<label>"
```

---

## What Actually Changes

### 1. `packages/scene-engine/src/iscl/types.ts` — New file

```typescript
import type { SceneType, SceneLayout, VisualType, LayoutHint, SlotPosition } from '../types'

export interface ISCLParseResult {
  ok: boolean
  error?: { line: number; col?: number; message: string }

  // Only present when ok === true
  parsed?: ISCLParsed
}

export interface ISCLParsed {
  // Top-level scene metadata
  title: string
  type: SceneType
  layout: SceneLayout

  // Ground truth for all downstream stages
  visualIds: Set<string>
  visualDecls: ISCLVisualDecl[]

  // Step count — injected into Stage 2b and Stage 3 prompts as hard constraint
  stepCount: number

  // Raw step data (initialState filled in by Stage 2a)
  steps: ISCLStep[]

  // Annotation data (validated against visualIds + stepCount at parse time)
  explanation: ISCLExplanationEntry[]
  popups: ISCLPopup[]
  challenges: ISCLChallenge[]
  controls: ISCLControl[]
}

export interface ISCLVisualDecl {
  id: string
  type: VisualType
  layoutHint?: LayoutHint
  slot?: SlotPosition
}

export interface ISCLStep {
  index: number
  isInit: boolean
  sets: ISCLSet[]
}

export interface ISCLSet {
  visualId: string     // validated against visualIds
  field: string
  rawValue: string     // unparsed — Stage 2b will parse into typed params
}

export interface ISCLExplanationEntry {
  stepIndex: number    // validated: < stepCount
  heading: string
  body: string
}

export interface ISCLPopup {
  attachId: string     // validated: in visualIds
  showAt: number       // validated: < stepCount
  hideAt?: number      // validated: <= stepCount
  text: string
  style: 'info' | 'success' | 'warning' | 'insight'
}

export interface ISCLChallenge {
  type: 'predict' | 'break-it' | 'optimize' | 'scenario'
  text: string
}

export interface ISCLControl {
  controlType: 'slider' | 'toggle' | 'button'
  id: string
  label: string
  config: Record<string, unknown>
}
```

---

### 2. `packages/scene-engine/src/iscl/parser.ts` — New file (main parser)

```typescript
import type { ISCLParseResult, ISCLParsed, ISCLStep, ISCLSet } from './types'

type ParseError = { line: number; message: string }

/**
 * Parse an ISCL script string into a validated ISCLParseResult.
 * Deterministic, zero side effects, zero AI calls.
 */
export function parseISCL(script: string): ISCLParseResult {
  const lines = script.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  
  const ctx: ParserContext = {
    visualIds: new Set<string>(),
    visualDecls: [],
    steps: [],
    explanation: [],
    popups: [],
    challenges: [],
    controls: [],
    title: '',
    type: undefined as any,
    layout: undefined as any,
    inExplanation: false,
    inChallenges: false,
    stepCount: 0,
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    try {
      parseLine(line, lineNum, ctx)
    } catch (err: any) {
      return { ok: false, error: { line: lineNum, message: err.message } }
    }
  }

  // Validate required fields
  if (!ctx.title) return { ok: false, error: { line: 0, message: 'Missing SCENE declaration' } }
  if (!ctx.type) return { ok: false, error: { line: 0, message: 'Missing TYPE declaration' } }
  if (!ctx.layout) return { ok: false, error: { line: 0, message: 'Missing LAYOUT declaration' } }
  if (ctx.visualDecls.length === 0) return { ok: false, error: { line: 0, message: 'No VISUAL declarations found' } }
  if (ctx.steps.length === 0) return { ok: false, error: { line: 0, message: 'No STEP declarations found' } }
  if (ctx.steps[0].index !== 0 || !ctx.steps[0].isInit) {
    return { ok: false, error: { line: 0, message: 'First STEP must be: STEP 0 : init' } }
  }

  ctx.stepCount = ctx.steps.length

  // Validate EXPLANATION step indices
  for (const exp of ctx.explanation) {
    if (exp.stepIndex >= ctx.stepCount) {
      return {
        ok: false,
        error: { line: 0, message: `Explanation references step ${exp.stepIndex} but only ${ctx.stepCount} steps exist (max: ${ctx.stepCount - 1})` }
      }
    }
  }

  // Validate POPUP references
  for (const popup of ctx.popups) {
    if (!ctx.visualIds.has(popup.attachId)) {
      return {
        ok: false,
        error: { line: 0, message: `POPUP references unknown visual ID "${popup.attachId}". Declared IDs: ${[...ctx.visualIds].join(', ')}` }
      }
    }
    if (popup.showAt >= ctx.stepCount) {
      return {
        ok: false,
        error: { line: 0, message: `POPUP AT ${popup.showAt} exceeds step count ${ctx.stepCount}` }
      }
    }
    if (popup.hideAt !== undefined && popup.hideAt > ctx.stepCount) {
      return {
        ok: false,
        error: { line: 0, message: `POPUP UNTIL ${popup.hideAt} exceeds step count ${ctx.stepCount}` }
      }
    }
  }

  // Validate SET references in steps
  for (const step of ctx.steps) {
    for (const set of step.sets) {
      if (!ctx.visualIds.has(set.visualId)) {
        return {
          ok: false,
          error: { line: 0, message: `STEP ${step.index} references unknown visual ID "${set.visualId}". Declared IDs: ${[...ctx.visualIds].join(', ')}` }
        }
      }
    }
  }

  return {
    ok: true,
    parsed: {
      title: ctx.title,
      type: ctx.type,
      layout: ctx.layout,
      visualIds: ctx.visualIds,
      visualDecls: ctx.visualDecls,
      stepCount: ctx.stepCount,
      steps: ctx.steps,
      explanation: ctx.explanation,
      popups: ctx.popups,
      challenges: ctx.challenges,
      controls: ctx.controls,
    },
  }
}

// ─── Line parsers ─────────────────────────────────────────────────────────────

function parseLine(line: string, lineNum: number, ctx: ParserContext): void {
  // Handle multi-line section continuation (EXPLANATION, CHALLENGES)
  if (ctx.inExplanation && !isDirective(line)) {
    parseExplanationLine(line, lineNum, ctx)
    return
  }
  if (ctx.inChallenges && !isDirective(line)) {
    parseChallengesLine(line, lineNum, ctx)
    return
  }

  // Exit section mode on new top-level directive
  if (isDirective(line)) {
    ctx.inExplanation = false
    ctx.inChallenges = false
  }

  if (line.startsWith('SCENE '))      { ctx.title = parseQuotedString(line.slice(6), lineNum); return }
  if (line.startsWith('TYPE '))       { ctx.type = parseEnum(line.slice(5), VALID_TYPES, lineNum); return }
  if (line.startsWith('LAYOUT '))     { ctx.layout = parseEnum(line.slice(7), VALID_LAYOUTS, lineNum); return }
  if (line.startsWith('VISUAL '))     { parseVisualLine(line.slice(7), lineNum, ctx); return }
  if (line.startsWith('STEP '))       { parseStepLine(line.slice(5), lineNum, ctx); return }
  if (line === 'EXPLANATION')         { ctx.inExplanation = true; return }
  if (line === 'CHALLENGES')          { ctx.inChallenges = true; return }
  if (line.startsWith('POPUP '))      { parsePopupLine(line.slice(6), lineNum, ctx); return }
  if (line.startsWith('CONTROL '))    { parseControlLine(line.slice(8), lineNum, ctx); return }

  // Unknown directive
  throw new Error(`Unrecognized directive: "${line.slice(0, 20)}..."`)
}

function parseVisualLine(rest: string, lineNum: number, ctx: ParserContext): void {
  // VISUAL <type> <id> [HINT <layoutHint>] [SLOT <slotPosition>]
  const parts = rest.split(/\s+/)
  if (parts.length < 2) throw new Error(`VISUAL requires at least type and id`)

  const type = parseEnum(parts[0], VALID_VISUAL_TYPES, lineNum)
  const id = parts[1]

  if (ctx.visualIds.has(id)) throw new Error(`Duplicate visual ID: "${id}"`)
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id)) throw new Error(`Invalid visual ID: "${id}" (must match /^[a-zA-Z][a-zA-Z0-9_-]*$/)`)

  ctx.visualIds.add(id)

  let layoutHint: string | undefined
  let slot: string | undefined

  const hintIdx = parts.indexOf('HINT')
  if (hintIdx !== -1 && parts[hintIdx + 1]) {
    layoutHint = parseEnum(parts[hintIdx + 1], VALID_LAYOUT_HINTS, lineNum)
  }

  const slotIdx = parts.indexOf('SLOT')
  if (slotIdx !== -1 && parts[slotIdx + 1]) {
    slot = parseEnum(parts[slotIdx + 1], VALID_SLOTS, lineNum)
  }

  ctx.visualDecls.push({ id, type, layoutHint: layoutHint as any, slot: slot as any })
}

function parseStepLine(rest: string, lineNum: number, ctx: ParserContext): void {
  // STEP <n> : init
  // STEP <n> : SET <id> <field>=<value> [| SET ...]
  const colonIdx = rest.indexOf(' : ')
  if (colonIdx === -1) throw new Error(`STEP missing " : " separator`)

  const indexStr = rest.slice(0, colonIdx).trim()
  const index = parseInt(indexStr)
  if (isNaN(index)) throw new Error(`Invalid step index: "${indexStr}"`)

  // Steps must be monotonically numbered from 0
  if (ctx.steps.length > 0 && index !== ctx.steps[ctx.steps.length - 1].index + 1) {
    throw new Error(`Steps must be numbered sequentially. Expected ${ctx.steps.length}, got ${index}`)
  }

  const body = rest.slice(colonIdx + 3).trim()

  if (body === 'init') {
    if (index !== 0) throw new Error(`Only STEP 0 can be "init"`)
    ctx.steps.push({ index, isInit: true, sets: [] })
    return
  }

  // Parse SET clauses
  const setClauses = body.split(' | ')
  const sets: ISCLSet[] = setClauses.map(clause => {
    if (!clause.startsWith('SET ')) throw new Error(`Step body must start with SET: "${clause}"`)
    const setRest = clause.slice(4).trim()
    const spaceIdx = setRest.indexOf(' ')
    if (spaceIdx === -1) throw new Error(`SET requires: SET <id> <field>=<value>`)

    const visualId = setRest.slice(0, spaceIdx)
    const fieldValue = setRest.slice(spaceIdx + 1)
    const eqIdx = fieldValue.indexOf('=')
    if (eqIdx === -1) throw new Error(`SET value missing "=": "${fieldValue}"`)

    const field = fieldValue.slice(0, eqIdx)
    const rawValue = fieldValue.slice(eqIdx + 1)

    return { visualId, field, rawValue }
  })

  ctx.steps.push({ index, isInit: false, sets })
}

function parseExplanationLine(line: string, lineNum: number, ctx: ParserContext): void {
  // <n> : "<heading>" | "<body>"
  const colonIdx = line.indexOf(' : ')
  if (colonIdx === -1) return  // blank line inside section

  const stepIndex = parseInt(line.slice(0, colonIdx).trim())
  if (isNaN(stepIndex)) throw new Error(`Invalid explanation step index: "${line.slice(0, colonIdx)}"`)

  const rest = line.slice(colonIdx + 3)
  const pipeIdx = rest.indexOf(' | ')
  if (pipeIdx === -1) throw new Error(`Explanation must have heading | body format`)

  const heading = parseQuotedString(rest.slice(0, pipeIdx).trim(), lineNum)
  const body = parseQuotedString(rest.slice(pipeIdx + 3).trim(), lineNum)

  ctx.explanation.push({ stepIndex, heading, body })
}

function parseChallengesLine(line: string, lineNum: number, ctx: ParserContext): void {
  // <type> : "<text>"
  const colonIdx = line.indexOf(' : ')
  if (colonIdx === -1) return

  const type = line.slice(0, colonIdx).trim()
  if (!VALID_CHALLENGE_TYPES.includes(type)) {
    throw new Error(`Invalid challenge type: "${type}". Must be one of: ${VALID_CHALLENGE_TYPES.join(', ')}`)
  }

  const text = parseQuotedString(line.slice(colonIdx + 3).trim(), lineNum)
  ctx.challenges.push({ type: type as any, text })
}

function parsePopupLine(rest: string, lineNum: number, ctx: ParserContext): void {
  // POPUP <id> AT <n> [UNTIL <n>] : "<text>" [STYLE <style>]
  const colonIdx = rest.indexOf(' : ')
  if (colonIdx === -1) throw new Error(`POPUP missing " : " separator`)

  const meta = rest.slice(0, colonIdx).trim()
  const textAndStyle = rest.slice(colonIdx + 3).trim()

  // Parse meta: <id> AT <n> [UNTIL <n>]
  const metaParts = meta.split(/\s+/)
  const attachId = metaParts[0]
  const atIdx = metaParts.indexOf('AT')
  if (atIdx === -1) throw new Error(`POPUP missing AT keyword`)

  const showAt = parseInt(metaParts[atIdx + 1])
  if (isNaN(showAt)) throw new Error(`POPUP AT requires a number`)

  let hideAt: number | undefined
  const untilIdx = metaParts.indexOf('UNTIL')
  if (untilIdx !== -1) {
    hideAt = parseInt(metaParts[untilIdx + 1])
    if (isNaN(hideAt)) throw new Error(`POPUP UNTIL requires a number`)
  }

  // Parse text and optional STYLE
  let text: string
  let style: ISCLPopup['style'] = 'info'

  const styleKeyword = ' STYLE '
  const styleIdx = textAndStyle.indexOf(styleKeyword)
  if (styleIdx !== -1) {
    text = parseQuotedString(textAndStyle.slice(0, styleIdx).trim(), lineNum)
    const styleStr = textAndStyle.slice(styleIdx + styleKeyword.length).trim()
    style = parseEnum(styleStr, ['info', 'success', 'warning', 'insight'], lineNum) as any
  } else {
    text = parseQuotedString(textAndStyle, lineNum)
  }

  ctx.popups.push({ attachId, showAt, hideAt, text, style })
}

function parseControlLine(rest: string, lineNum: number, ctx: ParserContext): void {
  const parts = rest.trim().split(/\s+/)
  const controlType = parseEnum(parts[0], ['slider', 'toggle', 'button'], lineNum)
  const id = parts[1]
  const label = parseQuotedString(parts[2], lineNum)

  let config: Record<string, unknown> = {}

  if (controlType === 'slider') {
    const minIdx = parts.indexOf('MIN')
    const maxIdx = parts.indexOf('MAX')
    const defIdx = parts.indexOf('DEFAULT')
    config = {
      min: minIdx !== -1 ? parseFloat(parts[minIdx + 1]) : 0,
      max: maxIdx !== -1 ? parseFloat(parts[maxIdx + 1]) : 100,
      default: defIdx !== -1 ? parseFloat(parts[defIdx + 1]) : 50,
    }
  } else if (controlType === 'toggle') {
    config = { default: parts.includes('on') }
  }

  ctx.controls.push({ controlType: controlType as any, id, label, config })
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function parseQuotedString(s: string, lineNum: number): string {
  const trimmed = s.trim()
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1)
  }
  return trimmed  // allow unquoted strings for backwards compat
}

function parseEnum<T extends string>(s: string, valid: readonly T[], lineNum: number): T {
  const trimmed = s.trim() as T
  if (!valid.includes(trimmed)) {
    throw new Error(`Invalid value "${trimmed}" at line ${lineNum}. Must be one of: ${valid.join(', ')}`)
  }
  return trimmed
}

function isDirective(line: string): boolean {
  return ['SCENE ', 'TYPE ', 'LAYOUT ', 'VISUAL ', 'STEP ', 'EXPLANATION', 'CHALLENGES', 'POPUP ', 'CONTROL ']
    .some(d => line.startsWith(d))
}

// ─── Valid value sets ─────────────────────────────────────────────────────────
const VALID_TYPES = ['concept', 'dsa-trace', 'lld', 'hld'] as const
const VALID_LAYOUTS = ['text-left-canvas-right', 'canvas-only', 'code-left-canvas-right'] as const
const VALID_VISUAL_TYPES = ['array', 'hashmap', 'linked-list', 'tree', 'graph', 'stack', 'queue', 'dp-table', 'grid', 'recursion-tree', 'system-diagram', 'text-badge', 'counter'] as const
const VALID_LAYOUT_HINTS = ['dagre-TB', 'dagre-LR', 'dagre-BT', 'tree-RT', 'linear-H', 'linear-V', 'grid-2d', 'hashmap-buckets', 'radial'] as const
const VALID_SLOTS = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right', 'left-center', 'right-center', 'overlay-top', 'overlay-bottom', 'center'] as const
const VALID_CHALLENGE_TYPES = ['predict', 'break-it', 'optimize', 'scenario'] as const

interface ParserContext extends ISCLParsed {
  inExplanation: boolean
  inChallenges: boolean
}
```

---

### 3. `packages/scene-engine/src/iscl/index.ts` — New file

```typescript
export { parseISCL } from './parser'
export type {
  ISCLParseResult,
  ISCLParsed,
  ISCLVisualDecl,
  ISCLStep,
  ISCLSet,
  ISCLExplanationEntry,
  ISCLPopup,
  ISCLChallenge,
  ISCLControl,
} from './types'
```

Export from `packages/scene-engine/src/index.ts`.

---

### 4. Parser unit tests

`packages/scene-engine/src/iscl/parser.test.ts` — Test all validation rules:

```typescript
describe('parseISCL', () => {
  it('parses a valid binary search script', () => {
    const result = parseISCL(BINARY_SEARCH_ISCL)
    expect(result.ok).toBe(true)
    expect(result.parsed!.stepCount).toBe(6)
    expect(result.parsed!.visualIds).toContain('arr')
    expect(result.parsed!.visualIds).toContain('left-ptr')
  })

  it('rejects unknown visual ID in SET', () => {
    const script = `SCENE "Test"\nTYPE concept\nLAYOUT canvas-only\nVISUAL array arr\nSTEP 0 : init\nSTEP 1 : SET unknown-id cells=[{v:1}]`
    const result = parseISCL(script)
    expect(result.ok).toBe(false)
    expect(result.error!.message).toContain('unknown-id')
  })

  it('rejects out-of-range explanation step index', () => {
    // ... setup script with 3 steps but explanation referencing step 5
    expect(result.ok).toBe(false)
    expect(result.error!.message).toContain('step 5')
  })

  it('rejects duplicate visual IDs', () => { ... })
  it('rejects non-monotonic step numbering', () => { ... })
  it('rejects POPUP referencing unknown visual', () => { ... })
  it('rejects STEP 0 that is not init', () => { ... })
  it('parses all 13 visual types', () => { ... })
  it('parses all control types (slider/toggle/button)', () => { ... })
})
```

---

## Files Changed Summary

| File | Action | Why |
|------|--------|-----|
| `packages/scene-engine/src/iscl/types.ts` | New | ISCLParseResult + all sub-types |
| `packages/scene-engine/src/iscl/parser.ts` | New | Complete line-by-line ISCL parser |
| `packages/scene-engine/src/iscl/index.ts` | New | Barrel exports |
| `packages/scene-engine/src/iscl/parser.test.ts` | New | Unit tests for all validation rules |
| `packages/scene-engine/src/index.ts` | Edit | Export ISCL module |

---

## Key Design Decisions

**No XY in grammar:** There is no syntax for expressing coordinates. The parser cannot receive a position even if the LLM tries to emit one. This is the Mermaid insight applied to Insyte.

**Grammar validates, not prompts:** Cross-reference correctness is enforced by code, not by prompting the LLM to "be careful." The parser either accepts or rejects — no ambiguity.

**Flat line structure:** Line-oriented text is simpler for transformer positional encoding than deeply nested JSON. LLM perplexity (uncertainty per token) is lower for ISCL than equivalent JSON — empirically validated by the Mermaid benchmark (near-zero semantic error rate vs 15–20% for AST JSON).

**ISCLParseResult is ground truth:** Visual IDs in `visualIds`, step count in `stepCount` — these are passed as literal inputs to Stages 2b and 3. The LLM reads them from its prompt context, not from its generation history. This is the single highest-impact change for eliminating target-mismatch errors.
