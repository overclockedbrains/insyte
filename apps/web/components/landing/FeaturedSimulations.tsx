import { getFeaturedTopics } from '@/src/content/topic-index'
import { FeaturedSimulationCard } from '@/components/landing/FeaturedSimulationCard'
import { SectionHeader } from '@/components/landing/SectionHeader'

const FEATURED_SIM_IMAGE_BY_SLUG: Record<string, string> = {
  'hash-tables': '/images/landing/featured_simulations/hash-tables.webp',
  'js-event-loop': '/images/landing/featured_simulations/js-event-loop.webp',
  'dns-resolution': '/images/landing/featured_simulations/dns-resolution.webp',
  'twitter-feed': '/images/landing/featured_simulations/twitter-feed.webp',
}

const FEATURED_SIM_FALLBACK_IMAGE = '/images/fallback_simulation.webp'

export function FeaturedSimulations() {
  const featured = getFeaturedTopics().slice(0, 4)

  return (
    <section className="w-full">
      <SectionHeader
        title="Featured Simulations"
        description="Play popular simulations and jump into the full library when you want more."
        actionLabel="See all"
        actionHref="/explore"
        className="mb-6 sm:mb-8"
      />

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
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
