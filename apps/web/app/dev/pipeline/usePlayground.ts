'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { SceneType } from '@insyte/scene-engine'

// ─── Types ────────────────────────────────────────────────────────────────────

export type StageStatus = 'idle' | 'running' | 'done' | 'error'

export interface StageState {
  status: StageStatus
  /** Raw output from the stage. Stage 0: string (reasoning text). Stages 1–5: parsed JSON object. */
  output: unknown
  locked: boolean
  editedJson: string
  ms: number
  error?: string
}

export const STAGE_NAMES = [
  'Reasoning',
  'Skeleton',
  'Steps',
  'Popups',
  'Challenges',
  'Assembly',
] as const

export const STAGE_MODEL_LABELS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'deterministic',
] as const

const makeInitial = (): StageState => ({
  status: 'idle',
  output: null,
  locked: false,
  editedJson: '',
  ms: 0,
})

// ─── sessionStorage persistence ───────────────────────────────────────────────

const STORAGE_KEY = 'dev:playground-state'

interface PersistedState {
  topic: string
  mode: SceneType | 'auto'
  stages: StageState[]
}

function loadSavedState(): PersistedState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { topic: '', mode: 'auto', stages: Array.from({ length: 6 }, makeInitial) }
    const data = JSON.parse(raw) as Partial<PersistedState>
    const stages = (data.stages ?? []).map((s) =>
      // Reset any in-flight running states — the process died on navigation
      s.status === 'running' ? { ...s, status: 'idle' as StageStatus } : s,
    )
    return {
      topic: data.topic ?? '',
      mode: data.mode ?? 'auto',
      stages: stages.length === 6 ? stages : Array.from({ length: 6 }, makeInitial),
    }
  } catch {
    return { topic: '', mode: 'auto', stages: Array.from({ length: 6 }, makeInitial) }
  }
}

// ─── usePlayground ────────────────────────────────────────────────────────────

