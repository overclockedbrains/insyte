'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { useBoundStore } from '@/src/stores/store'
import type { DetectedMode } from '@/src/stores/slices/detection-slice'

// ─── Hardcoded popular topics ─────────────────────────────────────────────────
// The 5 most visually impressive pre-built simulations.

interface Chip {
  label: string
  query: string
  mode: DetectedMode
}

const POPULAR_CHIPS: Chip[] = [
  { label: 'Hash Tables', query: 'How does a hash table work?', mode: 'concept' },
  { label: 'DNS Resolution', query: 'How does DNS resolution work?', mode: 'concept' },
  { label: 'Two Sum', query: 'Two Sum problem', mode: 'dsa' },
  { label: 'LRU Cache', query: 'Design an LRU Cache', mode: 'lld' },
  { label: 'Twitter Feed', query: 'Design a Twitter feed system', mode: 'hld' },
]

// ─── PopularChips ─────────────────────────────────────────────────────────────

interface PopularChipsProps {
  /** Ref to the UnifiedInput fill function so chips can fill the textarea */
  fillInputRef?: React.MutableRefObject<((text: string) => void) | null>
}

export function PopularChips({ fillInputRef }: PopularChipsProps) {
  const setInput = useBoundStore((s) => s.setInput)
  const setMode = useBoundStore((s) => s.setMode)

  const handleChip = useCallback(
    (chip: Chip) => {
      setInput(chip.query)
      setMode(chip.mode)
      fillInputRef?.current?.(chip.query)
    },
    [setInput, setMode, fillInputRef],
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-on-surface-variant/60 font-medium shrink-0">
        Popular:
      </span>
      {POPULAR_CHIPS.map((chip, i) => (
        <motion.button
          key={chip.label}
          onClick={() => handleChip(chip)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.2 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-full border border-outline-variant/30 px-4 py-1.5 text-sm text-on-surface-variant hover:border-primary/40 hover:text-on-surface hover:bg-primary/5 transition-all duration-150 cursor-pointer"
        >
          {chip.label}
        </motion.button>
      ))}
    </div>
  )
}
