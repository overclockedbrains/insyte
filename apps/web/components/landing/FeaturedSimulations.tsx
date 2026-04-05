import Link from 'next/link'
import { getFeaturedTopics } from '@/src/content/topic-index'
import { TopicCard } from '@/components/explore/TopicCard'

// ─── FeaturedSimulations ──────────────────────────────────────────────────────
// Server Component — uses static topic-index, no data fetching.
// Shows a 2×2 grid of featured simulations with a "See all →" link.

export function FeaturedSimulations() {
  const featured = getFeaturedTopics().slice(0, 4)

  return (
    <section className="w-full">
      {/* Heading row */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-headline font-bold text-on-surface">
          Featured Simulations
        </h2>
        <Link
          href="/explore"
          className="text-sm text-on-surface-variant hover:text-primary transition-colors duration-150"
        >
          See all →
        </Link>
      </div>

      {/* 2×2 grid — wraps to 1-col on mobile, 2-col on sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {featured.map((topic) => (
          <TopicCard key={topic.slug} topic={topic} />
        ))}
      </div>
    </section>
  )
}
