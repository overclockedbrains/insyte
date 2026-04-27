// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any;
import * as fs from 'fs'
import * as path from 'path'
import process from 'process'

const SCENES_DIR = path.resolve(process.cwd(), 'src', 'content', 'scenes')

// ─── Layout hint helpers ───────────────────────────────────────────────────────

const VALID_LAYOUT_HINTS = new Set([
  'dagre-TB', 'dagre-LR', 'dagre-BT', 'tree-RT',
  'linear-H', 'linear-V', 'grid-2d', 'hashmap-buckets', 'radial',
])

const DEFAULT_LAYOUT_HINTS: Record<string, string> = {
  array: 'linear-H',
  hashmap: 'hashmap-buckets',
  stack: 'linear-V',
  queue: 'linear-H',
  'linked-list': 'linear-H',
  tree: 'dagre-TB',
  'recursion-tree': 'dagre-TB',
  graph: 'dagre-TB',
  'dp-table': 'grid-2d',
  'system-diagram': 'dagre-LR',
  grid: 'grid-2d',
}

function resolveLayoutHint(type: string, hint?: string): string {
  if (hint && VALID_LAYOUT_HINTS.has(hint)) return hint
  return DEFAULT_LAYOUT_HINTS[type] ?? 'dagre-TB'
}

// ─── Highlight remapping ───────────────────────────────────────────────────────

function remap(value: string | undefined, map: Record<string, string | null>): string | undefined {
  if (!value || value === 'default') return undefined
  const m = map[value]
  if (m === null) return undefined
  if (m === undefined) return value // unknown value – pass through
  return m
}

const ARRAY_HL: Record<string, string | null> = {
  compare: 'active', collision: 'active', miss: 'error', found: 'hit',
  delete: 'error', active: 'active', hit: 'hit', insert: 'insert', error: 'error',
}
const HASHMAP_HL: Record<string, string | null> = {
  insert: 'insert', hit: 'hit', delete: 'remove', remove: 'remove', miss: null,
}
const STACK_HL: Record<string, string | null> = {
  active: 'active', pop: 'pop', push: 'push',
}
const QUEUE_HL: Record<string, string | null> = {
  active: 'active', enqueue: 'enqueue', dequeue: 'dequeue',
}
const LL_HL: Record<string, string | null> = {
  active: 'active', insert: 'insert', delete: 'delete',
}
const TREE_HL: Record<string, string | null> = {
  active: 'active', found: 'found', visited: 'visited', miss: null,
}
const RECURSION_HL: Record<string, string | null> = {
  active: 'active', returned: 'returned',
  pending: null, computing: 'active', complete: 'returned', memoized: 'returned',
}
const GRAPH_HL: Record<string, string | null> = {
  active: 'active', visited: 'visited', found: 'found',
}
const DP_HL: Record<string, string | null> = {
  current: 'active', dependency: 'source', active: 'active', filled: 'filled', source: 'source',
}
const GRID_HL: Record<string, string | null> = {
  start: null, active: 'active', visited: 'visited', wall: 'wall', path: 'path',
}

// ─── Flat-tree → recursive conversion ─────────────────────────────────────────

function flatToTree(rootId: string, nodesMap: Map<string, AnyData>): AnyData {
  const node = nodesMap.get(rootId)
  if (!node) return null
  const result: AnyData = { id: node.id, value: node.value }
  const hl = remap(node.highlight, TREE_HL)
  if (hl) result.highlight = hl
  const children: string[] = node.children ?? []
  if (children[0]) result.left = flatToTree(children[0], nodesMap)
  if (children[1]) result.right = flatToTree(children[1], nodesMap)
  return result
}

