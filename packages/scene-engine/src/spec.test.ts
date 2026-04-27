import { describe, it, expect } from 'vitest'
import { CANVAS_VISUAL_SPEC, ROOT_FIELD_SPEC } from './spec'
import { buildCanvasVisualSchema, buildStepSchema, buildSceneSchema, buildPromptGuide, buildJsonSchema, LayoutHintSchema } from './spec.build'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(result: { success: boolean }) {
  expect(result.success).toBe(true)
}

function fail(result: { success: boolean }) {
  expect(result.success).toBe(false)
}

// ─── Canvas visual schema tests ───────────────────────────────────────────────

describe('buildCanvasVisualSchema', () => {
  const schema = buildCanvasVisualSchema()

  it('has all 7 canvas visual types', () => {
    const types = (schema.options as Array<{ shape: { type: { value: string } } }>)
      .map(o => o.shape.type.value)
    expect(types).toHaveLength(7)
    expect(types).toContain('linear')
    expect(types).toContain('map')
    expect(types).toContain('tree')
    expect(types).toContain('graph')
    expect(types).toContain('grid')
    expect(types).toContain('system-diagram')
    expect(types).toContain('chart')
  })

  it('does not include removed types', () => {
    const typesList = (schema.options as Array<{ shape: { type: { value: string } } }>)
      .map(o => o.shape.type.value)
    expect(typesList).not.toContain('array')
    expect(typesList).not.toContain('hashmap')
    expect(typesList).not.toContain('stack')
    expect(typesList).not.toContain('queue')
    expect(typesList).not.toContain('linked-list')
    expect(typesList).not.toContain('recursion-tree')
    expect(typesList).not.toContain('dp-table')
    expect(typesList).not.toContain('bezier-connector')
  })

  describe('linear (array variant)', () => {
    it('accepts valid array initialState', () => {
      ok(schema.safeParse({
        id: 'arr', type: 'linear', variant: 'array', layoutHint: 'linear-H',
        initialState: { items: [{ id: 'i0', value: 1 }, { id: 'i1', value: 2, highlight: 'active' }] },
      }))
    })

    it('rejects "cells" field name (must be "items")', () => {
      fail(schema.safeParse({
        id: 'arr', type: 'linear', variant: 'array', layoutHint: 'linear-H',
        initialState: { cells: [{ value: 1 }] },
      }))
    })
  })

  describe('linear (stack variant)', () => {
    it('accepts valid stack initialState', () => {
      ok(schema.safeParse({
        id: 'stk', type: 'linear', variant: 'stack', layoutHint: 'linear-V',
        initialState: { items: [{ id: 's0', value: 'foo', highlight: 'push' }] },
      }))
    })
  })

  describe('linear (queue variant)', () => {
    it('accepts valid queue initialState', () => {
      ok(schema.safeParse({
        id: 'q', type: 'linear', variant: 'queue', layoutHint: 'linear-H',
        initialState: { items: [{ id: 'q0', value: 1, highlight: 'enqueue' }] },
      }))
    })
  })

  describe('linear (linked-list variant)', () => {
    it('accepts valid linked-list initialState', () => {
      ok(schema.safeParse({
        id: 'll', type: 'linear', variant: 'linked-list', layoutHint: 'linear-H',
        initialState: { items: [{ id: 'n0', value: 1 }, { id: 'n1', value: 2, highlight: 'insert' }] },
      }))
    })
  })

  describe('map', () => {
    it('accepts valid initialState', () => {
      ok(schema.safeParse({
        id: 'seen-map', type: 'map', layoutHint: 'hashmap-buckets',
        initialState: { entries: [{ id: 'e0', key: '2', value: '0', highlight: 'insert' }] },
      }))
    })

    it('rejects invalid highlight value', () => {
      fail(schema.safeParse({
        id: 'seen-map', type: 'map', layoutHint: 'hashmap-buckets',
        initialState: { entries: [{ id: 'e0', key: '2', value: '0', highlight: 'active' }] },
      }))
    })

    it('accepts empty entries (zero-state)', () => {
      ok(schema.safeParse({
        id: 'seen-map', type: 'map', layoutHint: 'hashmap-buckets',
        initialState: { entries: [] },
      }))
    })
  })

  describe('tree (binary)', () => {
    it('accepts valid flat binary tree', () => {
      ok(schema.safeParse({
        id: 'bst', type: 'tree', layoutHint: 'tree-RT',
        initialState: {
          nodes: [
            { id: 'n1', value: '5', children: ['n2', 'n3'], highlight: 'active' },
            { id: 'n2', value: '3', children: [] },
            { id: 'n3', value: '8', children: [] },
          ],
          rootId: 'n1',
        },
      }))
    })

    it('accepts empty tree (zero nodes)', () => {
      ok(schema.safeParse({
        id: 'bst', type: 'tree', layoutHint: 'tree-RT',
        initialState: { nodes: [], rootId: '' },
      }))
    })
  })

  describe('tree (trie variant)', () => {
    it('accepts valid trie with isEnd nodes', () => {
      ok(schema.safeParse({
        id: 'trie', type: 'tree', variant: 'trie', layoutHint: 'dagre-TB',
        initialState: {
          nodes: [
            { id: 'root', value: '', children: ['n1'] },
            { id: 'n1', value: 'a', children: ['n2'], isEnd: false },
            { id: 'n2', value: 'p', children: [], isEnd: true },
          ],
          rootId: 'root',
        },
      }))
    })
  })

  describe('tree (recursion variant)', () => {
    it('accepts valid recursion tree with children', () => {
      ok(schema.safeParse({
        id: 'rtree', type: 'tree', variant: 'recursion', layoutHint: 'dagre-TB',
        initialState: {
          nodes: [
            { id: 'r0', value: 'fib(4)', children: ['r1', 'r2'], highlight: 'active' },
            { id: 'r1', value: 'fib(3)', children: [], result: '2' },
            { id: 'r2', value: 'fib(2)', children: [], highlight: 'memoized' },
          ],
          rootId: 'r0',
        },
      }))
    })
  })

  describe('graph', () => {
    it('accepts valid graph with nodes and edges', () => {
      ok(schema.safeParse({
        id: 'g', type: 'graph', layoutHint: 'dagre-LR',
        initialState: {
          nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B', highlight: 'visited' }],
          edges: [{ id: 'e0', from: 'a', to: 'b', highlight: 'active' }],
        },
      }))
    })

    it('accepts any string highlight (variant-scoped, prompt-enforced)', () => {
      ok(schema.safeParse({
        id: 'g', type: 'graph', layoutHint: 'dagre-LR',
        initialState: {
          nodes: [{ id: 'a', label: 'A', highlight: 'source' }],
          edges: [{ id: 'e0', from: 'a', to: 'a', highlight: 'in-tree' }],
        },
      }))
    })
  })

  describe('graph (weighted variant)', () => {
    it('accepts weighted graph with distance and weight fields', () => {
      ok(schema.safeParse({
        id: 'g', type: 'graph', variant: 'weighted', layoutHint: 'dagre-TB',
        initialState: {
          nodes: [
            { id: 'a', label: 'A', highlight: 'source', distance: '0' },
            { id: 'b', label: 'B', highlight: 'default', distance: '∞' },
          ],
          edges: [{ id: 'e0', from: 'a', to: 'b', directed: true, weight: 4, highlight: 'relaxed' }],
        },
      }))
    })
  })

  describe('grid (pathfinding variant)', () => {
    it('accepts valid 2D pathfinding grid', () => {
      ok(schema.safeParse({
        id: 'grid', type: 'grid', variant: 'pathfinding', layoutHint: 'grid-2d',
        initialState: {
          rows: 2, cols: 2,
          cells: [
            [{ value: 1, highlight: 'wall' }, { value: 0 }],
            [{ value: 0 }, { value: 0, highlight: 'visited' }],
          ],
        },
      }))
    })

    it('rejects missing rows field', () => {
      fail(schema.safeParse({
        id: 'grid', type: 'grid', variant: 'pathfinding', layoutHint: 'grid-2d',
        initialState: {
          cols: 2,
          cells: [[{ value: 1 }, { value: 0 }]],
        },
      }))
    })
  })

  describe('grid (dp variant)', () => {
    it('accepts valid DP table', () => {
      ok(schema.safeParse({
        id: 'dp', type: 'grid', variant: 'dp', layoutHint: 'grid-2d',
        initialState: {
          rows: 2, cols: 2,
          cells: [
            [{ value: 0, highlight: 'active' }, { value: null }],
            [{ value: null }, { value: null }],
          ],
        },
      }))
    })
  })

  describe('system-diagram', () => {
    it('accepts valid components and connections', () => {
      ok(schema.safeParse({
        id: 'sys', type: 'system-diagram', layoutHint: 'dagre-LR',
        initialState: {
          components: [
            { id: 'client', label: 'Client', icon: 'mobile', status: 'normal' },
            { id: 'server', label: 'Server', icon: 'server', status: 'active', sublabel: ':8080' },
          ],
          connections: [{ id: 'c0', from: 'client', to: 'server', active: true, style: 'solid', label: 'HTTPS' }],
        },
      }))
    })

    it('rejects invalid icon', () => {
      fail(schema.safeParse({
        id: 'sys', type: 'system-diagram', layoutHint: 'dagre-LR',
        initialState: {
          components: [{ id: 'x', label: 'X', icon: 'unknown-icon', status: 'normal' }],
          connections: [],
        },
      }))
    })

    it('rejects invalid status', () => {
      fail(schema.safeParse({
        id: 'sys', type: 'system-diagram', layoutHint: 'dagre-LR',
        initialState: {
          components: [{ id: 'x', label: 'X', icon: 'server', status: 'highlighted' }],
          connections: [],
        },
      }))
    })
  })

  describe('system-diagram with ring layoutHint', () => {
    it('accepts ring layoutHint for system-diagram', () => {
      ok(schema.safeParse({
        id: 'hash-ring', type: 'system-diagram', layoutHint: 'ring',
        initialState: {
          components: [
            { id: 'n1', label: 'Node A', icon: 'server', status: 'normal' },
            { id: 'n2', label: 'Node B', icon: 'server', status: 'active' },
          ],
          connections: [{ id: 'c0', from: 'n1', to: 'n2', active: true }],
        },
      }))
    })
  })

  describe('chart (bar variant)', () => {
    it('accepts valid bar chart initialState', () => {
      ok(schema.safeParse({
        id: 'bars', type: 'chart', variant: 'bar', layoutHint: 'chart-bar',
        initialState: {
          bars: [
            { id: 'b0', value: 5, label: 'A' },
            { id: 'b1', value: 3, highlight: 'active' },
            { id: 'b2', value: 8, highlight: 'pivot' },
          ],
          maxValue: 10,
        },
      }))
    })

    it('accepts bar chart without maxValue', () => {
      ok(schema.safeParse({
        id: 'bars', type: 'chart', variant: 'bar', layoutHint: 'chart-bar',
        initialState: {
          bars: [{ id: 'b0', value: 42 }],
        },
      }))
    })

    it('rejects chart without variant', () => {
      fail(schema.safeParse({
        id: 'bars', type: 'chart', layoutHint: 'chart-bar',
        initialState: { bars: [] },
      }))
    })
  })

  it('gives a single invalid-literal error for unknown type (not 7 branch errors)', () => {
    const result = schema.safeParse({
      id: 'x', type: 'unknown-type', layoutHint: 'linear-H',
      initialState: {},
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issues = result.error.issues
      expect(issues.length).toBeGreaterThan(0)
      expect(issues[0]?.path).toContain('type')
    }
  })
})

// ─── Step schema tests ────────────────────────────────────────────────────────

describe('buildStepSchema', () => {
  describe('with canvas and hud ids', () => {
    const schema = buildStepSchema(['arr', 'seen-map'], ['counter-i'])

    it('accepts valid step', () => {
      ok(schema.safeParse({
        index: 1,
        explanation: { heading: 'Step one', body: 'Body text here.' },
        activeText: 'i=0, looking for 7',
        canvas: {
          arr: { items: [{ id: 'i0', value: 2, highlight: 'active' }, { id: 'i1', value: 7 }] },
        },
        hud: { 'counter-i': 0 },
      }))
    })

    it('rejects index 0 (must be >= 1)', () => {
      fail(schema.safeParse({
        index: 0,
        explanation: { heading: 'Init', body: 'Initial state.' },
      }))
    })

    it('rejects missing explanation heading', () => {
      fail(schema.safeParse({
        index: 1,
        explanation: { body: 'Body only — no heading.' },
      }))
    })

    it('rejects empty activeText string', () => {
      fail(schema.safeParse({
        index: 1,
        explanation: { heading: 'H', body: 'B' },
        activeText: '',
      }))
    })

    it('rejects unknown canvas visual id', () => {
      fail(schema.safeParse({
        index: 1,
        explanation: { heading: 'H', body: 'B' },
        canvas: {
          'unknown-visual': { items: [] },
        },
      }))
    })

    it('rejects unknown hud id', () => {
      fail(schema.safeParse({
        index: 1,
        explanation: { heading: 'H', body: 'B' },
        hud: { 'unknown-hud-id': 5 },
      }))
    })

    it('rejects step without explanation', () => {
      fail(schema.safeParse({
        index: 2,
        canvas: { 'arr': { items: [] } },
      }))
    })

    it('accepts step with explanation but without optional fields (canvas/hud/activeText all absent)', () => {
      ok(schema.safeParse({
        index: 2,
        explanation: { heading: 'No changes', body: 'State unchanged this step.' },
      }))
    })

    it('accepts explanation with optional callout', () => {
      ok(schema.safeParse({
        index: 1,
        explanation: {
          heading: 'With callout',
          body: 'Main explanation.',
          callout: 'Side insight here.',
        },
      }))
    })
  })

  describe('with empty canvasIds and hudIds', () => {
    const schema = buildStepSchema([], [])

    it('accepts any string keys in canvas and hud', () => {
      ok(schema.safeParse({
        index: 1,
        explanation: { heading: 'H', body: 'B' },
        canvas: { 'any-id': { items: [] } },
        hud: { 'any-hud': 42 },
      }))
    })
  })
})

// ─── Scene schema tests ───────────────────────────────────────────────────────

describe('buildSceneSchema', () => {
  const schema = buildSceneSchema()

  it('rejects hud with more than 3 items', () => {
    fail(schema.safeParse({
      id: 'x', title: 'T', type: 'concept', layout: 'canvas-only',
      canvas: [], controls: [], steps: [], popups: [],
      hud: [
        { id: 'h0', label: 'A', initialValue: 0 },
        { id: 'h1', label: 'B', initialValue: 0 },
        { id: 'h2', label: 'C', initialValue: 0 },
        { id: 'h3', label: 'D', initialValue: 0 },
      ],
    }))
  })

  it('accepts hud with exactly 3 items', () => {
    ok(schema.safeParse({
      id: 'x', title: 'T', type: 'concept', layout: 'canvas-only',
      canvas: [], controls: [], steps: [], popups: [],
      hud: [
        { id: 'h0', label: 'A', initialValue: 0 },
        { id: 'h1', label: 'B', initialValue: 1 },
        { id: 'h2', label: 'C', initialValue: 'ok' },
      ],
    }))
  })

  it('rejects activeText with empty initialValue', () => {
    fail(schema.safeParse({
      id: 'x', title: 'T', type: 'concept', layout: 'canvas-only',
      canvas: [], controls: [], steps: [], popups: [],
      activeText: { initialValue: '' },
    }))
  })

  it('has all root fields from ROOT_FIELD_SPEC', () => {
    const schemaShape = (schema as unknown as { innerType: () => { shape: Record<string, unknown> } }).innerType().shape
    const specKeys = Object.keys(ROOT_FIELD_SPEC)
    for (const key of specKeys) {
      expect(schemaShape).toHaveProperty(key)
    }
  })
})

// ─── Prompt guide tests ───────────────────────────────────────────────────────

describe('buildPromptGuide', () => {
  const guide = buildPromptGuide(
    [
      { id: 'arr',      type: 'linear', variant: 'array' },
      { id: 'seen-map', type: 'map' },
    ],
    [{ id: 'counter-i', label: 'i' }],
  )

  it('contains linear generation rules', () => {
    expect(guide).toContain('ZERO-STATE')
    expect(guide).toContain('FULL-SNAPSHOT')
    expect(guide).toContain('items')
  })

  it('contains map description', () => {
    expect(guide).toContain('seen-map')
    expect(guide).toContain('map')
    expect(guide).toContain('entries')
  })

  it('contains FULL-SNAPSHOT rule (from both linear and map)', () => {
    const matches = guide.match(/FULL-SNAPSHOT/g) ?? []
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  it('contains HUD item ids and rules', () => {
    expect(guide).toContain('counter-i')
    expect(guide).toContain('Maximum 3 HUD items')
  })

  it('contains activeText rules', () => {
    expect(guide).toContain('PERSISTENCE')
    expect(guide).toContain('SEMANTIC')
  })

  it('contains step rules', () => {
    expect(guide).toContain('FULL STATE SNAPSHOT')
    expect(guide).toContain('index:0')
  })

  it('emits trie-specific rules when trie canvas is present', () => {
    const trieGuide = buildPromptGuide(
      [{ id: 'trie', type: 'tree', variant: 'trie' }],
      [],
    )
    expect(trieGuide).toContain('isEnd')
    expect(trieGuide).toContain('trie')
  })

  it('emits weighted-specific rules when weighted graph canvas is present', () => {
    const weightedGuide = buildPromptGuide(
      [{ id: 'g', type: 'graph', variant: 'weighted' }],
      [],
    )
    expect(weightedGuide).toContain('weight')
    expect(weightedGuide).toContain('distance')
  })
})

// ─── JSON Schema tests ────────────────────────────────────────────────────────

describe('buildJsonSchema', () => {
  const jsonSchema = buildJsonSchema()

  it('produces an object with $schema and properties.canvas', () => {
    expect(jsonSchema).toHaveProperty('$schema')
    expect(jsonSchema).toHaveProperty('definitions')
    const str = JSON.stringify(jsonSchema)
    expect(str).toContain('canvas')
  })

  it('is a valid JSON-serialisable object', () => {
    expect(() => JSON.stringify(jsonSchema)).not.toThrow()
  })
})

// ─── Completeness tests ───────────────────────────────────────────────────────

describe('completeness', () => {
  it('every type in the 7-type system has an entry in CANVAS_VISUAL_SPEC', () => {
    const specTypes = Object.keys(CANVAS_VISUAL_SPEC)
    const expectedTypes = ['linear', 'map', 'tree', 'graph', 'grid', 'system-diagram', 'chart']
    for (const t of expectedTypes) {
      expect(specTypes).toContain(t)
    }
  })

  it('CANVAS_VISUAL_SPEC has no entry for removed types', () => {
    expect(CANVAS_VISUAL_SPEC).not.toHaveProperty('array')
    expect(CANVAS_VISUAL_SPEC).not.toHaveProperty('hashmap')
    expect(CANVAS_VISUAL_SPEC).not.toHaveProperty('stack')
    expect(CANVAS_VISUAL_SPEC).not.toHaveProperty('queue')
    expect(CANVAS_VISUAL_SPEC).not.toHaveProperty('linked-list')
    expect(CANVAS_VISUAL_SPEC).not.toHaveProperty('recursion-tree')
    expect(CANVAS_VISUAL_SPEC).not.toHaveProperty('dp-table')
    expect(CANVAS_VISUAL_SPEC).not.toHaveProperty('bezier-connector')
  })

  it('every CANVAS_VISUAL_SPEC entry has at least one generationRule', () => {
    for (const [type, entry] of Object.entries(CANVAS_VISUAL_SPEC)) {
      expect(entry.generationRules.length, `${type} has no generation rules`).toBeGreaterThan(0)
    }
  })

  it('sequential types have FULL-SNAPSHOT rule; identity-based types have sparse overlay rule', () => {
    const sequential    = ['linear', 'map', 'grid', 'chart'] as const
    const identityBased = ['graph', 'tree', 'system-diagram'] as const
    for (const type of sequential) {
      const entry = CANVAS_VISUAL_SPEC[type]
      expect(entry.generationRules.some(r => r.includes('FULL-SNAPSHOT')), `${type} missing FULL-SNAPSHOT rule`).toBe(true)
    }
    for (const type of identityBased) {
      const entry = CANVAS_VISUAL_SPEC[type]
      expect(entry.generationRules.some(r => r.includes('sparse overlay')), `${type} missing sparse overlay rule`).toBe(true)
      expect(entry.generationRules.some(r => r.includes('FULL-SNAPSHOT')), `${type} should NOT have FULL-SNAPSHOT rule`).toBe(false)
    }
  })

  it('canvas visual discriminated union has exactly 7 types', () => {
    const schema = buildCanvasVisualSchema()
    const types = schema.options.map((o: any) => o.shape.type.value)
    expect(types).toHaveLength(7)
    expect(types).toContain('chart')
    expect(types).not.toContain('array')
    expect(types).not.toContain('hashmap')
    expect(types).not.toContain('recursion-tree')
  })

  it('LayoutHintSchema includes chart-bar and ring', () => {
    expect(LayoutHintSchema.options).toContain('chart-bar')
    expect(LayoutHintSchema.options).toContain('ring')
  })
})

// ─── Canonical v2 JSON smoke test ────────────────────────────────────────────

describe('canonical v2 JSON smoke test', () => {
  const schema = buildSceneSchema()

  const twoSumV2 = {
    id: 'two-sum',
    title: 'Two Sum',
    type: 'dsa-trace',
    layout: 'code-left-canvas-right',
    description: 'Trace the O(n) complement-lookup solution for Two Sum.',
    category: 'Data Structures & Algorithms',
    canvas: [
      {
        id: 'arr',
        type: 'linear',
        variant: 'array',
        layoutHint: 'linear-H',
        initialState: {
          items: [
            { id: 'i0', value: '2' },
            { id: 'i1', value: '7' },
            { id: 'i2', value: '11' },
            { id: 'i3', value: '15' },
          ],
        },
      },
      {
        id: 'seen-map',
        type: 'map',
        layoutHint: 'hashmap-buckets',
        initialState: { entries: [] },
      },
    ],
    activeText: { initialValue: 'Start scan from left' },
    hud: [],
    controls: [],
    steps: [
      {
        index: 1,
        explanation: {
          heading: 'Lookup Before Insert',
          body: 'For each number, check if its complement is already in seen before inserting.',
          callout: 'Lookup-first avoids reusing the same element.',
        },
        activeText: 'i=0, num=2, need=7 — miss, store 2:0',
        canvas: {
          arr: {
            items: [
              { id: 'i0', value: '2', highlight: 'active' },
              { id: 'i1', value: '7' },
              { id: 'i2', value: '11' },
              { id: 'i3', value: '15' },
            ],
          },
          'seen-map': {
            entries: [{ id: 'e0', key: '2', value: '0', highlight: 'insert' }],
          },
        },
      },
      {
        index: 2,
        explanation: {
          heading: 'Hit Means Answer',
          body: 'At i=1, complement 2 is present in seen — return the pair immediately.',
        },
        activeText: 'i=1, num=7, need=2 — HIT in seen',
        canvas: {
          arr: {
            items: [
              { id: 'i0', value: '2', highlight: 'hit' },
              { id: 'i1', value: '7', highlight: 'active' },
              { id: 'i2', value: '11' },
              { id: 'i3', value: '15' },
            ],
          },
          'seen-map': {
            entries: [{ id: 'e0', key: '2', value: '0', highlight: 'hit' }],
          },
        },
      },
    ],
    popups: [
      {
        id: 'p1',
        attachTo: 'seen-map',
        text: 'Store values we\'ve seen',
        showAtStep: 1,
        hideAtStep: 2,
        style: 'info',
      },
    ],
    challenges: [
      {
        id: 'c1',
        title: 'Duplicate Values',
        description: 'What changes when nums = [3, 3] and target = 6?',
        type: 'predict',
      },
    ],
    complexity: { time: 'O(n)', space: 'O(n)' },
  }

  it('canonical Two Sum v2 JSON passes schema validation', () => {
    const result = schema.safeParse(twoSumV2)
    if (!result.success) {
      throw new Error('Schema validation failed: ' + JSON.stringify(result.error.issues, null, 2))
    }
    expect(result.success).toBe(true)
  })
})
