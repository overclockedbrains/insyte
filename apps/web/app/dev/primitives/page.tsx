'use client'

import type { CanvasVisual } from '@insyte/scene-engine'
import { CanvasContextProvider } from '@/src/engine/CanvasContext'
import { PrimitiveRegistry } from '@/src/engine/primitives'

const LinearViz = PrimitiveRegistry['linear']
const MapViz = PrimitiveRegistry['map']
const SystemDiagramViz = PrimitiveRegistry['system-diagram']
const GraphViz = PrimitiveRegistry['graph']
const TreeViz = PrimitiveRegistry['tree']
const GridViz = PrimitiveRegistry['grid']

const showcaseDataDOM = [
  // ── Array: Two-pointer — finds pair summing to target ───────────────────────
  {
    title: 'Array — Two Pointer',
    visual: { type: 'linear' },
    state: {
      items: [
        { id: 'a0', value: '1' },
        { id: 'a1', value: '3', highlight: 'active' },
        { id: 'a2', value: '5' },
        { id: 'a3', value: '7' },
        { id: 'a4', value: '9', highlight: 'active' },
        { id: 'a5', value: '11' },
      ],
      pointers: [
        { index: 1, label: 'lo' },
        { index: 4, label: 'hi', color: 'var(--color-secondary)' },
      ],
    },
    Component: LinearViz,
  },

  // ── Array: Sliding window — highlight shows the active window ───────────────
  {
    title: 'Array — Sliding Window',
    visual: { type: 'linear' },
    state: {
      items: [
        { id: 'w0', value: '2' },
        { id: 'w1', value: '1', highlight: 'active' },
        { id: 'w2', value: '5', highlight: 'active' },
        { id: 'w3', value: '1', highlight: 'active' },
        { id: 'w4', value: '3' },
        { id: 'w5', value: '2' },
      ],
      windowHighlight: { start: 1, end: 3 },
      pointers: [
        { index: 1, label: 'L' },
        { index: 3, label: 'R', color: 'var(--color-secondary)' },
      ],
    },
    Component: LinearViz,
  },

  // ── Linked List: Reversal — prev/curr/next in mid-step ──────────────────────
  {
    title: 'Linked List — In-place Reversal',
    visual: { type: 'linear', variant: 'linked-list' },
    state: {
      items: [
        { id: 'll0', value: '1' },
        { id: 'll1', value: '2', highlight: 'visited' },
        { id: 'll2', value: '3', highlight: 'active' },
        { id: 'll3', value: '4' },
        { id: 'll4', value: '5' },
      ],
      pointers: [
        { index: 1, label: 'prev' },
        { index: 2, label: 'curr', color: 'var(--color-secondary)' },
        { index: 3, label: 'next', color: 'var(--color-tertiary)' },
      ],
    },
    Component: LinearViz,
  },

  // ── Stack: Balanced brackets check — mid-parse ─────────────────────────────
  {
    title: 'Stack — Balanced Brackets',
    visual: { type: 'linear', variant: 'stack' },
    state: {
      items: [
        { id: 's0', value: '(' },
        { id: 's1', value: '[' },
        { id: 's2', value: '{', highlight: 'active' },
      ],
    },
    Component: LinearViz,
  },

  // ── Queue: BFS frontier — level-order tree traversal ───────────────────────
  {
    title: 'Queue — BFS Frontier',
    visual: { type: 'linear', variant: 'queue' },
    state: {
      items: [
        { id: 'q0', value: 'Node B', highlight: 'visited' },
        { id: 'q1', value: 'Node C' },
        { id: 'q2', value: 'Node D' },
        { id: 'q3', value: 'Node E', highlight: 'insert' },
      ],
    },
    Component: LinearViz,
  },

  // ── Map: LRU Cache — recently used ordering ────────────────────────────────
  {
    title: 'Hash Map — LRU Cache State',
    visual: { type: 'map' },
    state: {
      entries: [
        { id: 'm0', key: 'page:/home',    value: '<html>…</html>',   highlight: 'visited' },
        { id: 'm1', key: 'page:/docs',    value: '<html>…</html>' },
        { id: 'm2', key: 'api:user:42',   value: '{ id: 42, role: "admin" }', highlight: 'active' },
        { id: 'm3', key: 'api:user:99',   value: '{ id: 99, role: "user" }' },
        { id: 'm4', key: 'config:flags',  value: '{ darkMode: true }', highlight: 'insert' },
      ],
    },
    Component: MapViz,
  },

  // ── System Diagram: Microservices request flow ─────────────────────────────
  {
    title: 'System Diagram — Microservices Flow',
    visual: { type: 'system-diagram', layoutHint: 'dagre-LR' },
    state: {
      components: [
        { id: 'client',  label: 'Mobile App',    icon: 'mobile',   status: 'normal' },
        { id: 'lb',      label: 'Load Balancer',  icon: 'layers',   status: 'active' },
        { id: 'auth',    label: 'Auth Service',   icon: 'shield',   status: 'normal' },
        { id: 'api',     label: 'API Service',    icon: 'server',   status: 'active' },
        { id: 'cache',   label: 'Redis Cache',    icon: 'zap',      status: 'normal' },
        { id: 'db',      label: 'Postgres DB',    icon: 'database', status: 'normal' },
      ],
      connections: [
        { from: 'client', to: 'lb',    active: true },
        { from: 'lb',     to: 'auth',  active: true },
        { from: 'lb',     to: 'api',   active: true },
        { from: 'api',    to: 'cache', style: 'dashed' },
        { from: 'api',    to: 'db' },
      ],
    },
    Component: SystemDiagramViz,
  },

  // ── Graph: Dijkstra shortest path ─────────────────────────────────────────
  {
    title: 'Graph — Dijkstra Shortest Path',
    visual: { type: 'graph', layoutHint: 'dagre-LR' },
    state: {
      nodes: [
        { id: 'S', label: 'S', highlight: 'visited' },
        { id: 'A', label: 'A', highlight: 'visited' },
        { id: 'B', label: 'B', highlight: 'active' },
        { id: 'C', label: 'C' },
        { id: 'E', label: 'E' },
      ],
      edges: [
        { from: 'S', to: 'A', directed: true, label: '4' },
        { from: 'S', to: 'B', directed: true, label: '2' },
        { from: 'A', to: 'C', directed: true, label: '5' },
        { from: 'B', to: 'A', directed: true, label: '1', highlight: 'active' },
        { from: 'B', to: 'C', directed: true, label: '8' },
        { from: 'C', to: 'E', directed: true, label: '2' },
      ],
    },
    Component: GraphViz,
  },

  // ── Tree: BST — search traversal ──────────────────────────────────────────
  {
    title: 'Tree — BST Search',
    visual: { type: 'tree' },
    state: {
      nodes: [
        { id: 'n50', value: '50', children: ['n30', 'n70'] },
        { id: 'n30', value: '30', children: ['n20', 'n40'], highlight: 'visited' },
        { id: 'n70', value: '70', children: ['n60', 'n80'] },
        { id: 'n20', value: '20' },
        { id: 'n40', value: '40', highlight: 'active' },
        { id: 'n60', value: '60' },
        { id: 'n80', value: '80' },
      ],
      rootId: 'n50',
    },
    Component: TreeViz,
  },

  // ── Grid: A* Pathfinding — 4x6 grid with walls and discovered path ────────
  {
    title: 'Grid — A* Pathfinding',
    visual: { type: 'grid' },
    state: {
      rows: 4,
      cols: 6,
      cells: [
        [{ highlight: 'start' }, { highlight: 'path' }, { highlight: 'path' }, { highlight: 'wall' }, {}, {}],
        [{}, { highlight: 'wall' }, { highlight: 'path' }, { highlight: 'path' }, { highlight: 'active' }, {}],
        [{}, { highlight: 'visited' }, { highlight: 'visited' }, { highlight: 'wall' }, { highlight: 'path' }, {}],
        [{}, {}, { highlight: 'visited' }, {}, { highlight: 'path' }, { highlight: 'end' }],
      ],
      currentCell: { row: 1, col: 4 },
    },
    Component: GridViz,
  },
]