function flatToRecursion(rootId: string, nodesMap: Map<string, AnyData>): AnyData {
  const node = nodesMap.get(rootId)
  if (!node) return null
  const result: AnyData = {
    id: node.id,
    value: node.label ?? node.value ?? '',
  }
  const rawStatus = node.status ?? node.highlight
  const hl = remap(rawStatus, RECURSION_HL)
  if (hl) result.highlight = hl
  result.children = (node.children ?? [])
    .map((cId: string) => flatToRecursion(cId, nodesMap))
    .filter(Boolean)
  return result
}

// Handle already-recursive tree (may still need highlight remapping)
function normalizeTreeNode(node: AnyData): AnyData {
  if (!node) return null
  const result: AnyData = { id: node.id, value: node.value }
  const hl = remap(node.highlight, TREE_HL)
  if (hl) result.highlight = hl
  if ('left' in node) result.left = normalizeTreeNode(node.left)
  if ('right' in node) result.right = normalizeTreeNode(node.right)
  return result
}

function normalizeRecursionNode(node: AnyData): AnyData {
  if (!node) return null
  const result: AnyData = { id: node.id, value: node.value ?? node.label ?? '' }
  const rawStatus = node.status ?? node.highlight
  const hl = remap(rawStatus, RECURSION_HL)
  if (hl) result.highlight = hl
  result.children = (node.children ?? []).map((c: AnyData) =>
    typeof c === 'string' ? null : normalizeRecursionNode(c)
  ).filter(Boolean)
  return result
}

// ─── State transformation (initialState or step params) ───────────────────────

