'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import type { TopicEntry } from '@/src/content/topic-index'
import { TopicCard } from './TopicCard'

interface TopicRowProps {
  title: string
  topics: TopicEntry[]
  seeAllHref?: string
}

function RowCards({ topics }: { topics: TopicEntry[] }) {
  return (
    <>
      {topics.map((topic, index) => (
        <motion.div
          key={topic.slug}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04, duration: 0.2 }}
        >
          <TopicCard topic={topic} />
        </motion.div>
      ))}
    </>
  )
}

export function TopicRow({ title, topics, seeAllHref }: TopicRowProps) {
  if (topics.length === 0) return null

  return (
    <section className="relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold font-headline text-on-surface">{title}</h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-sm text-on-surface-variant hover:text-primary transition-colors duration-150"
          >
            See all {'->'}
          </Link>
        )}
      </div>

      <div
        className="flex md:hidden gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <RowCards topics={topics} />
      </div>

      <div className="hidden md:grid lg:hidden grid-cols-2 gap-4">
        <RowCards topics={topics} />
      </div>

      <div
        className="hidden lg:flex gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <RowCards topics={topics} />
      </div>
    </section>
  )
}
