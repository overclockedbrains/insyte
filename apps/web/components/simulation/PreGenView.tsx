'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ChevronDown } from 'lucide-react'
import type { SceneType } from '@insyte/scene-engine'

// ─── Types ────────────────────────────────────────────────────────────────────

type Depth = 'quick' | 'standard' | 'deep'
type Familiarity = 'new' | 'basics' | 'familiar'

export interface PreGenState {
  status: 'loading' | 'ready'
  mode: SceneType | null
  questions: string[]
  depth: Depth
  familiarity: Familiarity
  answers: string[]
}

interface PreGenViewProps {
  topic: string
  state: PreGenState
  onDepthChange: (depth: Depth) => void
  onFamiliarityChange: (familiarity: Familiarity) => void
  onAnswerChange: (index: number, value: string) => void
  onModeChange: (mode: SceneType) => void
  onGenerate: () => void
}

// ─── Mode config ──────────────────────────────────────────────────────────────

const MODE_OPTIONS: { value: SceneType; label: string; dot: string }[] = [
  { value: 'concept',   label: 'Concept',       dot: 'bg-primary' },
  { value: 'dsa-trace', label: 'DSA Trace',     dot: 'bg-secondary' },
  { value: 'lld',       label: 'LLD',           dot: 'bg-tertiary' },
  { value: 'hld',       label: 'System Design', dot: 'bg-on-surface-variant' },
]
const MODE_MAP = Object.fromEntries(MODE_OPTIONS.map((m) => [m.value, m])) as Record<
  SceneType, (typeof MODE_OPTIONS)[number]
>

// ─── PillGroup ────────────────────────────────────────────────────────────────

function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={[
              'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200',
              active
                ? 'text-on-primary'
                : 'text-on-surface-variant/60 border border-outline-variant/20 hover:border-outline-variant/40 hover:text-on-surface-variant',
            ].join(' ')}
            style={active ? { background: 'var(--gradient-brand-explore)' } : undefined}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── PreGenView ───────────────────────────────────────────────────────────────

