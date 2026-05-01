'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HIGHLIGHT_COLORS, type HighlightColor } from '../styles/colors'
import type { CanvasVisual } from '@insyte/scene-engine'

// ── Token metadata ─────────────────────────────────────────────────────────────

const TOKEN_LABELS: Partial<Record<HighlightColor, string>> = {
  active: 'Active / Processing',
  source: 'Reference source',
  visited: 'Visited',
  relaxed: 'Relaxed edge',
  comparing: 'Comparing',
  insert: 'Insert',
  push: 'Push',
  enqueue: 'Enqueue',
  hit: 'Hit / Found',
  found: 'Found',
  returned: 'Returned',
  memoized: 'Memoized',
  'in-tree': 'In spanning tree',
  'min-edge': 'Min-weight edge',
  sorted: 'Sorted',
  filled: 'Filled',
  pop: 'Pop',
  dequeue: 'Dequeue',
  delete: 'Delete',
  error: 'Error / Invalid',
  rejected: 'Rejected',
  miss: 'Cache miss',
  pivot: 'Pivot',
}

type Family = 'cyan' | 'green' | 'red' | 'amber'

const FAMILY_MEMBERS: Record<Family, HighlightColor[]> = {
  cyan: ['active', 'source', 'visited', 'relaxed', 'comparing'],
  green: ['insert', 'push', 'enqueue', 'hit', 'found', 'returned', 'memoized', 'in-tree', 'min-edge', 'sorted', 'filled'],
  red: ['pop', 'dequeue', 'delete', 'error', 'rejected', 'miss'],
  amber: ['pivot'],
}

const FAMILY_LABEL: Record<Family, string> = {
  cyan: 'Informational',
  green: 'Success',
  red: 'Danger',
  amber: 'Special',
}

const FAMILY_COLOR: Record<Family, string> = {
  cyan: '#3adffa',
  green: '#22c55e',
  red: '#ff6e84',
  amber: '#f59e0b',
}

function tokenFamily(t: HighlightColor): Family | null {
  for (const [family, members] of Object.entries(FAMILY_MEMBERS) as [Family, HighlightColor[]][]) {
    if (members.includes(t)) return family
  }
  return null
}

// ── Token lookup per visual type+variant ──────────────────────────────────────

const TYPE_TOKENS: Record<string, HighlightColor[]> = {
  'linear:array': ['active', 'hit', 'insert', 'error'],
  'linear:stack': ['active', 'push', 'pop'],
  'linear:queue': ['active', 'enqueue', 'dequeue'],
  'linear:linked-list': ['active', 'insert', 'delete'],
  'tree:binary': ['active', 'found', 'visited'],
  'tree:trie': ['active', 'found'],
  'tree:recursion': ['active', 'returned', 'memoized'],
  'graph:weighted': ['active', 'relaxed', 'min-edge', 'in-tree', 'rejected'],
  'graph:directed': ['active', 'found', 'visited'],
  'graph:undirected': ['active', 'found', 'visited'],
  'grid:dp': ['active', 'filled', 'source'],
  'grid:pathfinding': ['active', 'visited'],
  'chart:bar': ['active', 'comparing', 'sorted', 'pivot'],
}

export function deriveTokens(canvas: CanvasVisual[]): HighlightColor[] {
  const seen = new Set<HighlightColor>()
  for (const visual of canvas) {
    const key = `${visual.type}:${(visual as { variant?: string }).variant ?? ''}`
    const tokens = TYPE_TOKENS[key] ?? TYPE_TOKENS[`${visual.type}:`] ?? []
    for (const t of tokens) seen.add(t)
  }
  return Array.from(seen)
}

// ── Component ──────────────────────────────────────────────────────────────────

interface ColorLegendProps {
  canvas: CanvasVisual[]
}

export function ColorLegend({ canvas }: ColorLegendProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const tokens = deriveTokens(canvas)

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  if (tokens.length === 0) return null

  const groups = (Object.keys(FAMILY_MEMBERS) as Family[]).map(family => ({
    family,
    tokens: FAMILY_MEMBERS[family].filter(t => tokens.includes(t)),
  })).filter(g => g.tokens.length > 0)

  return (
    <div ref={ref} className="relative pointer-events-auto flex-shrink-0">
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Color legend"
        className={[
          'w-5 h-5 rounded-full border text-[10px] font-bold flex items-center justify-center transition-colors',
          open
            ? 'border-primary/60 text-primary bg-primary/10'
            : 'border-outline-variant/30 text-on-surface-variant/50 hover:border-outline-variant/60 hover:text-on-surface-variant',
        ].join(' ')}
      >
        ?
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="absolute right-0 top-7 z-50 glass-panel border border-outline-variant/20 rounded-2xl p-4 w-52 shadow-xl"
          >
            {/* Title */}
            <p className="gradient-text text-[11px] font-semibold tracking-wide mb-3">
              Color Legend
            </p>

            <div className="space-y-3">
              {groups.map(({ family, tokens: familyTokens }, i) => {
                const fc = FAMILY_COLOR[family]
                return (
                  <div key={family}>
                    {/* Subtle divider between groups */}
                    {i > 0 && <div className="h-px bg-outline-variant/10 -mx-1 mb-3" />}

                    {/* Group header with extending line */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-[9px] uppercase tracking-widest font-semibold whitespace-nowrap"
                        style={{ color: fc }}
                      >
                        {FAMILY_LABEL[family]}
                      </span>
                      <div className="flex-1 h-px" style={{ background: `${fc}30` }} />
                    </div>

                    {/* Items */}
                    <div className="space-y-1.5">
                      {familyTokens.map(token => {
                        const colors = HIGHLIGHT_COLORS[token]
                        const label  = TOKEN_LABELS[token] ?? token
                        return (
                          <div key={token} className="flex items-center gap-2.5">
                            <div
                              className="w-3.5 h-3.5 rounded flex-shrink-0"
                              style={{
                                backgroundColor: colors.bg,
                                border: `1px solid ${fc}`,
                                boxShadow: `0 0 6px ${fc}35`,
                              }}
                            />
                            <span className="text-[11px] text-on-surface/75 leading-none">{label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
