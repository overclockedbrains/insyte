'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Scene } from '@insyte/scene-engine'
import { useBoundStore } from '@/src/stores/store'
import { CodePanel } from '../annotations/CodePanel'
import { ExplanationPanel } from '../annotations/ExplanationPanel'
import { CanvasCard } from './CanvasCard'
import { usePlayback } from '../hooks/usePlayback'

// ─── CodeLeftCanvasRight ──────────────────────────────────────────────────────
// Desktop: code panel 35% left, canvas 65% right (same split as text-left).
// Mobile (<md): tabs — "Code" | "Visual" — switch between panels with FM animation.
// Expand mode: code panel slides out (width → 0), canvas fills.

interface Props {
  scene: Scene
  onRerunWithCustomInput?: (() => void) | null
}

export function CodeLeftCanvasRight({ scene, onRerunWithCustomInput = null }: Props) {
  const isExpanded = useBoundStore((s) => s.isExpanded)
  const { currentStep } = usePlayback()
  const [mobileTab, setMobileTab] = useState<'code' | 'visual'>('visual')

  return (
    <div className="flex flex-col md:flex-row h-full w-full min-h-0">

      {/* ─── Desktop: side-by-side panels ─── */}
      <div className="hidden md:flex flex-row w-full h-full min-h-0">
        {/* Left: code panel */}
        <AnimatePresence initial={false}>
          {!isExpanded && (
            <motion.div
              key="code-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '35%', opacity: 1 }}
              exit={{ width: 0, opacity: 0, overflow: 'hidden' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="flex-shrink-0 overflow-hidden border-r border-outline-variant/20 min-h-0"
            >
              <div className="h-full flex flex-col min-h-0">
                {/* Code — fixed portion, scrolls horizontally only */}
                {scene.code && (
                  <div className="flex-shrink-0 max-h-[45%] overflow-y-auto border-b border-outline-variant/20 custom-scrollbar">
                    <CodePanel code={scene.code} currentStep={currentStep} />
                  </div>
                )}
                {/* Explanation — takes remaining space, scrolls independently */}
                {scene.explanation && scene.explanation.length > 0 && (
                  <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    <ExplanationPanel sections={scene.explanation} currentStep={currentStep} />
                  </div>
                )}
                {!scene.code && (!scene.explanation || scene.explanation.length === 0) && (
                  <div className="flex items-center justify-center h-full p-6 text-sm text-on-surface-variant">
                    No content for this scene.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right: canvas */}
        <motion.div layout className="flex-1 min-w-0 min-h-0 flex flex-col p-4">
          <CanvasCard scene={scene} onRerunWithCustomInput={onRerunWithCustomInput} />
        </motion.div>
      </div>

      {/* ─── Mobile: tabbed interface ─── */}
      <div className="flex md:hidden flex-col w-full h-full min-h-0">
        {/* Tab bar */}
        <div className="flex-shrink-0 px-4 pt-3 pb-0 border-b border-outline-variant/20">
          <div className="flex gap-1 p-0.5 bg-surface-container-lowest rounded-xl border border-outline-variant/20 w-fit">
            {(['visual', 'code'] as const).map((tab) => {
              const isActive = mobileTab === tab
              return (
                <motion.button
                  key={tab}
                  type="button"
                  onClick={() => setMobileTab(tab)}
                  className={[
                    'relative px-4 py-1.5 rounded-lg text-xs font-bold transition-colors duration-150 cursor-pointer capitalize',
                    isActive ? 'text-on-secondary' : 'text-on-surface-variant hover:text-on-surface',
                  ].join(' ')}
                >
                  {isActive && (
                    <motion.span
                      layoutId="mobile-tab-pill"
                      className="absolute inset-0 rounded-lg bg-secondary"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{tab}</span>
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 relative">
          <AnimatePresence mode="wait">
            {mobileTab === 'visual' && (
              <motion.div
                key="visual-tab"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex flex-col p-3"
              >
                <CanvasCard scene={scene} onRerunWithCustomInput={onRerunWithCustomInput} />
              </motion.div>
            )}
            {mobileTab === 'code' && (
              <motion.div
                key="code-tab"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 overflow-y-auto custom-scrollbar"
              >
                {scene.code ? (
                  <div className="h-full flex flex-col min-h-0">
                    <div className="flex-shrink-0 border-b border-outline-variant/20">
                      <CodePanel code={scene.code} currentStep={currentStep} />
                    </div>
                    {scene.explanation && scene.explanation.length > 0 && (
                      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                        <ExplanationPanel sections={scene.explanation} currentStep={currentStep} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full p-6">
                    <p className="text-sm text-on-surface-variant">No code attached to this scene.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
