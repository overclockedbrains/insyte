import { describe, it, expect } from 'vitest'
import { buildRegistry, applyStructural, resolveState } from './merge'
import { applyStepActionsUpTo } from './apply'
import type { CanvasVisual, Step } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGraphVisual(nodes: object[], edges: object[]): CanvasVisual {
  return {
    id: 'g',
    type: 'graph',
    layoutHint: 'dagre-LR',
    initialState: { nodes, edges },
  } as CanvasVisual
}

function makeTreeVisual(nodes: object[], rootId: string): CanvasVisual {
  return {
    id: 't',
    type: 'tree',
    layoutHint: 'dagre-TB',
    initialState: { nodes, rootId },
  } as CanvasVisual
}

function makeSysVisual(components: object[], connections: object[]): CanvasVisual {
  return {
    id: 's',
    type: 'system-diagram',
    layoutHint: 'dagre-LR',
    initialState: { components, connections },
  } as CanvasVisual
}

function resolve(visual: CanvasVisual, steps: Array<{ index: number; canvas?: unknown }>, stepIndex: number) {
  const typedSteps = steps as Array<Step & { canvas?: Record<string, unknown> }>
  const registry = buildRegistry(visual)
  for (const step of typedSteps) {
    if (step.index > stepIndex) break
    const stepData = step.canvas?.[visual.id]
    if (stepData) applyStructural(registry, stepData, visual.type)
  }
  const targetData = typedSteps.find(s => s.index === stepIndex)?.canvas?.[visual.id]
  return resolveState(registry, targetData, visual.type)
}

// ─── graph ────────────────────────────────────────────────────────────────────

