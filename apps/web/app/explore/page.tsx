import type { Metadata } from 'next'
import { GlowEffect } from '@/components/layout/GlowEffect'
import { SearchBar } from '@/components/explore/SearchBar'
import { TopicRow } from '@/components/explore/TopicRow'
import { getFeaturedTopics, getTopicsByCategory } from '@/src/content/topic-index'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Explore - insyte',
  description:
    'Browse 24 interactive simulations covering Data Structures, System Design, Networking, and more.',
}

type ExploreSearchParams = {
  row?: string | string[]
}

type ExplorePageProps = {
  searchParams?: Promise<ExploreSearchParams>
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const resolvedSearchParams = await searchParams
  const activeRow = Array.isArray(resolvedSearchParams?.row)
    ? resolvedSearchParams.row[0]
    : resolvedSearchParams?.row

  const featured = getFeaturedTopics()
  const dsa = getTopicsByCategory('Data Structures & Algorithms')
  const systemDesign = getTopicsByCategory('System Design')
  const lld = getTopicsByCategory('Low Level Design')
  const networking = getTopicsByCategory('Networking')
  const concepts = getTopicsByCategory('Concepts')
  const networkingAndConcepts = [...networking, ...concepts]
  const rows = [
    { key: 'featured', title: 'Featured', topics: featured },
    { key: 'dsa', title: 'Data Structures & Algorithms', topics: dsa },
    { key: 'system-design', title: 'System Design', topics: systemDesign },
    { key: 'lld', title: 'Low Level Design', topics: lld },
    { key: 'networking-concepts', title: 'Networking & Concepts', topics: networkingAndConcepts },
  ].filter((row) => row.topics.length > 0)
  const selectedRow = activeRow ? rows.find((row) => row.key === activeRow) : null
  const rowsToRender = selectedRow ? [selectedRow] : rows

  return (
    <div className="relative min-h-screen">
      <GlowEffect intensity="subtle" className="fixed" />

      <div className="relative z-10 mx-auto max-w-screen-xl px-4 sm:px-6 py-10 flex flex-col gap-12">
        <div className="flex flex-col gap-4">
          <h1 className="font-headline font-extrabold text-4xl sm:text-5xl text-on-surface">
            Explore Simulations
          </h1>
          <p className="text-base text-on-surface-variant max-w-lg">
            24 hand-crafted interactive simulations. Play with the code, watch the
            algorithm, master the concept.
          </p>

          <div className="mt-2">
            <SearchBar />
          </div>

          {selectedRow && (
            <p className="text-sm text-on-surface-variant">
              Showing one section.{' '}
              <Link href="/explore" className="text-primary hover:text-primary/80 transition-colors">
                Show all
              </Link>
            </p>
          )}
        </div>

        {rowsToRender.map((row) => (
          <TopicRow
            key={row.key}
            title={row.title}
            topics={row.topics}
            seeAllHref={selectedRow ? undefined : `/explore?row=${row.key}`}
            layout={selectedRow ? 'grid' : 'carousel'}
          />
        ))}
      </div>
    </div>
  )
}