function transformState(type: string, state: AnyData): AnyData {
  if (!state || typeof state !== 'object') return state

  switch (type) {
    case 'array': {
      const raw = state.cells ?? state.items ?? []
      return {
        items: (raw as AnyData[]).map((c: AnyData) => {
          const r: AnyData = { value: c.value }
          if (c.id) r.id = c.id
          const hl = remap(c.highlight, ARRAY_HL)
          if (hl) r.highlight = hl
          return r
        }),
      }
    }

    case 'hashmap': {
      return {
        entries: (state.entries ?? []).map((e: AnyData, i: number) => {
          // id is required — fall back to key-based or index-based id if missing
          const id = e.id ?? (e.key ? `entry-${String(e.key).toLowerCase().replace(/[^a-z0-9]/g, '-')}` : `entry-${i}`)
          const r: AnyData = { id, key: e.key, value: e.value }
          const hl = remap(e.highlight, HASHMAP_HL)
          if (hl) r.highlight = hl
          return r
        }),
      }
    }

    case 'stack': {
      return {
        items: (state.items ?? []).map((item: AnyData, i: number) => {
          if (item && typeof item === 'object' && 'id' in item) {
            const r: AnyData = { id: item.id, value: item.value }
            const hl = remap(item.highlight, STACK_HL)
            if (hl) r.highlight = hl
            return r
          }
          return { id: `item-${i}`, value: item }
        }),
      }
    }

    case 'queue': {
      return {
        items: (state.items ?? []).map((item: AnyData, i: number) => {
          if (item && typeof item === 'object' && 'id' in item) {
            const r: AnyData = { id: item.id, value: item.value }
            const hl = remap(item.highlight, QUEUE_HL)
            if (hl) r.highlight = hl
            return r
          }
          return { id: `item-${i}`, value: item }
        }),
      }
    }

    case 'linked-list': {
      return {
        nodes: (state.nodes ?? []).map((n: AnyData) => {
          const r: AnyData = { id: n.id, value: n.value }
          const hl = remap(n.highlight, LL_HL)
          if (hl) r.highlight = hl
          // Drop: next, headId
          return r
        }),
      }
    }

    case 'tree': {
      // Already recursive with left/right?
      if (state.root !== undefined) {
        return { root: normalizeTreeNode(state.root) }
      }
      if (state.rootId && Array.isArray(state.nodes)) {
        const map = new Map<string, AnyData>(state.nodes.map((n: AnyData) => [n.id as string, n]))
        return { root: flatToTree(state.rootId, map) }
      }
      return state
    }

    case 'recursion-tree': {
      if (state.root !== undefined) {
        if (state.root === null) return { root: null }
        return { root: normalizeRecursionNode(state.root) }
      }
      if (state.rootId && Array.isArray(state.nodes)) {
        const map = new Map<string, AnyData>(state.nodes.map((n: AnyData) => [n.id as string, n]))
        return { root: flatToRecursion(state.rootId, map) }
      }
      return state
    }

    case 'graph': {
      return {
        nodes: (state.nodes ?? []).map((n: AnyData) => {
          const r: AnyData = { id: n.id, label: n.label ?? '' }
          const hl = remap(n.highlight, GRAPH_HL)
          if (hl) r.highlight = hl
          // Drop: color, directed, highlighted
          return r
        }),
        edges: (state.edges ?? []).map((e: AnyData) => {
          const r: AnyData = {
            id: e.id ?? `e-${e.from}-${e.to}`,
            from: e.from,
            to: e.to,
          }
          if (e.label) r.label = e.label
          const hl = remap(e.highlight, GRAPH_HL)
          if (hl) r.highlight = hl
          // Drop: highlighted, color, directed
          return r
        }),
      }
    }

    case 'dp-table': {
      return {
        cells: (state.cells ?? []).map((row: AnyData[], ri: number) =>
          row.map((cell: AnyData, ci: number) => {
            const r: AnyData = { id: cell.id ?? `r${ri}c${ci}`, value: cell.value }
            const hl = remap(cell.highlight, DP_HL)
            if (hl) r.highlight = hl
            return r
          })
        ),
      }
    }

    case 'system-diagram': {
      return {
        components: (state.components ?? []).map((c: AnyData) => {
          const r: AnyData = { id: c.id, label: c.label, icon: c.icon, status: c.status }
          if (c.sublabel) r.sublabel = c.sublabel
          return r
        }),
        connections: (state.connections ?? []).map((conn: AnyData) => {
          const r: AnyData = { from: conn.from, to: conn.to, active: conn.active }
          if (conn.label) r.label = conn.label
          if (conn.style) r.style = conn.style
          return r
        }),
      }
    }

    case 'grid': {
      return {
        cells: (state.cells ?? []).map((row: AnyData[], ri: number) =>
          row.map((cell: AnyData, ci: number) => {
            const r: AnyData = {
              id: cell.id ?? `r${ri}c${ci}`,
              value: cell.value !== undefined ? cell.value : (cell.state ?? null),
            }
            // Old format uses 'state' for highlight, new uses 'highlight'
            const hl = remap(cell.highlight ?? cell.state, GRID_HL)
            if (hl) r.highlight = hl
            return r
          })
        ),
      }
    }

    default:
      return state
  }
}

// ─── Main migration ────────────────────────────────────────────────────────────

interface HudSource {
  id: string
  label: string
  initialValue: string | number
}

