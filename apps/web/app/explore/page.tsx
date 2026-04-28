import type { Metadata } from 'next'
import { GlowEffect } from '@/components/layout/GlowEffect'
import { SearchBar } from '@/components/explore/SearchBar'
import { TopicRow } from '@/components/explore/TopicRow'
import { getFeaturedTopics, getTopicsByCategory, topicIndex } from '@/src/content/topic-index'
import { SITE } from '@/src/lib/config'
import Link from 'next/link'

const totalCount = topicIndex.length

export const metadata: Metadata = {
  title: 'Explore Algorithm & DSA Simulations',
  description: `Browse ${totalCount} interactive simulations — Binary Search, Merge Sort, Hash Tables, System Design, and more. Play with algorithms instead of reading about them.`,
  alternates: {
    canonical: `${SITE.url}/explore`,
  },
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

  const indexableTopics = topicIndex.filter((t) => t.slug !== 'test')
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'insyte Interactive Simulations',
    description: 'Interactive algorithm and system design simulations',
    numberOfItems: indexableTopics.length,
    itemListElement: indexableTopics.map((topic, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: topic.title,
      url: `${SITE.url}/s/${topic.slug}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListJsonLd).replace(/</g, '\\u003c'),
        }}
      />
    <div className="relative min-h-screen">
      <GlowEffect intensity="subtle" className="fixed" />

      <div className="relative z-10 mx-auto max-w-screen-xl px-4 sm:px-6 py-12 flex flex-col gap-10">

        {/* Hero header */}
        <div className="flex flex-col gap-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary/70 border border-primary/20 bg-primary/5 px-3 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
              {totalCount} hand-crafted simulations
            </span>
          </div>
          <h1 className="font-headline font-extrabold text-4xl sm:text-5xl text-on-surface leading-tight">
            Explore{' '}
            <span className="gradient-text">Simulations</span>
          </h1>
          <p className="text-base text-on-surface-variant max-w-lg leading-relaxed">
            Play with the code, watch the algorithm, master the concept.
          </p>

          <div className="mt-1">
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

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-outline-variant/30 via-primary/20 to-transparent" />

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
    </>
  )
}