describe('graph — highlight reset', () => {
  const visual = makeGraphVisual(
    [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    [],
  )
  const steps = [
    { index: 1, canvas: { g: { nodeStates: { a: { highlight: 'active' }, b: { highlight: 'queued' } } } } },
    { index: 2, canvas: { g: { nodeStates: { b: { highlight: 'active' } } } } },
  ]

  it('step 1: a=active, b=queued', () => {
    const state = resolve(visual, steps, 1) as { nodes: Array<{ id: string; highlight: string }> }
    expect(state.nodes.find(n => n.id === 'a')?.highlight).toBe('active')
    expect(state.nodes.find(n => n.id === 'b')?.highlight).toBe('queued')
  })

  it('step 2: a resets to default, b=active', () => {
    const state = resolve(visual, steps, 2) as { nodes: Array<{ id: string; highlight: string }> }
    expect(state.nodes.find(n => n.id === 'a')?.highlight).toBe('default')
    expect(state.nodes.find(n => n.id === 'b')?.highlight).toBe('active')
  })
})

describe('graph — distance persists', () => {
  const visual = makeGraphVisual(
    [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    [],
  )
  const steps = [
    { index: 1, canvas: { g: { nodeStates: { a: { highlight: 'active', distance: '0' } } } } },
    { index: 2, canvas: { g: { nodeStates: { b: { highlight: 'active', distance: '5' } } } } },
  ]

  it('step 2: a.distance persists from step 1, b.distance=5', () => {
    const state = resolve(visual, steps, 2) as { nodes: Array<{ id: string; distance: string }> }
    expect(state.nodes.find(n => n.id === 'a')?.distance).toBe('0')
    expect(state.nodes.find(n => n.id === 'b')?.distance).toBe('5')
  })
})

describe('graph — distance not overwritten when absent', () => {
  const visual = makeGraphVisual(
    [{ id: 'a', label: 'A' }],
    [],
  )
  const steps = [
    { index: 1, canvas: { g: { nodeStates: { a: { distance: '0' } } } } },
    { index: 2, canvas: { g: { nodeStates: {} } } },
    { index: 3, canvas: { g: { nodeStates: { a: { highlight: 'active' } } } } },
  ]

  it('step 3: a.distance still "0" from step 1', () => {
    const state = resolve(visual, steps, 3) as { nodes: Array<{ id: string; distance: string; highlight: string }> }
    const node = state.nodes.find(n => n.id === 'a')!
    expect(node.distance).toBe('0')
    expect(node.highlight).toBe('active')
  })
})

describe('graph — structural addition', () => {
  const visual = makeGraphVisual(
    [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    [{ id: 'e0', from: 'a', to: 'b', directed: true }],
  )
  const steps = [
    { index: 1, canvas: { g: { nodeStates: { a: { highlight: 'active' } } } } },
    { index: 2, canvas: { g: { nodeStates: { b: { highlight: 'active' } } } } },
    {
      index: 3,
      canvas: {
        g: {
          newNodes: [{ id: 'c', label: 'C' }],
          newEdges: [{ id: 'e1', from: 'b', to: 'c', directed: true }],
          nodeStates: { c: { highlight: 'active' } },
        },
      },
    },
  ]

  it('step 2: c and e1 not present', () => {
    const state = resolve(visual, steps, 2) as { nodes: Array<{ id: string }>; edges: Array<{ id: string }> }
    expect(state.nodes.map(n => n.id)).not.toContain('c')
    expect(state.edges.map(e => e.id)).not.toContain('e1')
  })

  it('step 3: c and e1 present', () => {
    const state = resolve(visual, steps, 3) as { nodes: Array<{ id: string; highlight: string }>; edges: Array<{ id: string }> }
    expect(state.nodes.map(n => n.id)).toContain('c')
    expect(state.edges.map(e => e.id)).toContain('e1')
    expect(state.nodes.find(n => n.id === 'c')?.highlight).toBe('active')
  })
})

describe('graph — structural update', () => {
  const visual = makeGraphVisual(
    [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    [{ id: 'e0', from: 'a', to: 'b', weight: 4 }],
  )
  const steps = [
    { index: 1, canvas: { g: { nodeStates: { a: { highlight: 'active' } } } } },
    { index: 2, canvas: { g: { updateEdges: [{ id: 'e0', weight: 9 }] } } },
  ]

  it('step 1: e0.weight=4', () => {
    const state = resolve(visual, steps, 1) as { edges: Array<{ id: string; weight: number }> }
    expect(state.edges.find(e => e.id === 'e0')?.weight).toBe(4)
  })

  it('step 2: e0.weight=9', () => {
    const state = resolve(visual, steps, 2) as { edges: Array<{ id: string; weight: number }> }
    expect(state.edges.find(e => e.id === 'e0')?.weight).toBe(9)
  })
})

// ─── tree ────────────────────────────────────────────────────────────────────

describe('tree — children rewire', () => {
  const visual = makeTreeVisual(
    [{ id: 'n1', value: '5', children: [] }],
    'n1',
  )
  const steps = [
    { index: 1, canvas: { t: { nodeStates: { n1: { highlight: 'active' } } } } },
    {
      index: 2,
      canvas: {
        t: {
          newNodes: [
            { id: 'n2', value: '3', children: [] },
            { id: 'n3', value: '8', children: [] },
          ],
          updateNodes: [{ id: 'n1', children: ['n2', 'n3'] }],
        },
      },
    },
  ]

  it('step 1: n1.children=[]', () => {
    const state = resolve(visual, steps, 1) as { nodes: Array<{ id: string; children: string[] }> }
    expect(state.nodes.find(n => n.id === 'n1')?.children).toEqual([])
  })

  it('step 2: n1.children=[n2,n3]', () => {
    const state = resolve(visual, steps, 2) as { nodes: Array<{ id: string; children: string[] }> }
    expect(state.nodes.find(n => n.id === 'n1')?.children).toEqual(['n2', 'n3'])
    expect(state.nodes.map(n => n.id)).toContain('n2')
    expect(state.nodes.map(n => n.id)).toContain('n3')
  })
})

describe('tree — result persists', () => {
  const visual = makeTreeVisual(
    [
      { id: 'f2', value: 'fib(2)', children: [] },
      { id: 'f3', value: 'fib(3)', children: [] },
    ],
    'f3',
  )
  const steps = [
    { index: 1, canvas: { t: { nodeStates: { f2: { highlight: 'active' } } } } },
    { index: 2, canvas: { t: { nodeStates: { f3: { highlight: 'active' } } } } },
    { index: 3, canvas: { t: { nodeStates: { f2: { highlight: 'active' } } } } },
    { index: 4, canvas: { t: { nodeStates: { f2: { highlight: 'returned', result: '= 1' } } } } },
    { index: 5, canvas: { t: { nodeStates: { f3: { highlight: 'active' } } } } },
  ]

  it('step 5: f2.result persists, f2.highlight resets', () => {
    const state = resolve(visual, steps, 5) as { nodes: Array<{ id: string; highlight: string; result: string | null }> }
    const f2 = state.nodes.find(n => n.id === 'f2')!
    expect(f2.result).toBe('= 1')
    expect(f2.highlight).toBe('default')
  })
})

describe('tree — updateRoot', () => {
  const visual = makeTreeVisual(
    [{ id: 'n1', value: '5', children: ['n2'] }, { id: 'n2', value: '8', children: [] }],
    'n1',
  )
  const steps = [
    { index: 1, canvas: { t: { nodeStates: { n1: { highlight: 'active' } } } } },
    { index: 2, canvas: { t: { nodeStates: { n2: { highlight: 'active' } } } } },
    { index: 3, canvas: { t: { updateRoot: 'n2' } } },
  ]

  it('step 2: rootId=n1', () => {
    const state = resolve(visual, steps, 2) as { rootId: string }
    expect(state.rootId).toBe('n1')
  })

  it('step 3: rootId=n2', () => {
    const state = resolve(visual, steps, 3) as { rootId: string }
    expect(state.rootId).toBe('n2')
  })
})

// ─── system-diagram ───────────────────────────────────────────────────────────

describe('system-diagram — ephemeral reset', () => {
  const visual = makeSysVisual(
    [
      { id: 'c1', label: 'A', icon: 'server' },
      { id: 'c2', label: 'B', icon: 'server' },
      { id: 'c3', label: 'C', icon: 'server' },
    ],
    [
      { id: 'cn0', from: 'c1', to: 'c2' },
      { id: 'cn1', from: 'c2', to: 'c3' },
      { id: 'cn2', from: 'c1', to: 'c3' },
    ],
  )
  const steps = [
    {
      index: 1,
      canvas: {
        s: {
          componentStates:  { c1: { status: 'active' } },
          connectionStates: { cn0: { active: true } },
        },
      },
    },
    {
      index: 2,
      canvas: {
        s: {
          componentStates:  { c3: { status: 'active' } },
          connectionStates: { cn2: { active: true } },
        },
      },
    },
  ]

  it('step 1: cn0 active, cn1+cn2 inactive', () => {
    const state = resolve(visual, steps, 1) as { connections: Array<{ id: string; active: boolean }> }
    expect(state.connections.find(c => c.id === 'cn0')?.active).toBe(true)
    expect(state.connections.find(c => c.id === 'cn1')?.active).toBe(false)
    expect(state.connections.find(c => c.id === 'cn2')?.active).toBe(false)
  })

  it('step 2: cn2 active, cn0+cn1 reset to inactive', () => {
    const state = resolve(visual, steps, 2) as { connections: Array<{ id: string; active: boolean }> }
    expect(state.connections.find(c => c.id === 'cn0')?.active).toBe(false)
    expect(state.connections.find(c => c.id === 'cn1')?.active).toBe(false)
    expect(state.connections.find(c => c.id === 'cn2')?.active).toBe(true)
  })

  it('step 2: c3 active, c1+c2 reset to normal', () => {
    const state = resolve(visual, steps, 2) as { components: Array<{ id: string; status: string }> }
    expect(state.components.find(c => c.id === 'c1')?.status).toBe('normal')
    expect(state.components.find(c => c.id === 'c2')?.status).toBe('normal')
    expect(state.components.find(c => c.id === 'c3')?.status).toBe('active')
  })
})

// ─── mixed scene — linear + graph ────────────────────────────────────────────

describe('mixed scene — linear + graph together', () => {
  const linearVisual: CanvasVisual = {
    id: 'arr',
    type: 'linear',
    variant: 'array',
    layoutHint: 'linear-H',
    initialState: { items: [] },
  }
  const graphVisual = makeGraphVisual(
    [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    [{ id: 'e0', from: 'a', to: 'b' }],
  )

  const canvas = [linearVisual, graphVisual]
  // Cast steps to Step[] — the graph canvas entries use the new sparse overlay format
  // which TypeScript cannot verify against the union type without running the scene.
  const steps = [
    {
      index: 1,
      explanation: { heading: 'Step 1', body: 'First' },
      canvas: {
        arr: { items: [{ id: 'i0', value: 2, highlight: 'active' }] },
        g:   { nodeStates: { a: { highlight: 'active' } } },
      },
    },
    {
      index: 2,
      explanation: { heading: 'Step 2', body: 'Second' },
      canvas: {
        arr: { items: [{ id: 'i0', value: 2 }, { id: 'i1', value: 7 }] },
        g:   { nodeStates: { b: { highlight: 'visited' } } },
      },
    },
  ] as unknown as Step[]

  it('linear visual returns correct snapshot at step 2', () => {
    const state = applyStepActionsUpTo(canvas, steps, 2)
    const arrState = state.get('arr') as { items: Array<{ id: string }> }
    expect(arrState.items).toHaveLength(2)
  })

  it('graph visual returns entity-registry state at step 2', () => {
    const state = applyStepActionsUpTo(canvas, steps, 2)
    const graphState = state.get('g') as { nodes: Array<{ id: string; highlight: string }> }
    expect(graphState.nodes.find(n => n.id === 'a')?.highlight).toBe('default')
    expect(graphState.nodes.find(n => n.id === 'b')?.highlight).toBe('visited')
  })

  it('step 0: graph returns initial topology, linear returns []', () => {
    const state = applyStepActionsUpTo(canvas, steps, 0)
    const arrState = state.get('arr') as { items: unknown[] }
    expect(arrState.items).toHaveLength(0)
    const graphState = state.get('g') as { nodes: Array<{ id: string; highlight: string }> }
    expect(graphState.nodes).toHaveLength(2)
    expect(graphState.nodes.every(n => n.highlight === 'default')).toBe(true)
  })
})
