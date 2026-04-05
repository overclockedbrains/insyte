'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import type { TopicEntry } from '@/src/content/topic-index'

// ─── Type icon map ────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  concept: '⬡',
  'dsa-trace': '⟨/⟩',
  lld: '⚙',
  hld: '🏗',
}

const TYPE_LABEL: Record<string, string> = {
  concept: 'Concept',
  'dsa-trace': 'DSA',
  lld: 'LLD',
  hld: 'HLD',
}

const CATEGORY_COLOR: Record<string, string> = {
  'Data Structures & Algorithms': 'text-primary bg-primary/10',
  'System Design': 'text-secondary bg-secondary/10',
  'Networking': 'text-tertiary bg-tertiary/10',
  'Low Level Design': 'text-on-surface-variant bg-surface-container-high',
  'Concepts': 'text-primary bg-primary/10',
}

// ─── TopicCard ────────────────────────────────────────────────────────────────

interface TopicCardProps {
  topic: TopicEntry
}

export function TopicCard({ topic }: TopicCardProps) {
  const categoryColor = CATEGORY_COLOR[topic.category] ?? 'text-primary bg-primary/10'
  const typeIcon = TYPE_ICON[topic.type] ?? '●'
  const typeLabel = TYPE_LABEL[topic.type] ?? topic.type

  return (
    <Link href={`/s/${topic.slug}`} className="block shrink-0 w-[240px] focus:outline-none">
      <motion.article
        className="rounded-2xl overflow-hidden border border-outline-variant/20 bg-surface-container-low hover:border-primary/30 transition-colors duration-200 cursor-pointer group"
        whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(183,159,255,0.15)' }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        {/* Thumbnail — 16:9 placeholder */}
        <div className="relative w-full aspect-video bg-surface-container-high overflow-hidden">
          {/* Subtle dot grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(183,159,255,0.15) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Simulation type icon — centered */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span
              className="text-3xl leading-none select-none text-on-surface-variant/50 group-hover:text-primary/60 transition-colors duration-200"
              aria-hidden="true"
            >
              {typeIcon}
            </span>
          </div>

          {/* Play button — appears on hover */}
          <motion.div
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-surface-container-highest/90 border border-outline-variant/30 flex items-center justify-center"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="currentColor"
              className="text-on-surface ml-0.5"
            >
              <polygon points="2,1 9,5 2,9" />
            </svg>
          </motion.div>

          {/* Hover overlay — play button */}
          <motion.div
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-surface-container-highest/90 border border-primary/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            aria-hidden="true"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="currentColor"
              className="text-primary ml-0.5"
            >
              <polygon points="2,1 9,5 2,9" />
            </svg>
          </motion.div>
        </div>

        {/* Card body */}
        <div className="p-3 flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-on-surface leading-snug line-clamp-2 font-headline">
            {topic.title}
          </p>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Category badge */}
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${categoryColor}`}
            >
              {topic.category}
            </span>

            {/* Type badge */}
            <span className="text-[10px] font-medium text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant/20">
              {typeLabel}
            </span>
          </div>
        </div>
      </motion.article>
    </Link>
  )
}
