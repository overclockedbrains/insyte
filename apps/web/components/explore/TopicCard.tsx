import Link from 'next/link'
import Image from 'next/image'
import type { TopicEntry } from '@/src/content/topic-index'

// ─── Config maps ──────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  concept: 'Concept',
  'dsa-trace': 'DSA',
  lld: 'LLD',
  hld: 'HLD',
}

// Chip shown over the image thumbnail
const TYPE_CHIP: Record<string, string> = {
  concept:    'bg-primary/20 text-primary border-primary/25',
  'dsa-trace':'bg-secondary/20 text-secondary border-secondary/25',
  lld:        'bg-surface-container-highest/80 text-on-surface-variant border-outline-variant/30',
  hld:        'bg-tertiary/20 text-tertiary border-tertiary/25',
}

// Accent dot colour beside the category label
const CATEGORY_DOT: Record<string, string> = {
  'Data Structures & Algorithms': 'bg-primary',
  'System Design':                'bg-secondary',
  'Networking':                   'bg-tertiary',
  'Low Level Design':             'bg-on-surface-variant',
  'Concepts':                     'bg-primary',
}

const EXPLORE_SIM_IMAGE_BY_SLUG: Record<string, string> = {
  'hash-tables':        '/images/explore/simulations/hash-tables.webp',
  'js-event-loop':      '/images/explore/simulations/js-event-loop.webp',
  'load-balancer':      '/images/explore/simulations/load-balancer.webp',
  'dns-resolution':     '/images/explore/simulations/dns-resolution.webp',
  'git-branching':      '/images/explore/simulations/git-branching.webp',
  'two-sum':            '/images/explore/simulations/two-sum.webp',
  'valid-parentheses':  '/images/explore/simulations/valid-parentheses.webp',
  'binary-search':      '/images/explore/simulations/binary-search.webp',
  'reverse-linked-list':'/images/explore/simulations/reverse-linked-list.webp',
  'climbing-stairs':    '/images/explore/simulations/climbing-stairs.webp',
  'merge-sort':         '/images/explore/simulations/merge-sort.webp',
  'level-order-bfs':    '/images/explore/simulations/level-order-bfs.webp',
  'number-of-islands':  '/images/explore/simulations/number-of-islands.webp',
  'sliding-window-max': '/images/explore/simulations/sliding-window-max.webp',
  'fibonacci-recursive':'/images/explore/simulations/fibonacci-recursive.webp',
  'lru-cache':          '/images/explore/simulations/lru-cache.webp',
  'rate-limiter':       '/images/explore/simulations/rate-limiter.webp',
  'min-stack':          '/images/explore/simulations/min-stack.webp',
  trie:                 '/images/explore/simulations/trie.webp',
  'design-hashmap':     '/images/explore/simulations/design-hashmap.webp',
  'url-shortener':      '/images/explore/simulations/url-shortener.webp',
  'twitter-feed':       '/images/explore/simulations/twitter-feed.webp',
  'consistent-hashing': '/images/explore/simulations/consistent-hashing.webp',
  'chat-system':        '/images/explore/simulations/chat-system.webp',
}

const FALLBACK_IMAGE = '/images/fallback_simulation.webp'

// ─── TopicCard ────────────────────────────────────────────────────────────────

interface TopicCardProps {
  topic: TopicEntry
}

export function TopicCard({ topic }: TopicCardProps) {
  const typeLabel  = TYPE_LABEL[topic.type]  ?? topic.type
  const typeChip   = TYPE_CHIP[topic.type]   ?? TYPE_CHIP.concept
  const dotColor   = CATEGORY_DOT[topic.category] ?? 'bg-primary'
  const imageSrc   = EXPLORE_SIM_IMAGE_BY_SLUG[topic.slug] ?? FALLBACK_IMAGE

  return (
    <Link
      href={`/s/${topic.slug}`}
      className="block h-full shrink-0 w-[min(240px,70vw)] min-w-[160px] md:w-full md:min-w-0 lg:w-[240px] lg:min-w-[240px] focus:outline-none"
    >
      <article className="h-full rounded-2xl overflow-hidden border border-outline-variant/20 bg-surface-container-low hover:border-primary/35 hover:shadow-[0_0_18px_rgba(183,159,255,0.10)] transition-[box-shadow,border-color] duration-250 cursor-pointer group flex flex-col transform-gpu">

        {/* ── Thumbnail ── */}
        <div className="relative w-full aspect-video bg-surface-container-high overflow-hidden">
          <Image
            src={imageSrc}
            alt={`${topic.title} preview`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
            sizes="(max-width: 640px) 70vw, (max-width: 1024px) 50vw, 240px"
          />

          {/* Bottom gradient — image fades into card body */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/20 to-transparent" />

          {/* Type chip — bottom-left over image */}
          <div className="absolute bottom-2.5 left-2.5">
            <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border backdrop-blur-sm ${typeChip}`}>
              {typeLabel}
            </span>
          </div>

          {/* Play button — centered, fades in on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="h-10 w-10 rounded-full bg-surface-container-highest/80 border border-primary/40 backdrop-blur-sm flex items-center justify-center shadow-[0_0_16px_rgba(183,159,255,0.3)]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="text-primary ml-0.5">
                <polygon points="2,1 11,6 2,11" />
              </svg>
            </div>
          </div>
        </div>

        {/* ── Card body ── */}
        <div className="px-3 pt-2.5 pb-3 flex flex-col gap-2 flex-1">
          <p className="text-sm font-semibold text-on-surface leading-snug line-clamp-2 font-headline min-h-[2.6rem]">
            {topic.title}
          </p>

          {/* Category — dot + short label */}
          <div className="mt-auto flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`} />
            <span className="text-[11px] text-on-surface-variant truncate">
              {topic.category}
            </span>
          </div>
        </div>

      </article>
    </Link>
  )
}
