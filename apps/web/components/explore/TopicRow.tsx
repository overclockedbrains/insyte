'use client'

import Link from 'next/link'
import { useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TopicEntry } from '@/src/content/topic-index'
import { TopicCard } from './TopicCard'

// ─── TopicRow ─────────────────────────────────────────────────────────────────

interface TopicRowProps {
  title: string
  topics: TopicEntry[]
  seeAllHref?: string
}

export function TopicRow({ title, topics, seeAllHref }: TopicRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [isHovered, setIsHovered] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  const scrollBy = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = 280 // ~1.2 cards
    el.scrollBy({ left: direction === 'right' ? amount : -amount, behavior: 'smooth' })
  }, [])

  if (topics.length === 0) return null

  return (
    <section
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Row header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold font-headline text-on-surface">{title}</h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-sm text-on-surface-variant hover:text-primary transition-colors duration-150"
          >
            See all →
          </Link>
        )}
      </div>

      {/* Scroll container */}
      <div className="relative">
        {/* Left arrow */}
        <AnimatePresence>
          {isHovered && canScrollLeft && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => scrollBy('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 -ml-4 h-9 w-9 rounded-full bg-surface-container-highest border border-outline-variant/30 flex items-center justify-center text-on-surface shadow-lg hover:border-primary/30 hover:text-primary transition-colors duration-150 cursor-pointer"
              aria-label="Scroll left"
            >
              ‹
            </motion.button>
          )}
        </AnimatePresence>

        {/* Scrollable cards */}
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {topics.map((topic, i) => (
            <motion.div
              key={topic.slug}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
            >
              <TopicCard topic={topic} />
            </motion.div>
          ))}
        </div>

        {/* Right arrow */}
        <AnimatePresence>
          {isHovered && canScrollRight && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => scrollBy('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 -mr-4 h-9 w-9 rounded-full bg-surface-container-highest border border-outline-variant/30 flex items-center justify-center text-on-surface shadow-lg hover:border-primary/30 hover:text-primary transition-colors duration-150 cursor-pointer"
              aria-label="Scroll right"
            >
              ›
            </motion.button>
          )}
        </AnimatePresence>

        {/* Right fade-out gradient */}
        {canScrollRight && (
          <div className="absolute top-0 right-0 h-full w-16 pointer-events-none bg-gradient-to-l from-background to-transparent" />
        )}
      </div>
    </section>
  )
}
