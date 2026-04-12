import type { ISCLParseResult, ISCLParsed, ISCLStep, ISCLSet, ISCLPopup } from './types'

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
    const line = lines[i]!
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
  if (ctx.steps[0]!.index !== 0 || !ctx.steps[0]!.isInit) {
    return { ok: false, error: { line: 0, message: 'First STEP must be: STEP 0 : init' } }
  }

  ctx.stepCount = ctx.steps.length

  // Filter EXPLANATION entries with out-of-range step indices.
  // Non-fatal: drop bad entries rather than failing the whole parse.
  // Explanations are decorative — a missing one is better than a failed generation.
  ctx.explanation = ctx.explanation.filter(exp => exp.stepIndex < ctx.stepCount)

  // Filter POPUP entries that reference undeclared visual IDs or out-of-range steps.
  // Non-fatal: AI hallucinating a popup target is common; drop and continue.
  // SET targets in steps remain a hard error because they are structural.
  ctx.popups = ctx.popups.filter(popup =>
    ctx.visualIds.has(popup.attachId) &&
    popup.showAt < ctx.stepCount &&
    (popup.hideAt === undefined || popup.hideAt <= ctx.stepCount)
  )

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

  const type = parseEnum(parts[0]!, VALID_VISUAL_TYPES, lineNum)
  const id = parts[1]!

  if (ctx.visualIds.has(id)) throw new Error(`Duplicate visual ID: "${id}"`)
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id)) throw new Error(`Invalid visual ID: "${id}" (must match /^[a-zA-Z][a-zA-Z0-9_-]*$/)`)

  ctx.visualIds.add(id)

  let layoutHint: string | undefined
  let slot: string | undefined

  // HINT and SLOT are decorative — silently drop unknown values rather than
  // failing the whole parse (AI hallucinating e.g. "overlay-top-left" is common).
  const hintIdx = parts.indexOf('HINT')
  if (hintIdx !== -1 && parts[hintIdx + 1]) {
    const hintVal = parts[hintIdx + 1]!
    if ((VALID_LAYOUT_HINTS as readonly string[]).includes(hintVal)) {
      layoutHint = hintVal as any
    }
  }

  const slotIdx = parts.indexOf('SLOT')
  if (slotIdx !== -1 && parts[slotIdx + 1]) {
    const slotVal = parts[slotIdx + 1]!
    if ((VALID_SLOTS as readonly string[]).includes(slotVal)) {
      slot = slotVal as any
    }
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
  if (ctx.steps.length > 0 && index !== ctx.steps[ctx.steps.length - 1]!.index + 1) {
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
  if (!VALID_CHALLENGE_TYPES.includes(type as any)) {
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

  const metaParts = meta.split(/\s+/)
  const attachId = metaParts[0]!
  const atIdx = metaParts.indexOf('AT')
  if (atIdx === -1) throw new Error(`POPUP missing AT keyword`)

  const showAtStr = metaParts[atIdx + 1]
  if (!showAtStr) throw new Error(`POPUP AT requires a number`)
  const showAt = parseInt(showAtStr)
  if (isNaN(showAt)) throw new Error(`POPUP AT requires a number`)

  let hideAt: number | undefined
  const untilIdx = metaParts.indexOf('UNTIL')
  if (untilIdx !== -1) {
    const hideAtStr = metaParts[untilIdx + 1]
    if (!hideAtStr) throw new Error(`POPUP UNTIL requires a number`)
    hideAt = parseInt(hideAtStr)
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
  if (parts.length < 3) throw new Error(`CONTROL requires controlType, id, and label`)
  
  const controlType = parseEnum(parts[0]!, ['slider', 'toggle', 'button'], lineNum)
  const id = parts[1]!
  const restOfLine = parts.slice(2).join(' ')
  
  let label = restOfLine
  let config: Record<string, unknown> = {}

  if (controlType === 'slider') {
    // Basic quoted label extraction, the rest is min/max
    const labelMatch = restOfLine.match(/"([^"]+)"/)
    if (labelMatch) {
      label = labelMatch[1]!
    }
    const minIdx = parts.indexOf('MIN')
    const maxIdx = parts.indexOf('MAX')
    const defIdx = parts.indexOf('DEFAULT')
    config = {
      min: minIdx !== -1 && parts[minIdx + 1] ? parseFloat(parts[minIdx + 1]!) : 0,
      max: maxIdx !== -1 && parts[maxIdx + 1] ? parseFloat(parts[maxIdx + 1]!) : 100,
      default: defIdx !== -1 && parts[defIdx + 1] ? parseFloat(parts[defIdx + 1]!) : 50,
    }
  } else if (controlType === 'toggle') {
    const labelMatch = restOfLine.match(/"([^"]+)"/)
    if (labelMatch) {
      label = labelMatch[1]!
    }
    config = { default: parts.includes('on') }
  } else if (controlType === 'button') {
    const labelMatch = restOfLine.match(/"([^"]+)"/)
    if (labelMatch) {
      label = labelMatch[1]!
    }
  }

  // Fallback if no quotes
  if (label.startsWith('"') && label.endsWith('"')) {
      label = parseQuotedString(label, lineNum)
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
const VALID_LAYOUT_HINTS = ['dagre-TB', 'dagre-LR', 'dagre-BT', 'tree-RT', 'linear-H', 'linear-V', 'grid-2d', 'hashmap-buckets', 'radial', 'elk-layered', 'elk-radial'] as const
const VALID_SLOTS = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right', 'left-center', 'right-center', 'overlay-top', 'overlay-bottom', 'center'] as const
const VALID_CHALLENGE_TYPES = ['predict', 'break-it', 'optimize', 'scenario'] as const

interface ParserContext extends ISCLParsed {
  inExplanation: boolean
  inChallenges: boolean
}