function migrateScene(raw: AnyData): AnyData {
  const visuals: AnyData[] = raw.visuals ?? []

  // Classify visuals
  const textBadges = visuals.filter((v) => v.type === 'text-badge')
  const counters = visuals.filter((v) => v.type === 'counter')
  const canvasVisuals = visuals.filter((v) => v.type !== 'text-badge' && v.type !== 'counter')

  // HUD sources: counters first, then extra text-badges; max 3
  const hudSources: HudSource[] = [
    ...counters.map((c) => ({
      id: c.id,
      label: c.label ?? c.initialState?.label ?? c.id,
      initialValue: c.initialState?.value ?? 0,
    })),
    ...textBadges.slice(1).map((tb) => ({
      id: tb.id,
      label: tb.label ?? tb.id,
      initialValue: (tb.initialState?.text as string) ?? '',
    })),
  ].slice(0, 3)

  const activeTextBadge = textBadges[0] ?? null
  const activeTextId: string | null = activeTextBadge?.id ?? null
  const hudIdSet = new Set(hudSources.map((h) => h.id))
  const canvasIdMap = new Map<string, AnyData>(canvasVisuals.map((v) => [v.id, v]))

  // Apply step 0 actions to override initialStates (for scenes where step 0 modifies state)
  const step0 = (raw.steps ?? []).find((s: AnyData) => s.index === 0)
  const step0Overrides = new Map<string, AnyData>()
  let step0ActiveText: string | undefined
  const step0HudUpdates = new Map<string, string | number>()

  if (step0?.actions?.length > 0) {
    for (const action of step0.actions) {
      const { target, params } = action
      if (!target || !params) continue
      if (target === activeTextId && params.text !== undefined) {
        step0ActiveText = params.text as string
      } else if (hudIdSet.has(target)) {
        const val = params.value !== undefined ? params.value : params.text
        if (val !== undefined) step0HudUpdates.set(target, val as string | number)
      } else if (canvasIdMap.has(target)) {
        const visual = canvasIdMap.get(target)!
        step0Overrides.set(target, transformState(visual.type, params))
      }
    }
  }

  // Build canvas[]
  const canvas = canvasVisuals.map((v) => {
    const result: AnyData = {
      id: v.id,
      type: v.type,
      layoutHint: resolveLayoutHint(v.type, v.layoutHint),
    }
    if (v.label) result.label = v.label
    const state = step0Overrides.has(v.id)
      ? step0Overrides.get(v.id)
      : transformState(v.type, v.initialState)
    result.initialState = state
    // Drop: slot, showWhen
    return result
  })

  // Build activeText
  let activeTextInitialValue =
    step0ActiveText ?? (activeTextBadge?.initialState?.text as string | undefined)
  if (activeTextInitialValue !== undefined && activeTextInitialValue.length === 0) {
    activeTextInitialValue = 'Ready'
  }
  const activeText = activeTextInitialValue !== undefined
    ? { initialValue: activeTextInitialValue }
    : undefined

  // Build hud[]
  const hud: HudSource[] | undefined = hudSources.length > 0
    ? hudSources.map((h) => ({
      ...h,
      initialValue: step0HudUpdates.has(h.id) ? step0HudUpdates.get(h.id)! : h.initialValue,
    }))
    : undefined

  // Build explanation map (root array style, e.g. HLD files)
  const explanationMap = new Map<number, AnyData>()
  if (Array.isArray(raw.explanation)) {
    for (const e of raw.explanation) {
      if (typeof e.appearsAtStep === 'number' && e.appearsAtStep >= 1) {
        const entry: AnyData = { heading: e.heading, body: e.body }
        if (e.callout) entry.callout = e.callout
        explanationMap.set(e.appearsAtStep, entry)
      }
    }
  }

  // Transform steps (drop step 0)
  const steps = (raw.steps ?? [])
    .filter((s: AnyData) => s.index !== 0)
    .map((s: AnyData) => transformStep(s, activeTextId, hudIdSet, canvasIdMap, explanationMap))

  // Transform popups
  const firstCanvasId = canvasVisuals[0]?.id ?? null
  const popups = (raw.popups ?? []).map((p: AnyData) =>
    transformPopup(p, activeTextId, hudIdSet, firstCanvasId)
  )

  // Controls: remove 'input' type
  const controls = (raw.controls ?? []).filter((c: AnyData) => c.type !== 'input')

  // Output
  const out: AnyData = {
    $schema: '/scene-schema.json',
    id: raw.id,
    title: raw.title,
    type: raw.type,
    layout: raw.layout ?? 'canvas-only',
  }

  if (raw.description) out.description = raw.description
  if (raw.category) out.category = raw.category
  if (raw.code) out.code = raw.code

  out.canvas = canvas
  if (activeText) out.activeText = activeText
  if (hud) out.hud = hud
  out.controls = controls
  out.steps = steps
  out.popups = popups

  if (raw.challenges) out.challenges = raw.challenges
  if (raw.complexity) out.complexity = raw.complexity

  return out
}

