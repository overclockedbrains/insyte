import { describe, it, expect, vi } from 'vitest'
import { applyELKLayout } from './elk'
import type { LayoutInput } from '../types'
import { PRIMITIVE_SIZING } from '../spacing'

// ─── Deterministic mock ELK runner ───────────────────────────────────────────
// Stubs the actual worker call so tests run synchronously without WASM.

function makeDeterministicRunner() {
  return vi.fn(async (graph: any) => {
    const sz = PRIMITIVE_SIZING.systemDiagram
    const children = (graph.children ?? []).map((n: any, idx: number) => ({
      ...n,
      x: idx * (sz.nodeWidth + 80),
      y: 0,
    }))
    const edges = (graph.edges ?? []).map((e: any, idx: number) => {
      const srcIdx = children.findIndex((c: any) => e.sources[0]?.startsWith(c.id))
      const dstIdx = children.findIndex((c: any) => e.targets[0]?.startsWith(c.id))
      const srcNode = children[srcIdx]
      const dstNode = children[dstIdx]
      return {
        ...e,
        sections: [{
          startPoint: { x: (srcNode?.x ?? 0) + sz.nodeWidth, y: (srcNode?.y ?? 0) + sz.nodeHeight / 2 },
          endPoint:   { x: dstNode?.x ?? 0,                  y: (dstNode?.y ?? 0) + sz.nodeHeight / 2 },
          bendPoints: [],
        }],
      }
    })
    return { id: 'root', children, edges }
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('applyELKLayout', () => {
  const sz = PRIMITIVE_SIZING.systemDiagram

  const makeInput = (components: any[], connections: any[]): LayoutInput => ({
    visual: { id: 'sd-1', type: 'system-diagram', initialState: {} },
    state:  { components, connections },
  })

  it('returns empty layout result when there are no nodes', async () => {
    const runner = vi.fn()
    const result = await applyELKLayout(makeInput([], []), runner)

    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
    expect(runner).not.toHaveBeenCalled()
  })

  it('converts ELK top-left positions to centred coordinates', async () => {
    const runner = makeDeterministicRunner()
    const result = await applyELKLayout(
      makeInput(
        [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
        [],
      ),
      runner,
    )

    expect(runner).toHaveBeenCalledOnce()
    expect(result.nodes).toHaveLength(2)

    const nodeA = result.nodes.find(n => n.id === 'a')!
    const nodeB = result.nodes.find(n => n.id === 'b')!

    // ELK returned x=0 for A → centre x = 0 + nodeWidth/2
    expect(nodeA.x).toBe(0 + sz.nodeWidth / 2)
    expect(nodeA.y).toBe(0 + sz.nodeHeight / 2)

    // B is placed one step to the right
    expect(nodeB.x).toBeGreaterThan(nodeA.x)
  })

  it('extracts waypoints from ELK edge sections', async () => {
    const runner = makeDeterministicRunner()
    const result = await applyELKLayout(
      makeInput(
        [{ id: 'client', label: 'Client' }, { id: 'server', label: 'Server' }],
        [{ from: 'client', to: 'server', label: 'HTTP' }],
      ),
      runner,
    )

    expect(result.edges).toHaveLength(1)
    const edge = result.edges[0]!
    expect(edge.from).toBe('client')
    expect(edge.to).toBe('server')
    // start + end = at least 2 waypoints
    expect(edge.waypoints.length).toBeGreaterThanOrEqual(2)
  })

  it('strips port suffix from source/target IDs', async () => {
    const runner = makeDeterministicRunner()
    const result = await applyELKLayout(
      makeInput(
        [{ id: 'lb', label: 'LB' }, { id: 'db', label: 'DB' }],
        [{ id: 'e1', from: 'lb', to: 'db' }],
      ),
      runner,
    )

    const edge = result.edges[0]!
    // ELK sources/targets are port IDs like "lb-right" — stripped back to node IDs
    expect(edge.from).toBe('lb')
    expect(edge.to).toBe('db')
  })

  it('skips edges whose source/target node is not registered', async () => {
    const runner = makeDeterministicRunner()
    const result = await applyELKLayout(
      makeInput(
        [{ id: 'a', label: 'A' }],
        [
          { from: 'a',       to: 'missing', label: 'bad' },
          { from: 'missing', to: 'a',       label: 'also-bad' },
        ],
      ),
      runner,
    )

    // Both edges reference a non-existent node — ELK should receive 0 edges
    const callArg = runner.mock.calls[0]![0] as any
    expect(callArg.edges).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
  })

  it('supports nodes/edges keys (graph type aliases)', async () => {
    const runner = makeDeterministicRunner()
    const input: LayoutInput = {
      visual: { id: 'g-1', type: 'graph', layoutHint: 'elk-layered', initialState: {} },
      state:  {
        nodes: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }],
        edges: [{ from: 'x', to: 'y' }],
      },
    }
    const result = await applyELKLayout(input, runner)

    expect(result.nodes).toHaveLength(2)
    expect(result.edges).toHaveLength(1)
  })

  it('produces a valid viewBox string', async () => {
    const runner = makeDeterministicRunner()
    const result = await applyELKLayout(
      makeInput(
        [{ id: 'p', label: 'P' }, { id: 'q', label: 'Q' }],
        [],
      ),
      runner,
    )

    // viewBox format: "minX minY width height"
    const parts = result.viewBox.split(' ').map(Number)
    expect(parts).toHaveLength(4)
    expect(parts[2]).toBeGreaterThan(0)  // width > 0
    expect(parts[3]).toBeGreaterThan(0)  // height > 0
  })

  it('propagates ELK runner errors by rejecting the promise', async () => {
    const runner = vi.fn().mockRejectedValue(new Error('ELK layout failed'))
    await expect(
      applyELKLayout(makeInput([{ id: 'a', label: 'A' }], []), runner),
    ).rejects.toThrow('ELK layout failed')
  })
})
