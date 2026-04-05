'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useBoundStore } from '@/src/stores/store'
import type { DetectedMode } from '@/src/stores/slices/detection-slice'

// ─── Client-side mode detection ───────────────────────────────────────────────

function detectMode(text: string): DetectedMode {
  if (!text.trim()) return null

  // Code detection: code fences or common language keywords
  if (
    /```[\s\S]/.test(text) ||
    /\bdef |class [A-Z]|\bfunction\b|\bconst\b|\blet\b|\bvar\b|=>/.test(text) ||
    /\bfor\s*\(|while\s*\(|if\s*\(/.test(text)
  ) {
    return 'dsa'
  }

  // LLD patterns
  if (
    /\b(lru[\s-]cache|rate[\s-]limiter|min[\s-]stack|trie|design[\s-]hashmap|implement\s+a|implement\s+the)\b/i.test(
      text,
    )
  ) {
    return 'lld'
  }

  // HLD patterns
  if (
    /\b(design\s+a|design\s+an|design\s+the|system\s+design|url[\s-]shortener|twitter|chat\s+system|consistent\s+hashing|architecture)\b/i.test(
      text,
    )
  ) {
    return 'hld'
  }

  // Default: concept simulation
  return 'concept'
}

// ─── Mode label ────────────────────────────────────────────────────────────────

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
  /** Called when user selects a popular chip — fills the textarea */
  onChipFill?: (text: string) => void
  /** Exposes the fill function so parent can wire popular chips */
  fillRef?: React.MutableRefObject<((text: string) => void) | null>
}

export function UnifiedInput({ fillRef }: UnifiedInputProps) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  const setInput = useBoundStore((s) => s.setInput)
  const setMode = useBoundStore((s) => s.setMode)
  const inputText = useBoundStore((s) => s.inputText)
  const detectedMode = useBoundStore((s) => s.detectedMode)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setInput(val)
      const mode = detectMode(val)
      setMode(mode)
    },
    [setInput, setMode],
  )

  const handleSubmit = useCallback(() => {
    if (!inputText.trim()) return
    // Phase 7 will wire AI generation; for now navigate to /explore as fallback
    router.push('/explore')
  }, [inputText, router])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl/Cmd + Enter to submit
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

  return (
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
  )
}