function transformStep(
  s: AnyData,
  activeTextId: string | null,
  hudIds: Set<string>,
  canvasIdMap: Map<string, AnyData>,
  explanationMap: Map<number, AnyData>
): AnyData {
  const canvasUpdates: Record<string, AnyData> = {}
  let activeTextUpdate: string | undefined
  const hudUpdates: Record<string, string | number> = {}

  for (const action of s.actions ?? []) {
    const { target, params } = action
    if (!params) continue

    if (target === activeTextId) {
      if (params.text !== undefined) activeTextUpdate = params.text as string
    } else if (hudIds.has(target)) {
      const val = params.value !== undefined ? params.value : params.text
      if (val !== undefined) hudUpdates[target] = val as string | number
    } else if (canvasIdMap.has(target)) {
      const visual = canvasIdMap.get(target)!
      canvasUpdates[target] = transformState(visual.type, params)
    }
    // Unknown targets silently dropped
  }

  const result: AnyData = { index: s.index }

  // Inline explanation (newer-style) takes precedence over root array
  const rawExplanation = s.explanation ?? explanationMap.get(s.index)
  if (rawExplanation) {
    const exp: AnyData = { heading: rawExplanation.heading, body: rawExplanation.body }
    if (rawExplanation.callout) exp.callout = rawExplanation.callout
    result.explanation = exp
  } else {
    // Fallback for steps without explanations to pass Zod schema
    result.explanation = { heading: `Step ${s.index}`, body: 'State updated.' }
  }

  if (activeTextUpdate !== undefined) result.activeText = activeTextUpdate
  if (Object.keys(hudUpdates).length > 0) result.hud = hudUpdates
  if (Object.keys(canvasUpdates).length > 0) result.canvas = canvasUpdates

  return result
}

function transformPopup(
  p: AnyData,
  activeTextId: string | null,
  hudIds: Set<string>,
  firstCanvasId: string | null
): AnyData {
  // showAtStep must be >= 1
  const showAtStep = typeof p.showAtStep === 'number' && p.showAtStep >= 1 ? p.showAtStep : 1

  // hideAtStep must be >= 1
  let hideAtStep: number = typeof p.hideAtStep === 'number' ? p.hideAtStep : 0
  if (hideAtStep < 1) hideAtStep = showAtStep + 1

  // Redirect attachTo pointing to text-badge or hud id → first canvas visual
  let attachTo = p.attachTo as string
  if (
    (activeTextId && attachTo === activeTextId) ||
    hudIds.has(attachTo)
  ) {
    attachTo = firstCanvasId ?? attachTo
  }

  const result: AnyData = { id: p.id, attachTo, text: p.text, showAtStep, hideAtStep }
  if (p.style) result.style = p.style
  // Drop: anchor, targetPoint

  return result
}

// ─── File scanner ──────────────────────────────────────────────────────────────

function collectFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'test') files.push(...collectFiles(full))
    } else if (entry.name.endsWith('.json')) {
      files.push(full)
    }
  }
  return files
}

// ─── Entry point ───────────────────────────────────────────────────────────────

const files = collectFiles(SCENES_DIR)
console.log(`Found ${files.length} scene files to migrate\n`)

let ok = 0
let fail = 0

for (const file of files) {
  const rel = path.relative(SCENES_DIR, file).replace(/\\/g, '/')
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as unknown
    const migrated = migrateScene(raw)
    fs.writeFileSync(file, JSON.stringify(migrated, null, 2) + '\n')
    console.log(`✓ ${rel}`)
    ok++
  } catch (e: AnyData) {
    console.error(`✗ ${rel}: ${e.message}`)
    fail++
  }
}

console.log(`\n${ok} migrated, ${fail} failed.`)
if (fail > 0) process.exit(1)
