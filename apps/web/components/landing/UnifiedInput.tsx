'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useBoundStore } from '@/src/stores/store'
import { detectMode } from '@/src/stores/slices/detection-slice'
import { generateSlug } from '@/src/lib/slug'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

// ─── Mode label ────────────────────────────────────────────────────────────────

import type { DetectedMode } from '@/src/stores/slices/detection-slice'

const MODE_LABEL: Record<NonNullable<DetectedMode>, string> = {
  concept: '✦ Concept Mode',
  dsa: '⟨/⟩ DSA Trace Mode',
  lld: '⚙ LLD Mode',
  hld: '🏗 System Design Mode',
}

const MODE_COLOR: Record<NonNullable<DetectedMode>, string> = {
  concept: 'text-primary',
  dsa: 'text-secondary',
  lld: 'text-on-surface-variant',
  hld: 'text-tertiary',
}

// ─── UnifiedInput ─────────────────────────────────────────────────────────────

interface UnifiedInputProps {
  /** Exposes the fill function so parent can wire popular chips */
  fillRef?: React.RefObject<((text: string) => void) | null>
}

export function UnifiedInput({ fillRef }: UnifiedInputProps) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [showDSADialog, setShowDSADialog] = useState(false)

  const setInput = useBoundStore((s) => s.setInput)
  const setMode = useBoundStore((s) => s.setMode)
  const inputText = useBoundStore((s) => s.inputText)
  const detectedMode = useBoundStore((s) => s.detectedMode)
  const confirmDSA = useBoundStore((s) => s.confirmDSA)
  const cancelDSA = useBoundStore((s) => s.cancelDSA)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setInput(val)
      const mode = detectMode(val)
      setMode(mode)
    },
    [setInput, setMode],
  )

  // Navigate to the generated scene URL and begin streaming
  const navigateToScene = useCallback(
    (topic: string) => {
      const slug = generateSlug(topic)
      router.push(`/s/${slug}?topic=${encodeURIComponent(topic)}`)
    },
    [router],
  )

  const handleSubmit = useCallback(() => {
    const topic = inputText.trim()
    if (!topic) return

    if (detectedMode === 'dsa') {
      // Show confirmation dialog for DSA mode
      setShowDSADialog(true)
    } else {
      navigateToScene(topic)
    }
  }, [inputText, detectedMode, navigateToScene])

  const handleDSAConfirm = useCallback(() => {
    confirmDSA()
    setShowDSADialog(false)
    // DSA pipeline — Phase 9 wires the full trace, for now treat as concept
    navigateToScene(inputText.trim())
  }, [confirmDSA, navigateToScene, inputText])

  const handleDSACancel = useCallback(() => {
    cancelDSA()
    setShowDSADialog(false)
    // Re-detected as concept — navigate directly
    navigateToScene(inputText.trim())
  }, [cancelDSA, navigateToScene, inputText])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  // Expose fill function so PopularChips can fill the textarea
  const fill = useCallback(
    (text: string) => {
      setInput(text)
      setMode(detectMode(text))
      textareaRef.current?.focus()
    },
    [setInput, setMode],
  )

  useEffect(() => {
    if (fillRef) {
      fillRef.current = fill
    }
  }, [fillRef, fill])

  // Extract language hint from code for the DSA dialog
  const detectedLanguage = (() => {
    if (!inputText) return null
    if (/\bdef |\bimport |\bprint\s*\(/.test(inputText)) return 'Python'
    if (/\bfunction\b|\bconst\b|\bvar\b|\blet\b/.test(inputText)) return 'JavaScript'
    if (/\bpublic\b.*\bclass\b|\bSystem\.out/.test(inputText)) return 'Java'
    return 'code'
  })()

  return (
    <>
      <div className="flex flex-col gap-3 w-full">
        {/* Textarea container */}
        <motion.div
          animate={{
            boxShadow: isFocused
              ? '0 0 0 1px rgba(58,223,250,0.3), 0 0 20px rgba(183,159,255,0.12)'
              : '0 0 0 1px rgba(72,71,77,0.5)',
          }}
          transition={{ duration: 0.2 }}
          className="relative rounded-2xl overflow-hidden"
        >
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="How does a hash table work? Or paste your LeetCode solution..."
            rows={isFocused ? 4 : 2}
            className="w-full bg-surface-container-low border border-outline-variant/40 rounded-2xl px-5 py-4 font-body text-sm text-on-surface placeholder:text-on-surface-variant/60 resize-none outline-none transition-all duration-200 leading-relaxed"
            style={{ minHeight: isFocused ? '6rem' : '3.25rem' }}
            aria-label="Describe what you want to visualize"
          />
        </motion.div>

        {/* Bottom row: mode label + submit */}
        <div className="flex items-center justify-between gap-3 min-h-[2.25rem]">
          {/* Mode detection label */}
          <AnimatePresence mode="wait">
            {detectedMode && (
              <motion.span
                key={detectedMode}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className={`text-xs font-semibold tracking-wide ${MODE_COLOR[detectedMode]}`}
              >
                {MODE_LABEL[detectedMode]}
              </motion.span>
            )}
            {!detectedMode && (
              <motion.span
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-on-surface-variant/50"
              >
                Type to start...
              </motion.span>
            )}
          </AnimatePresence>

          {/* Submit button */}
          <motion.button
            onClick={handleSubmit}
            disabled={!inputText.trim()}
            whileTap={inputText.trim() ? { scale: 0.96 } : {}}
            className={[
              'shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
              inputText.trim()
                ? 'text-on-primary cursor-pointer hover:opacity-90 active:scale-95'
                : 'opacity-40 cursor-not-allowed text-on-surface-variant bg-surface-container',
            ].join(' ')}
            style={
              inputText.trim()
                ? { background: 'linear-gradient(135deg, #b79fff 0%, #ab8ffe 100%)' }
                : undefined
            }
            aria-label="Explore this concept"
          >
            Explore →
          </motion.button>
        </div>
      </div>

      {/* ── DSA Confirmation Dialog ──────────────────────────────────────── */}
      <Dialog open={showDSADialog} onOpenChange={setShowDSADialog}>
        <DialogContent className="bg-surface-container-low border border-outline-variant/40 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-on-surface font-headline text-xl">
              Code detected
            </DialogTitle>
            <DialogDescription className="text-on-surface-variant text-sm leading-relaxed">
              We detected{' '}
              <span className="text-secondary font-semibold">
                {detectedLanguage ?? 'code'}
              </span>{' '}
              in your input. Would you like to visualize it as a step-by-step
              DSA trace, or treat it as a concept?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
            <button
              onClick={handleDSACancel}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:border-outline-variant transition-all duration-200"
            >
              Treat as Concept
            </button>
            <button
              onClick={handleDSAConfirm}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-on-primary hover:opacity-90 transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #3adffa 0%, #1ad0eb 100%)',
              }}
            >
              Visualize →
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