export function PreGenView({
  topic,
  state,
  onDepthChange,
  onFamiliarityChange,
  onAnswerChange,
  onModeChange,
  onGenerate,
}: PreGenViewProps) {
  const { status, mode, questions, depth, familiarity, answers } = state
  const [showModeChips, setShowModeChips] = useState(false)
  const currentMode = mode ? MODE_MAP[mode] : null

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-8 overflow-y-auto">

      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{ background: 'var(--gradient-primary-radial)' }}
        aria-hidden
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md rounded-2xl border border-outline-variant/20 bg-surface-container-low overflow-hidden mt-8"
        style={{
          boxShadow: '0 0 0 1px rgba(183,159,255,0.06), 0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Brand accent stripe */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'var(--gradient-brand)' }}
        />

        {/* ── Header ── */}
        <div className="px-6 pt-7 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-on-surface-variant/35 uppercase tracking-[0.16em] mb-2">
                Customize
              </p>
              <h2 className="text-on-surface font-bold text-[1.2rem] leading-tight line-clamp-2">
                {topic}
              </h2>
            </div>

            <div className="shrink-0 mt-0.5">
              {status === 'loading' ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-outline-variant/15 bg-surface-container">
                  <Loader2 className="h-2.5 w-2.5 animate-spin text-primary/50" />
                  <span className="text-[10px] text-on-surface-variant/40 font-medium">Analyzing…</span>
                </div>
              ) : currentMode ? (
                <button
                  onClick={() => setShowModeChips((v) => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-outline-variant/20 bg-surface-container hover:bg-surface-container-high transition-colors duration-150"
                >
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${currentMode.dot}`} />
                  <span className="text-[11px] text-on-surface font-semibold">{currentMode.label}</span>
                  <ChevronDown
                    className={[
                      'h-3 w-3 text-on-surface-variant/35 transition-transform duration-200',
                      showModeChips ? 'rotate-180' : '',
                    ].join(' ')}
                  />
                </button>
              ) : null}
            </div>
          </div>

          <AnimatePresence>
            {showModeChips && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.16 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-1.5 pt-3">
                  {MODE_OPTIONS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => { onModeChange(m.value); setShowModeChips(false) }}
                      className={[
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-150 border',
                        mode === m.value
                          ? 'border-outline-variant/35 bg-surface-container-high text-on-surface'
                          : 'border-outline-variant/15 bg-surface-container text-on-surface-variant/60 hover:text-on-surface-variant',
                      ].join(' ')}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                      {m.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Depth + Level ── */}
        <div className="mx-6 mb-5 divide-y divide-outline-variant/10 border border-outline-variant/12 rounded-lg overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-5">
            <span className="text-[9px] font-bold text-on-surface-variant/35 uppercase tracking-[0.14em] w-14 shrink-0">
              Depth
            </span>
            <PillGroup
              options={[
                { value: 'quick',    label: 'Quick'    },
                { value: 'standard', label: 'Standard' },
                { value: 'deep',     label: 'Deep'     },
              ]}
              value={depth}
              onChange={onDepthChange}
            />
          </div>
          <div className="px-4 py-3 flex items-center gap-5">
            <span className="text-[9px] font-bold text-on-surface-variant/35 uppercase tracking-[0.14em] w-14 shrink-0">
              Level
            </span>
            <PillGroup
              options={[
                { value: 'new',      label: 'Beginner'  },
                { value: 'basics',   label: 'Familiar'  },
                { value: 'familiar', label: 'Advanced'  },
              ]}
              value={familiarity}
              onChange={onFamiliarityChange}
            />
          </div>
        </div>

        {/* ── Questions ── */}
        <div className="px-6 pb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[9px] font-bold text-on-surface-variant/35 uppercase tracking-[0.14em]">
              Questions
            </span>
            <span className="text-[9px] text-on-surface-variant/20">— optional</span>
          </div>

          <AnimatePresence mode="wait">
            {status === 'loading' ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                {[0.9, 0.65, 0.4].map((op, i) => (
                  <div key={i} style={{ opacity: op }}>
                    <div className="flex gap-3 mb-2">
                      <div className="h-2.5 w-5 rounded bg-surface-container-high animate-pulse shrink-0 mt-0.5" />
                      <div className="h-2.5 w-4/5 rounded bg-surface-container-high animate-pulse" />
                    </div>
                    <div className="h-px w-full bg-surface-container-high animate-pulse mt-3" />
                  </div>
                ))}
              </motion.div>
            ) : questions.length > 0 ? (
              <motion.div
                key="questions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18 }}
                className="space-y-0"
              >
                {questions.map((q, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {i > 0 && (
                      <div className="h-px bg-outline-variant/10 my-4" />
                    )}
                    <div className="flex items-start gap-2.5 mb-2">
                      <span
                        className="font-mono text-[10px] font-bold shrink-0 mt-0.5 leading-none"
                        style={{ color: 'color-mix(in srgb, var(--ref-primary) 38%, transparent)' }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p className="text-[11.5px] text-on-surface-variant/55 leading-relaxed">{q}</p>
                    </div>
                    <input
                      type="text"
                      value={answers[i] ?? ''}
                      onChange={(e) => onAnswerChange(i, e.target.value)}
                      placeholder="Your answer…"
                      className="w-full bg-surface-container/40 border border-outline-variant/15 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/22 outline-none ring-0 focus:outline-none focus:ring-0 focus:border-primary/45 focus:bg-surface-container/60 transition-all duration-150"
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.p
                key="no-questions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-on-surface-variant/30 text-center py-2 italic"
              >
                No questions — you&apos;re good to go.
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div
          className="px-6 py-4 flex items-center justify-between border-t border-outline-variant/10"
          style={{ background: 'rgba(0,0,0,0.1)' }}
        >
          <p className="text-[11px] text-on-surface-variant/30">
            {status === 'loading' ? 'Personalizing…' : 'Ready when you are.'}
          </p>
          <motion.button
            onClick={onGenerate}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="px-5 py-2 rounded-lg text-[13px] font-bold text-on-primary"
            style={{ background: 'var(--gradient-brand-explore)' }}
          >
            Generate →
          </motion.button>
        </div>

      </motion.div>
    </div>
  )
}
