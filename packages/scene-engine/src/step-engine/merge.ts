import type { CanvasVisual } from '../types'

// ─── Registry ────────────────────────────────────────────────────────────────
// Entity maps for identity-based primitives. Each map entry stores topology
// plus current accumulated state. Ephemeral fields are stored at default until
// resolveState applies a step overlay.

export interface Registry {
  type: string
  nodes:       Map<string, Record<string, unknown>>
  edges:       Map<string, Record<string, unknown>>
  components:  Map<string, Record<string, unknown>>
  connections: Map<string, Record<string, unknown>>
  rootId:      string | undefined
}

// ─── buildRegistry ────────────────────────────────────────────────────────────
// Seeds the entity registry from visual.initialState. Sets accumulated fields
// to their initial defaults (distance: "∞", result: null).

export function buildRegistry(visual: CanvasVisual): Registry {
  const registry: Registry = {
    type: visual.type,
    nodes:       new Map(),
    edges:       new Map(),
    components:  new Map(),
    connections: new Map(),
    rootId:      undefined,
  }

  const init = visual.initialState as Record<string, unknown>

  if (visual.type === 'graph') {
    for (const node of (init.nodes as Array<Record<string, unknown>> | undefined) ?? []) {
      registry.nodes.set(node.id as string, {
        ...node,
        highlight: 'default',
        distance:  (node.distance as string | undefined) ?? '∞',
      })
    }
    for (const edge of (init.edges as Array<Record<string, unknown>> | undefined) ?? []) {
      registry.edges.set(edge.id as string, {
        ...edge,
        highlight: 'default',
      })
    }
  } else if (visual.type === 'tree') {
    for (const node of (init.nodes as Array<Record<string, unknown>> | undefined) ?? []) {
      registry.nodes.set(node.id as string, {
        ...node,
        highlight: 'default',
        result:    (node.result as string | undefined) ?? null,
      })
    }
    registry.rootId = init.rootId as string | undefined
  } else if (visual.type === 'system-diagram') {
    for (const comp of (init.components as Array<Record<string, unknown>> | undefined) ?? []) {
      if (!comp.id) continue
      registry.components.set(comp.id as string, { ...comp, status: 'normal' })
    }
    for (const conn of (init.connections as Array<Record<string, unknown>> | undefined) ?? []) {
      if (!conn.id) continue
      registry.connections.set(conn.id as string, { ...conn, active: false })
    }
  }

  return registry
}

// ─── applyStructural ─────────────────────────────────────────────────────────
// Mutates the registry by applying all structural changes and accumulated-field
// updates from a single step's canvas data. Call for each step from 1 to
// stepIndex (inclusive) before calling resolveState.

export function applyStructural(registry: Registry, stepData: unknown, type: string): void {
  const data = stepData as Record<string, unknown>

  if (type === 'graph') {
    for (const node of (data.newNodes as Array<Record<string, unknown>> | undefined) ?? []) {
      registry.nodes.set(node.id as string, {
        ...node,
        highlight: 'default',
        distance:  (node.distance as string | undefined) ?? '∞',
      })
    }
    for (const update of (data.updateNodes as Array<Record<string, unknown>> | undefined) ?? []) {
      const existing = registry.nodes.get(update.id as string)
      if (existing) Object.assign(existing, update)
    }
    for (const edge of (data.newEdges as Array<Record<string, unknown>> | undefined) ?? []) {
      registry.edges.set(edge.id as string, { ...edge, highlight: 'default' })
    }
    for (const update of (data.updateEdges as Array<Record<string, unknown>> | undefined) ?? []) {
      const existing = registry.edges.get(update.id as string)
      if (existing) Object.assign(existing, update)
    }
    // Extract accumulated fields from nodeStates
    for (const [id, state] of Object.entries((data.nodeStates as Record<string, Record<string, unknown>> | undefined) ?? {})) {
      const existing = registry.nodes.get(id)
      if (existing && state.distance !== undefined) existing.distance = state.distance
    }
  } else if (type === 'tree') {
    for (const node of (data.newNodes as Array<Record<string, unknown>> | undefined) ?? []) {
      registry.nodes.set(node.id as string, {
        ...node,
        highlight: 'default',
        result:    (node.result as string | undefined) ?? null,
      })
    }
    for (const update of (data.updateNodes as Array<Record<string, unknown>> | undefined) ?? []) {
      const existing = registry.nodes.get(update.id as string)
      if (existing) Object.assign(existing, update)
    }
    if (typeof data.updateRoot === 'string') registry.rootId = data.updateRoot
    // Extract accumulated fields from nodeStates
    for (const [id, state] of Object.entries((data.nodeStates as Record<string, Record<string, unknown>> | undefined) ?? {})) {
      const existing = registry.nodes.get(id)
      if (existing && state.result !== undefined) existing.result = state.result
    }
  } else if (type === 'system-diagram') {
    for (const comp of (data.newComponents as Array<Record<string, unknown>> | undefined) ?? []) {
      registry.components.set(comp.id as string, { ...comp, status: 'normal' })
    }
    for (const update of (data.updateComponents as Array<Record<string, unknown>> | undefined) ?? []) {
      const existing = registry.components.get(update.id as string)
      if (existing) Object.assign(existing, update)
    }
    for (const conn of (data.newConnections as Array<Record<string, unknown>> | undefined) ?? []) {
      registry.connections.set(conn.id as string, { ...conn, active: false })
    }
    for (const update of (data.updateConnections as Array<Record<string, unknown>> | undefined) ?? []) {
      const existing = registry.connections.get(update.id as string)
      if (existing) Object.assign(existing, update)
    }
  }
}

