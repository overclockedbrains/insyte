import { applyDagreLayout } from './algorithms/dagre'
import { applyD3HierarchyLayout } from './algorithms/d3-hierarchy'
import {
  applyLinearLayout, applyStackLayout, applyGridLayout,
  applyHashmapLayout, applySlotLayout, applyRadialLayout,
} from './algorithms/arithmetic'
import { applyELKLayout } from './algorithms/elk'
import { emptyLayoutResult, computeViewBox } from './utils'
import type { LayoutResult, LayoutInput } from './types'
import type { Visual } from '../types'   // direct internal import — NOT '@insyte/scene-engine' (self-reference)

// ─── Synchronous layout cache (dagre / arithmetic / d3-hierarchy) ─────────────
const layoutCache = new Map<string, LayoutResult>()

// ─── ELK layout cache ────────────���──────────────────────��─────────────────────
// Separate from layoutCache — ELK results are expensive to compute and are
// never evicted on topology changes.  Once computed, the ELK result wins over
// the dagre placeholder that was returned on the first synchronous call.
const elkLayoutCache = new Map<string, LayoutResult>()

// ─── ELK runner injection ─────────────────────────────────────────────────────
// The runner is injected by apps/web at startup (setELKRunner) so this
// package stays free of browser APIs (Worker, import.meta.url, etc.).
let elkRunner: ((graph: object) => Promise<object>) | null = null

export function setELKRunner(runner: (graph: object) => Promise<object>): void {
  elkRunner = runner
}

// ─── ELK ready pub/sub ───────────────────────────────���────────────────────────
// Subscribers are notified when an ELK layout finishes, so React can
// clear its step-graph cache and re-render with the upgraded layout.

type ELKReadyCallback = () => void
const elkReadyListeners = new Set<ELKReadyCallback>()

export function subscribeELKReady(cb: ELKReadyCallback): () => void {
  elkReadyListeners.add(cb)
  return () => { elkReadyListeners.delete(cb) }
}

function notifyELKReady(): void {
  for (const cb of elkReadyListeners) cb()
}

// ─── Topology hashing ──────────────────���──────────────────────���───────────────

/**
 * Hash only topology (node IDs + edges), not visual state (colors, highlights).
 * Same topology hash → same computed positions → cache hit.
 */
function hashTopology(visual: Visual, state: Record<string, unknown>): string {
  const type = visual.type

  if (type === 'tree' || type === 'recursion-tree') {
    const s = state as any
    if (s.root) {
      const rootHash = hashTreeNode(s.root)
      return `${visual.id}|${type}|${rootHash}`
    }
    const nodes: any[] = s.nodes ?? []
    return `${visual.id}|${type}|${nodes.map((n: any) => n.id).join(',')}`
  }

  if (type === 'array' || type === 'queue' || type === 'linked-list') {
    const s = state as any
    const items = s.cells ?? s.items ?? s.nodes ?? []
    return `${visual.id}|${type}|${JSON.stringify(items.map((n: any) => n.id ?? n.value))}`
  }

  if (type === 'dp-table' || type === 'grid') {
    const s = state as any
    const rows = s.cells ?? s.rows ?? []
    return `${visual.id}|${type}|${rows.length}x${((rows as any[])[0] ?? []).length}`
  }

  if (type === 'hashmap') {
    const s = state as any
    const buckets: any[][] = s.buckets ?? [s.entries ?? []]
    return `${visual.id}|${type}|${JSON.stringify(buckets.map((b: any[]) => b.length))}`
  }

  // graph, system-diagram, radial — topology = node IDs + edge pairs
  const s = state as any
  const nodes: any[] = s.nodes ?? s.components ?? []
  const edges: any[] = s.edges ?? s.connections ?? []
  return `${visual.id}|${type}|${JSON.stringify(nodes.map((n: any) => n.id))}|${JSON.stringify(edges.map((e: any) => `${e.from}→${e.to}`))}`
}

/** Recursively hash tree structure by identity (id or value), ignoring highlights/state. */
function hashTreeNode(node: any): string {
  if (!node) return 'null'
  const id = String(node.id ?? node.value ?? '?')
  const children = node.children
    ? node.children.map(hashTreeNode).join(',')
    : `${hashTreeNode(node.left ?? null)},${hashTreeNode(node.right ?? null)}`
  return `${id}(${children})`
}

// ─── ELK background upgrade ───────────────────────────────────────────────────

function scheduleELKUpgrade(input: LayoutInput, topoHash: string): void {
  if (!elkRunner) return

  applyELKLayout(input, elkRunner).then(elkResult => {
    elkLayoutCache.set(topoHash, elkResult)
    // Promote to main cache so the next call (without ELK-specific check) also wins
    layoutCache.set(topoHash, elkResult)
    notifyELKReady()
  }).catch(() => {
    // ELK failed — dagre placeholder stays in cache; no user-visible error
  })
}

// ─── Main entry point ───────────────────────────────────────────────���─────────

export function computeLayout(
  visual: Visual,
  state: Record<string, unknown>,
  containerWidth = 800,
  containerHeight = 600
): LayoutResult {
  const topoHash = hashTopology(visual, state)
  const hint = visual.layoutHint

  // ── ELK fast-path ────────────────────────────────────────────���─────────────
  // For ELK-eligible types, check the ELK cache BEFORE the general layout
  // cache.  Once ELK has resolved, both caches are updated, so this check
  // will only fire on the very first re-render after the async upgrade.
  const isELKCandidate =
    visual.type === 'system-diagram' ||
    (visual.type === 'graph' && (hint === 'elk-layered' || hint === 'elk-radial'))

  if (isELKCandidate && elkLayoutCache.has(topoHash)) {
    return elkLayoutCache.get(topoHash)!
  }

  // ── General synchronous cache ─────────────────────���────────────────────────
  if (layoutCache.has(topoHash)) return layoutCache.get(topoHash)!

  const input: LayoutInput = { visual, state }
  let result: LayoutResult

  switch (visual.type) {
    case 'tree':
    case 'recursion-tree':
      result = applyD3HierarchyLayout(input)
      break

    case 'graph':
      if (hint === 'elk-layered' || hint === 'elk-radial') {
        // ELK requested — return dagre sync, upgrade async
        result = applyDagreLayout(input, hint === 'elk-layered' ? 'LR' : 'TB')
        scheduleELKUpgrade(input, topoHash)
      } else if (hint === 'radial') {
        result = applyRadialLayout(input)
      } else {
        result = applyDagreLayout(input,
          hint === 'dagre-LR' ? 'LR' :
          hint === 'dagre-BT' ? 'BT' : 'TB'
        )
      }
      break

    case 'system-diagram':
      // Always use ELK for system-diagram: return dagre sync, upgrade async
      result = applyDagreLayout(input, 'LR')
      scheduleELKUpgrade(input, topoHash)
      break

    case 'array':
    case 'linked-list':
    case 'queue':
      result = applyLinearLayout(input)
      break

    case 'stack':
      result = applyStackLayout(input)
      break

    case 'dp-table':
    case 'grid':
      result = applyGridLayout(input)
      break

    case 'hashmap':
      result = applyHashmapLayout(input)
      break

    case 'text-badge':
    case 'counter':
      result = applySlotLayout(input, containerWidth, containerHeight)
      break

    default:
      result = emptyLayoutResult()
  }

  layoutCache.set(topoHash, result)
  return result
}

// computeViewBox re-exported for callers that need to convert a boundingBox to SVG viewBox string
export { computeViewBox }
