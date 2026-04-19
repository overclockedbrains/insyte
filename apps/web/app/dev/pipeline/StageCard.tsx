'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock,
  LockOpen,
  Play,
  Pencil,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plug,
} from 'lucide-react'
import type { StageState, StageStatus } from './usePlayground'

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StageStatus }) {
  const map: Record<StageStatus, { label: string; className: string; icon: React.ReactNode }> = {
    idle: {
      label: 'Idle',
      className: 'text-on-surface-variant bg-surface-container-highest border-outline-variant/20',
      icon: <Clock className="h-3 w-3" />,
    },
    running: {
      label: 'Running',
      className: 'text-secondary bg-secondary/10 border-secondary/30',
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    done: {
      label: 'Done',
      className: 'text-primary bg-primary/10 border-primary/30',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    error: {
      label: 'Error',
      className: 'text-error bg-error/10 border-error/30',
      icon: <AlertCircle className="h-3 w-3" />,
    },
  }
  const { label, className, icon } = map[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${className}`}>
      {icon}
      {label}
    </span>
  )
}

// ─── Output display ───────────────────────────────────────────────────────────

function OutputDisplay({ output, isText, expanded }: { output: unknown; isText: boolean; expanded: boolean }) {
  const raw = isText ? String(output ?? '') : JSON.stringify(output, null, 2)
  const lines = raw.split('\n')
  const preview = lines.slice(0, 4).join('\n') + (lines.length > 4 ? '\n…' : '')
  return (
    <div className="overflow-hidden rounded border border-outline-variant/20">
      <pre className={[
        'overflow-auto bg-surface-container-highest p-4 font-mono text-[11px] leading-relaxed text-on-surface-variant whitespace-pre-wrap break-all',
        expanded
          ? 'overflow-auto max-h-[32rem] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-outline-variant/30 hover:[&::-webkit-scrollbar-thumb]:bg-outline-variant/60'
          : 'overflow-hidden max-h-36',
      ].join(' ')}>
        {expanded ? raw : preview}
      </pre>
    </div>
  )
}

// ─── Required inputs per stage ────────────────────────────────────────────────

interface InputSpec {
  stageIndex: number
  label: string
  isText: boolean
  required: boolean
}

const STAGE_REQUIRED_INPUTS: Record<number, InputSpec[]> = {
  0: [],
  1: [
    { stageIndex: 0, label: 'Stage 0 · Reasoning', isText: true, required: true },
  ],
  2: [
    { stageIndex: 0, label: 'Stage 0 · Reasoning', isText: true, required: true },
    { stageIndex: 1, label: 'Stage 1 · Skeleton (JSON)', isText: false, required: true },
  ],
  3: [
    { stageIndex: 1, label: 'Stage 1 · Skeleton (JSON)', isText: false, required: true },
  ],
  4: [],
  5: [
    { stageIndex: 1, label: 'Stage 1 · Skeleton (JSON)', isText: false, required: true },
    { stageIndex: 2, label: 'Stage 2 · Steps (JSON)', isText: false, required: true },
    { stageIndex: 3, label: 'Stage 3 · Popups (JSON)', isText: false, required: false },
    { stageIndex: 4, label: 'Stage 4 · Misc (JSON)', isText: false, required: false },
  ],
}

// ─── Provide inputs panel ─────────────────────────────────────────────────────

function ProvideInputsPanel({
  stageNum,
  upstreamValues,
  isAnyRunning,
  onSetInput,
  onRun,
}: {
  stageNum: number
  upstreamValues: Record<number, string>
  isAnyRunning: boolean
  onSetInput: (upstreamN: number, value: string) => void
  onRun: () => void
}) {
  const specs = useMemo(() => STAGE_REQUIRED_INPUTS[stageNum] ?? [], [stageNum])
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<number, string>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})

  const handleOpen = useCallback(() => {
    // Pre-fill with current upstream values
    const prefilled: Record<number, string> = {}
    for (const spec of specs) {
      prefilled[spec.stageIndex] = upstreamValues[spec.stageIndex] ?? ''
    }
    setValues(prefilled)
    setErrors({})
    setOpen(true)
  }, [specs, upstreamValues])

  const handleApplyAndRun = useCallback(() => {
    const newErrors: Record<number, string> = {}
    for (const spec of specs) {
      const val = values[spec.stageIndex] ?? ''
      if (spec.required && !val.trim()) {
        newErrors[spec.stageIndex] = 'Required'
        continue
      }
      if (!spec.isText && val.trim()) {
        try { JSON.parse(val) } catch { newErrors[spec.stageIndex] = 'Invalid JSON' }
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    // Apply inputs
    for (const spec of specs) {
      const val = values[spec.stageIndex] ?? ''
      if (val.trim()) onSetInput(spec.stageIndex, val)
    }
    setOpen(false)
    onRun()
  }, [specs, values, onSetInput, onRun])

  if (specs.length === 0) return null

  return (
    <div>
      <button
        type="button"
        onClick={open ? () => setOpen(false) : handleOpen}
        className="flex items-center gap-1.5 rounded border border-outline-variant/30 bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
      >
        <Plug className="h-3 w-3" />
        {open ? 'Hide inputs' : 'Provide inputs'}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 rounded border border-outline-variant/20 bg-surface-container-highest p-4">
              <p className="text-[11px] text-on-surface-variant">
                Paste upstream stage outputs to run this stage directly without running stages above it.
              </p>
              {specs.map((spec) => (
                <div key={spec.stageIndex} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-on-surface">{spec.label}</span>
                    {!spec.required && (
                      <span className="text-[10px] text-on-surface-variant/60">optional</span>
                    )}
                    {errors[spec.stageIndex] && (
                      <span className="text-[10px] text-error">{errors[spec.stageIndex]}</span>
                    )}
                  </div>
                  <div className={[
                    'overflow-hidden rounded border transition-colors',
                    errors[spec.stageIndex]
                      ? 'border-error/40 focus-within:border-error/60'
                      : 'border-outline-variant/30 focus-within:border-primary/40',
                  ].join(' ')}>
                    <textarea
                      value={values[spec.stageIndex] ?? ''}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [spec.stageIndex]: e.target.value }))
                      }
                      placeholder={spec.isText ? 'Paste reasoning text…' : 'Paste JSON…'}
                      rows={spec.isText ? 4 : 6}
                      spellCheck={false}
                      className="w-full px-3 py-2.5 font-mono text-[11px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none resize-none bg-surface-container [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-outline-variant/30 hover:[&::-webkit-scrollbar-thumb]:bg-outline-variant/60"
                    />
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleApplyAndRun}
                  disabled={isAnyRunning}
                  className="flex items-center gap-1.5 rounded bg-primary/10 border border-primary/30 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play className="h-3 w-3" />
                  Apply &amp; Run
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── StageCard ────────────────────────────────────────────────────────────────

interface StageCardProps {
  stageNum: number
  name: string
  model: string
  state: StageState
  isAnyRunning: boolean
  upstreamValues: Record<number, string>
  onRun: () => void
  onToggleLock: () => void
  onSaveEdit: (json: string) => void
  onSetInput: (upstreamN: number, value: string) => void
  onOpenInStudio?: () => void
}

export function StageCard({
  stageNum,
  name,
  model,
  state,
  isAnyRunning,
  upstreamValues,
  onRun,
  onToggleLock,
  onSaveEdit,
  onSetInput,
  onOpenInStudio,
}: StageCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [editError, setEditError] = useState('')
  const [copied, setCopied] = useState(false)

  const hasOutput = state.output !== null && state.output !== undefined && state.output !== ''
  const isText = stageNum === 0

  const borderClass = {
    idle: 'border-outline-variant/20',
    running: 'border-secondary/40',
    done: state.locked ? 'border-primary/40' : 'border-outline-variant/20',
    error: 'border-error/30',
  }[state.status]

  const bgClass = {
    idle: 'bg-surface-container-low',
    running: 'bg-secondary/5',
    done: 'bg-surface-container-low',
    error: 'bg-error/5',
  }[state.status]

  const handleCopy = useCallback(async () => {
    const raw = isText ? String(state.output ?? '') : JSON.stringify(state.output, null, 2)
    await navigator.clipboard.writeText(raw)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [state.output, isText])

  const handleStartEdit = useCallback(() => {
    setEditValue(isText
      ? String(state.editedJson || state.output || '')
      : (state.editedJson || JSON.stringify(state.output, null, 2)))
    setEditError('')
    setEditing(true)
  }, [state.output, state.editedJson, isText])

  const handleSave = useCallback(() => {
    if (!isText) {
      try { JSON.parse(editValue) } catch {
        setEditError('Invalid JSON — fix before saving')
        return
      }
    }
    onSaveEdit(editValue)
    setEditing(false)
    setEditError('')
  }, [editValue, isText, onSaveEdit])

  return (
    <motion.div
      layout
      className={`rounded-lg border ${borderClass} ${bgClass} p-5 space-y-4 transition-colors duration-300`}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-surface-container-highest">
            <span className="font-mono text-[11px] font-bold text-on-surface-variant">{stageNum}</span>
          </div>
          <div className="min-w-0">
            <p className="font-headline font-semibold text-sm text-on-surface leading-tight">
              Stage {stageNum} · {name}
            </p>
            <p className="font-mono text-[10px] text-on-surface-variant">{model}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={state.status} />
          {state.ms > 0 && (
            <span className="font-mono text-[11px] text-on-surface-variant">
              {(state.ms / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {state.status === 'error' && state.error && (
        <div className="rounded border border-error/20 bg-error/5 px-4 py-3">
          <p className="text-xs text-error font-mono break-all">{state.error}</p>
        </div>
      )}

      {/* ── Output ── */}
      {hasOutput && !editing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
              Output
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expanded ? 'Collapse' : 'Expand'}
              </button>
            </div>
          </div>
          <OutputDisplay output={state.output} isText={isText} expanded={expanded} />
        </div>
      )}

      {/* ── Edit mode ── */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="space-y-2"
          >
            <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
              Edit Output
            </span>
            <div className="overflow-hidden rounded border border-outline-variant/30 focus-within:border-primary/40 transition-colors">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full bg-surface-container-highest px-4 py-3 font-mono text-[11px] text-on-surface focus:outline-none resize-none [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-outline-variant/30 hover:[&::-webkit-scrollbar-thumb]:bg-outline-variant/60"
                rows={12}
                spellCheck={false}
              />
            </div>
            {editError && <p className="text-xs text-error font-mono">{editError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="rounded bg-primary/10 border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
              >
                Save &amp; Lock
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setEditError('') }}
                className="rounded border border-outline-variant/30 bg-surface-container px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Action row ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {hasOutput && (
          <button
            type="button"
            onClick={onToggleLock}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              state.locked
                ? 'border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/20 rounded'
                : 'border-outline-variant/30 bg-surface-container text-on-surface-variant hover:text-on-surface rounded'
            }`}
          >
            {state.locked ? <><Lock className="h-3 w-3" /> Locked</> : <><LockOpen className="h-3 w-3" /> Lock</>}
          </button>
        )}

        {hasOutput && !editing && (
          <button
            type="button"
            onClick={handleStartEdit}
            disabled={isAnyRunning}
            className="flex items-center gap-1.5 rounded border border-outline-variant/30 bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
        )}

        <button
          type="button"
          onClick={onRun}
          disabled={isAnyRunning}
          className="flex items-center gap-1.5 rounded border border-outline-variant/30 bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play className="h-3 w-3" /> Re-run
        </button>

        {stageNum === 5 && state.status === 'done' && onOpenInStudio && (
          <button
            type="button"
            onClick={onOpenInStudio}
            className="ml-auto flex items-center gap-1.5 rounded bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
          >
            Open in Scene Studio →
          </button>
        )}
      </div>

      {/* ── Provide inputs panel ── */}
      <ProvideInputsPanel
        stageNum={stageNum}
        upstreamValues={upstreamValues}
        isAnyRunning={isAnyRunning}
        onSetInput={onSetInput}
        onRun={onRun}
      />
    </motion.div>
  )
}