// ─── resolveState ─────────────────────────────────────────────────────────────
// Produces the fully-resolved, renderer-ready state from the registry plus the
// target step's state overlay. Ephemerals are reset to default then overlaid.
// stepData may be undefined if the target step has no canvas entry for this visual.

export function resolveState(
  registry: Registry,
  stepData: unknown,
  type: string,
): Record<string, unknown> {
  const data = stepData as Record<string, unknown> | undefined

  if (type === 'graph') {
    const nodes = [...registry.nodes.values()].map(n => Object.assign({}, n, { highlight: 'default' }) as Record<string, unknown>)
    const edges = [...registry.edges.values()].map(e => Object.assign({}, e, { highlight: 'default' }) as Record<string, unknown>)

    const nodeStates = (data?.nodeStates as Record<string, Record<string, unknown>> | undefined) ?? {}
    for (const node of nodes) {
      const overlay = nodeStates[node['id'] as string]
      if (overlay?.highlight !== undefined) node['highlight'] = overlay.highlight
    }

    const edgeStates = (data?.edgeStates as Record<string, Record<string, unknown>> | undefined) ?? {}
    for (const edge of edges) {
      const overlay = edgeStates[edge['id'] as string]
      if (overlay?.highlight !== undefined) edge['highlight'] = overlay.highlight
    }

    return { nodes, edges }
  }

  if (type === 'tree') {
    const nodes = [...registry.nodes.values()].map(n => Object.assign({}, n, { highlight: 'default' }) as Record<string, unknown>)

    const nodeStates = (data?.nodeStates as Record<string, Record<string, unknown>> | undefined) ?? {}
    for (const node of nodes) {
      const overlay = nodeStates[node['id'] as string]
      if (overlay?.highlight !== undefined) node['highlight'] = overlay.highlight
    }

    return { nodes, rootId: registry.rootId }
  }

  if (type === 'system-diagram') {
    const components  = [...registry.components.values()].map(c => Object.assign({}, c, { status: 'normal' }) as Record<string, unknown>)
    const connections = [...registry.connections.values()].map(c => Object.assign({}, c, { active: false }) as Record<string, unknown>)

    const componentStates = (data?.componentStates as Record<string, Record<string, unknown>> | undefined) ?? {}
    for (const comp of components) {
      const overlay = componentStates[comp['id'] as string]
      if (overlay?.status !== undefined) comp['status'] = overlay.status
    }

    const connectionStates = (data?.connectionStates as Record<string, Record<string, unknown>> | undefined) ?? {}
    for (const conn of connections) {
      const overlay = connectionStates[conn['id'] as string]
      if (overlay?.active !== undefined) conn['active'] = overlay.active
    }

    return { components, connections }
  }

  return {}
}
