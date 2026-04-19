'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Code2, X, Play, AlertCircle, CheckCircle2, FileCode } from 'lucide-react'
import { safeParseScene } from '@insyte/scene-engine'
import type { Scene } from '@insyte/scene-engine'
import { useBoundStore } from '@/src/stores/store'
import { SimulationLayout } from '@/src/engine/SimulationLayout'

// ─── Live scene renderer (mirrors ScenePageClient StaticScene) ────────────────

function LivePreview({ scene }: { scene: Scene }) {
  const setScene = useBoundStore((s) => s.setScene)
  const clearScene = useBoundStore((s) => s.clearScene)
  const setTotalSteps = useBoundStore((s) => s.setTotalSteps)
  const reset = useBoundStore((s) => s.reset)
  const setExpanded = useBoundStore((s) => s.setExpanded)

  useEffect(() => {
    setScene(scene)
    setTotalSteps(scene.steps.length)
    reset()
    setExpanded(false)
    return () => {
      clearScene()
      setTotalSteps(0)
      reset()
      setExpanded(false)
    }
  }, [scene, setScene, clearScene, setTotalSteps, reset, setExpanded])

  return <SimulationLayout scene={scene} />
}

// ─── Read sessionStorage once (safe for SSR — only runs on client) ────────────

function readSession(): { json: string; openPanel: boolean } {
  try {
    const stored = sessionStorage.getItem('dev:scene-studio')
    if (stored) {
      sessionStorage.removeItem('dev:scene-studio')
      return { json: JSON.stringify(JSON.parse(stored), null, 2), openPanel: true }
    }
  } catch { /* ignore */ }
  return { json: '', openPanel: false }
}

// ─── SceneStudio ──────────────────────────────────────────────────────────────

export function SceneStudio() {
  const [session] = useState(readSession)
  const [json, setJson] = useState(session.json)
  const [panelOpen, setPanelOpen] = useState(session.openPanel)
  const [parsedScene, setParsedScene] = useState<Scene | null>(null)
  const [parseErrors, setParseErrors] = useState<string[]>([])

  const handleRender = useCallback(() => {
    setParseErrors([])
    let raw: unknown
    try {
      raw = JSON.parse(json)
    } catch (err) {
      setParseErrors([`JSON parse error: ${String(err)}`])
      return
    }
    const result = safeParseScene(raw)
    if (!result.success) {
      setParseErrors(result.error.errors.map((e) => `${e.path.join('.') || 'root'}: ${e.message}`))
      return
    }
    setParsedScene(result.scene)
    setPanelOpen(false)
  }, [json])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleRender()
      }
    },
    [handleRender],
  )

  return (
    // Let content flow naturally — footer appears after challenges as expected
    <div className="relative">

      {/* ── Main area: scene or empty state ── */}
      {parsedScene ? (
        <LivePreview scene={parsedScene} />
      ) : (
        <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container-highest">
            <FileCode className="h-7 w-7 text-on-surface-variant/30" />
          </div>
          <div className="space-y-1.5">
            <p className="font-headline font-semibold text-lg text-on-surface">No scene loaded</p>
            <p className="text-sm text-on-surface-variant max-w-xs">
              Open the JSON editor, paste any Scene JSON, and click Render to preview it here.
            </p>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-2 rounded bg-primary/10 border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
          >
            <Code2 className="h-4 w-4" />
            Open JSON Editor
          </motion.button>
        </div>
      )}

      {/* ── Floating toggle button (bottom-right) ── */}
      <AnimatePresence>
        {!panelOpen && (
          <motion.button
            key="toggle"
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setPanelOpen(true)}
            className="fixed bottom-24 right-6 z-40 flex items-center gap-2 rounded-lg glass-panel glow-border px-4 py-3 text-sm font-semibold text-primary shadow-lg cursor-pointer"
          >
            <Code2 className="h-4 w-4" />
            JSON Editor
            {parsedScene && (
              <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Floating JSON editor panel ── */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-20 bottom-20 right-6 z-40 flex w-[560px] max-w-[calc(100vw-3rem)] flex-col glass-panel glow-border rounded-lg shadow-2xl"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20 shrink-0">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                <span className="font-headline font-semibold text-sm text-on-surface">JSON Editor</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-on-surface-variant/50">⌘ + Enter to render</span>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Textarea — scrollable */}
            <div className="flex-1 overflow-hidden p-4 flex flex-col gap-3 min-h-0">
              <div className="flex-1 min-h-0 overflow-hidden rounded border border-outline-variant/30 focus-within:border-primary/40 transition-colors">
                <textarea
                  value={json}
                  onChange={(e) => setJson(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={'{\n  "title": "Paste Scene JSON here",\n  ...\n}'}
                  className="h-full w-full bg-surface-container-highest px-4 py-3 font-mono text-[11px] leading-relaxed text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none resize-none [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-outline-variant/30 hover:[&::-webkit-scrollbar-thumb]:bg-outline-variant/60"
                  spellCheck={false}
                />
              </div>

              {/* Parse errors */}
              <AnimatePresence>
                {parseErrors.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded border border-error/20 bg-error/5 p-3 space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-error shrink-0" />
                      <span className="text-xs font-semibold text-error">
                        {parseErrors.length} error{parseErrors.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {parseErrors.map((e, i) => (
                      <p key={i} className="font-mono text-[10px] text-error/80 break-all">{e}</p>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Valid indicator */}
              <AnimatePresence>
                {parsedScene && parseErrors.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 rounded border border-primary/20 bg-primary/5 px-3 py-2"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">
                      {parsedScene.steps.length} steps · {parsedScene.visuals.length} visuals
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Render button */}
            <div className="shrink-0 px-4 pb-4">
              <motion.button
                type="button"
                onClick={handleRender}
                whileTap={{ scale: 0.97 }}
                disabled={!json.trim()}
                className="flex w-full items-center justify-center gap-2 rounded bg-primary/10 border border-primary/30 py-3 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="h-4 w-4" />
                Render
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