export function usePlayground() {
  // Start with server-safe defaults so SSR and initial client render match.
  // Restore from sessionStorage in a useEffect after hydration.
  const [hydrated, setHydrated] = useState(false)
  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState<SceneType | 'auto'>('auto')
  const [stages, setStages] = useState<StageState[]>(() => Array.from({ length: 6 }, makeInitial))

  // Refs mirror output/lock/editedJson for stable reads inside async callbacks.
  const outputRefs = useRef<unknown[]>(new Array(6).fill(null))
  const lockedRefs = useRef<boolean[]>(new Array(6).fill(false))
  const editedJsonRefs = useRef<string[]>(new Array(6).fill(''))
  const runningRef = useRef(false)

  // Restore persisted state after hydration (sessionStorage is client-only).
  useEffect(() => {
    const saved = loadSavedState()
    setTopic(saved.topic)
    setMode(saved.mode)
    setStages(saved.stages)
    outputRefs.current = saved.stages.map((s) => s.output)
    lockedRefs.current = saved.stages.map((s) => s.locked)
    editedJsonRefs.current = saved.stages.map((s) => s.editedJson)
    setHydrated(true)
  }, [])

  // Persist state to sessionStorage whenever it changes.
  // Gated on hydrated so the initial render's empty defaults never overwrite saved data.
  useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ topic, mode, stages }))
    } catch { /* ignore quota errors */ }
  }, [hydrated, topic, mode, stages])

  // ── Internal helpers ────────────────────────────────────────────────────────

  const patchStage = useCallback((n: number, patch: Partial<StageState>) => {
    if ('output' in patch) outputRefs.current[n] = patch.output
    if ('locked' in patch) lockedRefs.current[n] = patch.locked!
    if ('editedJson' in patch) editedJsonRefs.current[n] = patch.editedJson!
    setStages((prev) => {
      const next = [...prev]
      next[n] = { ...(next[n] ?? makeInitial()), ...patch } as StageState
      return next
    })
  }, [])

  /** Returns the effective output for a stage (locked/edited beats raw output). */
  const getEffectiveOutput = useCallback((n: number): unknown => {
    if (lockedRefs.current[n] && editedJsonRefs.current[n]) {
      try {
        return n === 0 ? editedJsonRefs.current[n] : JSON.parse(editedJsonRefs.current[n])
      } catch { /* fall through */ }
    }
    return outputRefs.current[n]
  }, [])

  /** Runs one stage. Returns true on success, false on error. */
  const runSingleStage = useCallback(
    async (n: number, topicVal: string, modeVal: SceneType | 'auto'): Promise<boolean> => {
      patchStage(n, { status: 'running', error: undefined })
      const start = Date.now()

      const inputs: Record<string, unknown> = {}
      if (n >= 1) inputs.reasoning = getEffectiveOutput(0)
      if (n >= 2) inputs.skeleton = getEffectiveOutput(1)
      if (n >= 3) inputs.steps = getEffectiveOutput(2)
      if (n >= 4) inputs.popups = getEffectiveOutput(3)
      if (n >= 5) inputs.misc = getEffectiveOutput(4)

      const body = {
        stage: n,
        topic: topicVal,
        mode: modeVal === 'auto' ? undefined : modeVal,
        inputs,
      }

      try {
        if (n === 0) {
          const res = await fetch('/api/dev/pipeline-stage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          let fullText = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n\n')
            buffer = lines.pop() ?? ''
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              try {
                const evt = JSON.parse(line.slice(6)) as {
                  type: 'chunk' | 'done' | 'error'
                  text?: string
                  message?: string
                }
                if (evt.type === 'chunk') {
                  fullText += evt.text ?? ''
                  patchStage(0, { output: fullText })
                } else if (evt.type === 'done') {
                  fullText = evt.text ?? fullText
                } else if (evt.type === 'error') {
                  throw new Error(evt.message)
                }
              } catch (parseErr) {
                if ((parseErr as Error).message !== 'Unexpected token') throw parseErr
              }
            }
          }

          patchStage(0, {
            status: 'done',
            output: fullText,
            editedJson: fullText,
            ms: Date.now() - start,
          })
          return true
        }

        const res = await fetch('/api/dev/pipeline-stage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json() as {
          ok: boolean
          data?: unknown
          error?: string
          cause?: string
          rawText?: string
        }
        if (!json.ok) {
          const parts = [json.error ?? 'Unknown error']
          if (json.cause) parts.push(`Cause: ${json.cause}`)
          if (json.rawText) parts.push(`Raw output:\n${json.rawText}`)
          throw new Error(parts.join('\n\n'))
        }

        patchStage(n, {
          status: 'done',
          output: json.data,
          editedJson: JSON.stringify(json.data, null, 2),
          ms: Date.now() - start,
        })
        return true
      } catch (err) {
        patchStage(n, { status: 'error', error: String(err), ms: Date.now() - start })
        return false
      }
    },
    [patchStage, getEffectiveOutput],
  )

  // ── Public actions ──────────────────────────────────────────────────────────

  const runAll = useCallback(async () => {
    if (runningRef.current) return
    runningRef.current = true
    outputRefs.current = new Array(6).fill(null)
    lockedRefs.current = new Array(6).fill(false)
    editedJsonRefs.current = new Array(6).fill('')
    setStages(Array.from({ length: 6 }, makeInitial))
    const t = topic
    const m = mode
    for (let n = 0; n < 6; n++) {
      const ok = await runSingleStage(n, t, m)
      if (!ok) break
    }
    runningRef.current = false
  }, [topic, mode, runSingleStage])

  const runFromLocked = useCallback(async () => {
    if (runningRef.current) return
    runningRef.current = true
    const firstUnlocked = lockedRefs.current.findIndex((l) => !l)
    if (firstUnlocked === -1) {
      runningRef.current = false
      return
    }
    setStages((prev) => {
      const next = [...prev]
      for (let i = firstUnlocked; i < 6; i++) {
        next[i] = makeInitial()
        outputRefs.current[i] = null
      }
      return next
    })
    const t = topic
    const m = mode
    for (let n = firstUnlocked; n < 6; n++) {
      const ok = await runSingleStage(n, t, m)
      if (!ok) break
    }
    runningRef.current = false
  }, [topic, mode, runSingleStage])

  const runStage = useCallback(
    (n: number) => runSingleStage(n, topic, mode),
    [topic, mode, runSingleStage],
  )

  const toggleLock = useCallback(
    (n: number) => {
      const wasLocked = lockedRefs.current[n]
      if (!wasLocked) {
        const raw = outputRefs.current[n]
        const editedJson = n === 0 ? String(raw ?? '') : JSON.stringify(raw, null, 2)
        patchStage(n, { locked: true, editedJson })
      } else {
        patchStage(n, { locked: false })
      }
    },
    [patchStage],
  )

  const saveEdit = useCallback(
    (n: number, json: string) => {
      if (n > 0) {
        try { JSON.parse(json) } catch { return }
      }
      patchStage(n, { editedJson: json, locked: true })
    },
    [patchStage],
  )

  const resetAll = useCallback(() => {
    setStages(Array.from({ length: 6 }, makeInitial))
    outputRefs.current = new Array(6).fill(null)
    lockedRefs.current = new Array(6).fill(false)
    editedJsonRefs.current = new Array(6).fill('')
    runningRef.current = false
    try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }, [])

  const isAnyRunning = stages.some((s) => s.status === 'running')

  return {
    topic,
    setTopic,
    mode,
    setMode,
    stages,
    isAnyRunning,
    runAll,
    runFromLocked,
    runStage,
    toggleLock,
    saveEdit,
    resetAll,
  }
}
