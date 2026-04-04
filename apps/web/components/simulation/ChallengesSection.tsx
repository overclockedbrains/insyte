'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import type { Challenge } from '@insyte/scene-engine'
import { ChallengeCard } from './ChallengeCard'

// ─── ChallengesSection ────────────────────────────────────────────────────────
// Collapsible section below the canvas.
// Desktop: open by default, horizontal scroll row of challenge cards.
// Mobile: closed by default, vertical stacked cards on expand.

interface ChallengesSectionProps {
  challenges: Challenge[]
  onTryChallenge?: (id: string) => void
}

export function ChallengesSection({ challenges, onTryChallenge }: ChallengesSectionProps) {
  // Start collapsed on SSR; open on desktop after mount.
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.innerWidth >= 768) setIsOpen(true)
  }, [])

  if (!challenges || challenges.length === 0) return null

  return (
    <section className="border-t border-outline-variant/20 bg-surface-container-low/40">
      {/* ── Section header ── */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={[
          'w-full flex items-center justify-between px-6 py-4',
          'text-left cursor-pointer',
          'hover:bg-surface-container-high/30 transition-colors duration-150',
          'group',
        ].join(' ')}
        aria-expanded={isOpen}
        aria-controls="challenges-content"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-on-surface font-headline">
            Challenges
          </span>
          <span className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/15">
            {challenges.length}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <ChevronDown className="h-4 w-4 text-on-surface-variant group-hover:text-on-surface transition-colors duration-150" />
        </motion.div>
      </button>

      {/* ── Collapsible content ── */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id="challenges-content"
            key="challenges-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="overflow-hidden"
          >
            {/* Desktop: horizontal scroll row */}
            <div className="hidden md:flex gap-4 px-6 pb-6 overflow-x-auto scrollbar-thin">
              {challenges.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  onTry={onTryChallenge}
                />
              ))}
            </div>

            {/* Mobile: vertical stack */}
            <div className="flex md:hidden flex-col gap-3 px-4 pb-6">
              {challenges.map((challenge) => (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="w-full"
                >
                  <ChallengeCard
                    challenge={challenge}
                    onTry={onTryChallenge}
                    className="w-full min-w-0 max-w-none"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
