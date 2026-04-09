import Link from 'next/link'
import Image from 'next/image'
import type { TopicEntry } from '@/src/content/topic-index'

// ─── Type icon map ────────────────────────────────────────────────────────────

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

const EXPLORE_SIM_IMAGE_BY_SLUG: Record<string, string> = {
  'hash-tables': '/images/explore/simulations/hash-tables.webp',
  'js-event-loop': '/images/explore/simulations/js-event-loop.webp',
  'load-balancer': '/images/explore/simulations/load-balancer.webp',
  'dns-resolution': '/images/explore/simulations/dns-resolution.webp',
  'git-branching': '/images/explore/simulations/git-branching.webp',
  'two-sum': '/images/explore/simulations/two-sum.webp',
  'valid-parentheses': '/images/explore/simulations/valid-parentheses.webp',
  'binary-search': '/images/explore/simulations/binary-search.webp',
  'reverse-linked-list': '/images/explore/simulations/reverse-linked-list.webp',
  'climbing-stairs': '/images/explore/simulations/climbing-stairs.webp',
  'merge-sort': '/images/explore/simulations/merge-sort.webp',
  'level-order-bfs': '/images/explore/simulations/level-order-bfs.webp',
  'number-of-islands': '/images/explore/simulations/number-of-islands.webp',
  'sliding-window-max': '/images/explore/simulations/sliding-window-max.webp',
  'fibonacci-recursive': '/images/explore/simulations/fibonacci-recursive.webp',
  'lru-cache': '/images/explore/simulations/lru-cache.webp',
  'rate-limiter': '/images/explore/simulations/rate-limiter.webp',
  'min-stack': '/images/explore/simulations/min-stack.webp',
  trie: '/images/explore/simulations/trie.webp',
  'design-hashmap': '/images/explore/simulations/design-hashmap.webp',
  'url-shortener': '/images/explore/simulations/url-shortener.webp',
  'twitter-feed': '/images/explore/simulations/twitter-feed.webp',
  'consistent-hashing': '/images/explore/simulations/consistent-hashing.webp',
  'chat-system': '/images/explore/simulations/chat-system.webp',
}

const EXPLORE_SIM_FALLBACK_IMAGE = '/images/fallback_simulation.webp'

// ─── TopicCard ────────────────────────────────────────────────────────────────

interface TopicCardProps {
  topic: TopicEntry
}

export function TopicCard({ topic }: TopicCardProps) {
  const categoryColor = CATEGORY_COLOR[topic.category] ?? 'text-primary bg-primary/10'
  const typeLabel = TYPE_LABEL[topic.type] ?? topic.type
  const imageSrc = EXPLORE_SIM_IMAGE_BY_SLUG[topic.slug] ?? EXPLORE_SIM_FALLBACK_IMAGE

  return (
    <Link
      href={`/s/${topic.slug}`}
      className="block h-full shrink-0 w-[min(240px,70vw)] min-w-[160px] md:w-full md:min-w-0 lg:w-[240px] lg:min-w-[240px] focus:outline-none"
    >
      <article className="h-full rounded-2xl overflow-hidden border border-outline-variant/20 bg-surface-container-low hover:border-primary/35 hover:scale-[1.02] hover:shadow-[0_0_12px_rgba(183,159,255,0.09)] transition-[transform,box-shadow,border-color] duration-200 cursor-pointer group flex flex-col transform-gpu">
        {/* Thumbnail — 16:9 placeholder */}
        <div className="relative w-full aspect-video bg-surface-container-high overflow-hidden">
          <Image
            src={imageSrc}
            alt={`${topic.title} preview`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 70vw, (max-width: 1024px) 50vw, 240px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low/40 to-transparent" />

          {/* Simulation type icon — centered */}


          {/* Play button — appears on hover */}
          <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-surface-container-highest/90 border border-primary/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="currentColor"
              className="text-primary ml-0.5"
            >
              <polygon points="2,1 9,5 2,9" />
            </svg>
          </div>

          {/* Hover overlay — play button */}
        </div>

        {/* Card body */}
        <div className="p-3 flex flex-col gap-1.5 flex-1">
          <p className="text-sm font-semibold text-on-surface leading-snug line-clamp-2 font-headline min-h-[3rem]">
            {topic.title}
          </p>

          <div className="mt-auto flex items-center gap-1.5 flex-wrap">
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
      </article>
    </Link>
  )
}
