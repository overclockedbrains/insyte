import { describe, it, expect } from 'vitest'
import { applyLinearLayout, applyStackLayout, applyRadialLayout, applyBarChartLayout, applyRingLayout } from './arithmetic'
import type { LayoutInput } from '../types'
import { PRIMITIVE_SIZING } from '../spacing'

describe('arithmetic layouts', () => {
  describe('applyLinearLayout', () => {
    it('horizontally aligns array cells', () => {
      const input: LayoutInput = {
        visual: { id: 'viz-1', type: 'linear', variant: 'array', layoutHint: 'linear-H', initialState: { items: [] } },
        state: { items: [{ value: 10 }, { value: 20 }] },
      }

      const result = applyLinearLayout(input)
      const sz = PRIMITIVE_SIZING.array

      expect(result.nodes.length).toBe(2)

      expect(result.nodes[0]!.x).toBe(0 + sz.cellWidth / 2)
      expect(result.nodes[0]!.y).toBe(sz.cellHeight / 2)

      const step = sz.cellWidth + sz.gap
      expect(result.nodes[1]!.x).toBe(step + sz.cellWidth / 2)
    })

    it('adds pointer edges for linked-list', () => {
      const input: LayoutInput = {
        visual: { id: 'viz-1', type: 'linear', variant: 'linked-list', layoutHint: 'linear-H', initialState: { items: [] } },
        state: { items: [{ id: 'n1', value: 1 }, { id: 'n2', value: 2 }, { id: 'n3', value: 3 }] },
      }

      const result = applyLinearLayout(input)

      expect(result.edges.length).toBe(2)
      expect(result.edges[0]!.from).toBe('n1')
      expect(result.edges[0]!.to).toBe('n2')
      expect(result.edges[1]!.from).toBe('n2')
      expect(result.edges[1]!.to).toBe('n3')
    })
  })

  describe('applyStackLayout', () => {
    it('stacks items bottom-to-top rendering wise', () => {
      const input: LayoutInput = {
        visual: { id: 'viz-1', type: 'linear', variant: 'stack', layoutHint: 'linear-V', initialState: { items: [] } },
        state: { items: [{ id: 'bottom', value: 'A' }, { id: 'top', value: 'B' }] },
      }

      const result = applyStackLayout(input)
      expect(result.nodes.length).toBe(2)

      expect(result.nodes[0]!.state.id).toBe('top')
      expect(result.nodes[0]!.y).toBeLessThan(result.nodes[1]!.y)
    })
  })

  describe('applyRadialLayout', () => {
    it('distributes nodes evenly in a circle', () => {
      const input: LayoutInput = {
        visual: { id: 'viz-radial', type: 'graph', layoutHint: 'radial', initialState: { nodes: [], edges: [] } },
        state: { nodes: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }, { id: 'C', label: 'C' }, { id: 'D', label: 'D' }] },
      }

      const result = applyRadialLayout(input)
      expect(result.nodes.length).toBe(4)
      expect(result.viewBox).toBeDefined()
    })
  })

  describe('applyBarChartLayout', () => {
    it('produces 5 nodes for 5 bars with increasing x-positions', () => {
      const input: LayoutInput = {
        visual: { id: 'bars', type: 'chart', variant: 'bar', layoutHint: 'chart-bar', initialState: { bars: [] } },
        state: { bars: [
          { id: 'b0', value: 3 },
          { id: 'b1', value: 7 },
          { id: 'b2', value: 2 },
          { id: 'b3', value: 9 },
          { id: 'b4', value: 5 },
        ]},
      }

      const result = applyBarChartLayout(input)
      expect(result.nodes.length).toBe(5)
      // x-positions increase left to right
      for (let i = 1; i < result.nodes.length; i++) {
        expect(result.nodes[i]!.x).toBeGreaterThan(result.nodes[i - 1]!.x)
      }
      expect(result.edges.length).toBe(0)
    })

    it('produces empty layout for 0 bars without crashing', () => {
      const input: LayoutInput = {
        visual: { id: 'bars', type: 'chart', variant: 'bar', layoutHint: 'chart-bar', initialState: { bars: [] } },
        state: { bars: [] },
      }

      const result = applyBarChartLayout(input)
      expect(result.nodes.length).toBe(0)
      expect(result.edges.length).toBe(0)
      expect(result.viewBox).toBeDefined()
    })
  })

  describe('applyRingLayout', () => {
    it('places 6 components in a circle with no two at the same position', () => {
      const components = ['n0','n1','n2','n3','n4','n5'].map(id => ({ id, label: id, icon: 'server', status: 'normal' }))
      const input: LayoutInput = {
        visual: { id: 'ring', type: 'system-diagram', layoutHint: 'ring', initialState: { components: [], connections: [] } },
        state: { components, connections: [] },
      }

      const result = applyRingLayout(input)
      expect(result.nodes.length).toBe(6)

      // No two nodes at the same (x, y)
      const positions = result.nodes.map(n => `${Math.round(n.x)},${Math.round(n.y)}`)
      const unique = new Set(positions)
      expect(unique.size).toBe(6)
    })

    it('produces empty layout for 0 components without crashing', () => {
      const input: LayoutInput = {
        visual: { id: 'ring', type: 'system-diagram', layoutHint: 'ring', initialState: { components: [], connections: [] } },
        state: { components: [], connections: [] },
      }

      const result = applyRingLayout(input)
      expect(result.nodes.length).toBe(0)
      expect(result.viewBox).toBeDefined()
    })
  })
})
