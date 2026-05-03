'use client'

import { type MutableRefObject, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useBoundStore } from '@/src/stores/store'

interface Chip {
  label: string
  query: string
}

const POPULAR_CHIPS: Chip[] = [
  { label: 'Hash Tables', query: 'How does a hash table work?' },
  { label: 'DNS Resolution', query: 'How does DNS resolution work?' },
  { label: 'Two Sum', query: 'Two Sum problem' },
  { label: 'LRU Cache', query: 'Design an LRU Cache' },
  { label: 'Twitter Feed', query: 'Design a Twitter feed system' },
]

interface PopularChipsProps {
  fillInputRef?: MutableRefObject<((text: string) => void) | null>
}

export function PopularChips({ fillInputRef }: PopularChipsProps) {
  const setInput = useBoundStore((s) => s.setInput)

  const handleChip = useCallback(
    (chip: Chip) => {
      setInput(chip.query)
      fillInputRef?.current?.(chip.query)
    },
    [setInput, fillInputRef],
  )

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <span className="text-xs text-on-surface-variant/60 font-medium shrink-0">
        Popular:
      </span>
      {POPULAR_CHIPS.map((chip, index) => (
        <motion.button
          key={chip.label}
          onClick={() => handleChip(chip)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.2 }}
          whileTap={{ scale: 0.95 }}
          className="shrink-0 rounded-full border border-outline-variant/30 px-4 py-1.5 text-sm text-on-surface-variant hover:border-primary/40 hover:text-on-surface hover:bg-primary/5 transition-all duration-150 cursor-pointer"
        >
          {chip.label}
        </motion.button>
      ))}
    </div>
  )
}
