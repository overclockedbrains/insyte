import type { Metadata } from 'next'
import { GlowEffect } from '@/components/layout/GlowEffect'
import { SearchBar } from '@/components/explore/SearchBar'
import { TopicRow } from '@/components/explore/TopicRow'
import {
  getFeaturedTopics,
  getTopicsByCategory,
} from '@/src/content/topic-index'

export const metadata: Metadata = {
  title: 'Explore — insyte',
  description:
    'Browse 24 interactive simulations covering Data Structures, System Design, Networking, and more.',
}

// ─── Explore page (Gallery) ───────────────────────────────────────────────────
// Server Component — rows are built from static topic-index (no data fetching).

export default function ExplorePage() {
  const featured = getFeaturedTopics()
  const dsa = getTopicsByCategory('Data Structures & Algorithms')
  const systemDesign = getTopicsByCategory('System Design')
  const lld = getTopicsByCategory('Low Level Design')
  const networking = getTopicsByCategory('Networking')
  const concepts = getTopicsByCategory('Concepts')

  // Networking + Concepts combined into one row
  const networkingAndConcepts = [...networking, ...concepts]

  return (
    <div className="relative min-h-screen">
      {/* Ambient background */}
      <GlowEffect intensity="subtle" className="fixed" />

      <div className="relative z-10 mx-auto max-w-screen-xl px-4 sm:px-6 py-10 flex flex-col gap-12">
        {/* ── Page header ───────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <h1 className="font-headline font-extrabold text-4xl sm:text-5xl text-on-surface">
            Explore Simulations
          </h1>
          <p className="text-base text-on-surface-variant max-w-lg">
            24 hand-crafted interactive simulations. Play with the code, watch the
            algorithm, master the concept.
          </p>

          {/* Search bar */}
          <div className="mt-2">
            <SearchBar />
          </div>
        </div>

        {/* ── Topic rows ─────────────────────────────────────────────────────── */}

        {featured.length > 0 && (
          <TopicRow title="Featured" topics={featured} seeAllHref="/explore" />
        )}

        {dsa.length > 0 && (
          <TopicRow
            title="Data Structures & Algorithms"
            topics={dsa}
            seeAllHref="/explore"
          />
        )}

        {systemDesign.length > 0 && (
          <TopicRow
            title="System Design"
            topics={systemDesign}
            seeAllHref="/explore"
          />
        )}

        {lld.length > 0 && (
          <TopicRow
            title="Low Level Design"
            topics={lld}
            seeAllHref="/explore"
          />
        )}

        {networkingAndConcepts.length > 0 && (
          <TopicRow
            title="Networking & Concepts"
            topics={networkingAndConcepts}
            seeAllHref="/explore"
          />
        )}
      </div>
    </div>
  )
}
