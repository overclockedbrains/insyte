import Link from 'next/link'
import type { TopicEntry } from '@/src/content/topic-index'
import { TopicCard } from './TopicCard'

interface TopicRowProps {
  title: string
  topics: TopicEntry[]
  seeAllHref?: string
  seeAllLabel?: string
  layout?: 'carousel' | 'grid'
}

function RowCards({ topics }: { topics: TopicEntry[] }) {
  return (
    <>
      {topics.map((topic, index) => (
        <div
          key={topic.slug}
          className="shrink-0 insyte-card-enter"
          style={{
            animationDelay: `${Math.min(index * 24, 180)}ms`,
          }}
        >
          <TopicCard topic={topic} />
        </div>
      ))}
    </>
  )
}

export function TopicRow({
  title,
  topics,
  seeAllHref,
  seeAllLabel = 'See all ->',
  layout = 'carousel',
}: TopicRowProps) {
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
            {seeAllLabel}
          </Link>
        )}
      </div>

      {layout === 'grid' ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] [&>div]:min-w-0 [&>div>a]:w-full [&>div>a]:min-w-0 [&>div>a]:lg:w-full [&>div>a]:lg:min-w-0">
          <RowCards topics={topics} />
        </div>
      ) : (
        <>
          <div
            className="flex md:hidden overflow-x-auto px-2 py-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex gap-4 px-1">
              <RowCards topics={topics} />
            </div>
          </div>

          <div className="hidden md:grid lg:hidden grid-cols-2 gap-4">
            <RowCards topics={topics} />
          </div>

          <div
            className="hidden lg:flex overflow-x-auto px-2 py-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex gap-4 px-1">
              <RowCards topics={topics} />
            </div>
          </div>
        </>
      )}
    </section>
  )
}
