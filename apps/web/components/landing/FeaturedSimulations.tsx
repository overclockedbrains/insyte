import Link from 'next/link'
import { getFeaturedTopics } from '@/src/content/topic-index'
import { FeaturedSimulationCard } from '@/components/landing/FeaturedSimulationCard'

const FEATURED_SIM_IMAGE_BY_SLUG: Record<string, string> = {
  'hash-tables': '/images/landing/featured_simulations/hash-tables.webp',
  'js-event-loop': '/images/landing/featured_simulations/js-event-loop.webp',
  'dns-resolution': '/images/landing/featured_simulations/dns-resolution.webp',
  'twitter-feed': '/images/landing/featured_simulations/twitter-feed.webp',
}

const FEATURED_SIM_FALLBACK_IMAGE = '/images/fallback_simulation.webp'

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

      {/* Full-width featured grid; local card-width overrides prevent /explore regression */}
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((topic) => (
          <FeaturedSimulationCard
            key={topic.slug}
            topic={topic}
            imageSrc={FEATURED_SIM_IMAGE_BY_SLUG[topic.slug] ?? FEATURED_SIM_FALLBACK_IMAGE}
          />
        ))}
      </div>
    </section>
  )
}
