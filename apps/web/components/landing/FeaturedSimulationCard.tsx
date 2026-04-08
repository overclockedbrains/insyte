import Image from 'next/image'
import Link from 'next/link'
import type { TopicEntry } from '@/src/content/topic-index'

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
  Concepts: 'text-primary bg-primary/10',
}

interface FeaturedSimulationCardProps {
  topic: TopicEntry
  imageSrc: string
}

export function FeaturedSimulationCard({ topic, imageSrc }: FeaturedSimulationCardProps) {
  const categoryColor = CATEGORY_COLOR[topic.category] ?? 'text-primary bg-primary/10'
  const typeLabel = TYPE_LABEL[topic.type] ?? topic.type

  return (
    <Link
      href={`/s/${topic.slug}`}
      className="block h-full w-full min-w-0 focus:outline-none"
    >
      <article className="h-full rounded-2xl overflow-hidden border border-outline-variant/20 bg-surface-container-low hover:border-primary/35 hover:scale-[1.02] hover:shadow-[0_0_12px_rgba(183,159,255,0.09)] transition-[transform,box-shadow,border-color] duration-200 cursor-pointer group flex flex-col transform-gpu">
        <div className="relative w-full aspect-video bg-surface-container-high overflow-hidden">
          <Image
            src={imageSrc}
            alt={`${topic.title} preview`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low/40 to-transparent" />
        </div>

        <div className="p-3 flex flex-col gap-1.5 flex-1">
          <p className="text-sm font-semibold text-on-surface leading-snug line-clamp-2 font-headline min-h-[3rem]">
            {topic.title}
          </p>

          <div className="mt-auto flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${categoryColor}`}
            >
              {topic.category}
            </span>
            <span className="text-[10px] font-medium text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant/20">
              {typeLabel}
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