import { useState, useEffect } from 'react'

function ShowcaseCard({ item, index }: { item: (typeof showcaseDataDOM)[number], index: number }) {
  const Component = item.Component;
  const storageKey = `insyte_showcase_${item.title.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const defaultJson = JSON.stringify(item.state, null, 2);

  const [isMounted, setIsMounted] = useState(false);
  const [jsonText, setJsonText] = useState(defaultJson);
  const [parsedState, setParsedState] = useState(item.state);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from session storage strictly on the client after mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      setJsonText(stored);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!isMounted) return; // Don't sync or overwrite until hydrated
    try {
      const parsed = JSON.parse(jsonText);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setParsedState(parsed);
      setError(null);
      sessionStorage.setItem(storageKey, jsonText);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [jsonText, storageKey, isMounted]);

  const handleReset = () => {
    sessionStorage.removeItem(storageKey);
    setJsonText(defaultJson);
  };

  if (!Component) return null;

  const isModified = jsonText !== defaultJson;

  return (
    <div className="flex flex-col border border-outline-variant/20 rounded-2xl overflow-hidden bg-surface-container-low shadow-md">
      <div className="px-6 py-4 border-b border-outline-variant/10 bg-surface flex items-center justify-between">
        <h2 className="font-mono font-bold text-sm tracking-widest uppercase text-primary">
          {item.title}
        </h2>
        <div className="text-[10px] font-mono text-on-surface-variant/60 uppercase flex items-center gap-3">
          {isModified && (
            <span className="text-emerald-400 font-bold tracking-wider bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Session Saved
            </span>
          )}
          <span>
            type: {item.visual.type}
            {item.visual.variant && ` | variant: ${item.visual.variant}`}
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row min-h-[400px]">
        <div className="flex-1 p-8 flex items-center justify-center relative overflow-hidden bg-surface-container/50 border-b lg:border-b-0 lg:border-r border-outline-variant/10">
          <CanvasContextProvider className="w-full h-full flex items-center justify-center">
            <Component
              id={`showcase-${index}`}
              step={1}
              state={parsedState}
              visual={item.visual as unknown as CanvasVisual}
            />
          </CanvasContextProvider>
        </div>

        <div className="w-full lg:w-[450px] flex flex-col bg-[var(--color-dev-panel-bg)] border-l border-outline-variant/10">
          <div className="px-5 py-3 bg-black/40 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono font-bold text-outline-variant/80 uppercase tracking-wider">State Editor (Live)</span>
              {isModified && (
                <button
                  onClick={handleReset}
                  className="text-[10px] font-mono font-bold tracking-widest uppercase bg-error/10 border border-error/30 text-error hover:bg-error hover:text-on-error px-3 py-1 rounded-md transition-all shadow-sm"
                >
                  Reset
                </button>
              )}
            </div>
            {error && <span className="text-[10px] font-mono font-bold text-error truncate max-w-[200px] bg-error/10 px-2 py-1 rounded" title={error}>Invalid JSON</span>}
          </div>
          <textarea
            className="flex-1 w-full bg-transparent text-[var(--color-dev-input-text)] font-mono text-sm p-5 outline-none resize-none focus:bg-[var(--color-dev-input-focus-bg)] transition-colors leading-relaxed"
            spellCheck={false}
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

type RendererMode = 'dom' | 'canvas'

const RENDERER_MODES: { id: RendererMode; label: string; available: boolean; badge?: string }[] = [
  { id: 'dom', label: 'DOM / React', available: true },
  { id: 'canvas', label: 'Canvas / WebGL', available: false, badge: 'Coming Soon' },
]

export default function PrimitivesShowcasePage() {
  const [rendererMode, setRendererMode] = useState<RendererMode>('dom')

  return (
    <div className="min-h-screen bg-background text-on-surface p-12">
      <div className="max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-mono font-bold mb-3">Primitive Visuals Showcase</h1>
          <p className="text-on-surface-variant/70 max-w-2xl leading-relaxed">
            An isolated dev playground to view, test, and polish every visual primitive in the engine. Edit JSON payloads live to test layouts, highlights, and animations.
          </p>
        </div>

        {/* Renderer mode switcher */}
        <div className="flex items-center gap-3 mb-10">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant/70">Renderer</span>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-container border border-outline-variant/20">
            {RENDERER_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => mode.available && setRendererMode(mode.id)}
                disabled={!mode.available}
                className={[
                  'relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium font-mono transition-all',
                  mode.available
                    ? rendererMode === mode.id
                      ? 'bg-surface-container-high text-on-surface shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                    : 'text-outline-variant/40 cursor-not-allowed',
                ].join(' ')}
              >
                {/* Active indicator dot */}
                {mode.available && rendererMode === mode.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
                {mode.label}
                {mode.badge && (
                  <span className="text-[9px] font-bold uppercase tracking-widest bg-outline-variant/10 border border-outline-variant/30 text-on-surface-variant/70 px-1.5 py-0.5 rounded-full">
                    {mode.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Active renderer info */}
          <div className="ml-auto flex items-center gap-2 text-[10px] font-mono text-on-surface-variant/60 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {rendererMode === 'dom' ? 'React DOM · Framer Motion' : 'WebGL · Canvas2D'}
          </div>
        </div>

        {/* Renderer content */}
        {rendererMode === 'dom' && (
          <div className="grid grid-cols-1 gap-12">
            {showcaseDataDOM.map((item, i) => (
              <ShowcaseCard key={i} item={item} index={i} />
            ))}
          </div>
        )}

        {rendererMode === 'canvas' && (
          <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container/30 gap-4">
            <div className="w-12 h-12 rounded-full bg-surface-container-high border border-outline-variant/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-outline-variant/60">
                <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-mono font-bold text-on-surface-variant/60 text-sm">Canvas Renderer</p>
              <p className="text-xs text-outline-variant/50 mt-1 max-w-xs leading-relaxed">
                Not yet implemented. When the WebGL/Canvas2D engine ships, this tab will render all the same primitives using the new backend.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

