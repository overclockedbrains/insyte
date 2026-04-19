'use client'

import Link from 'next/link'
import type { CommunityScene } from '@/app/api/community/gallery/route'

const TYPE_COLOR: Record<string, string> = {
  concept: 'text-primary bg-primary/10',
  'dsa-trace': 'text-secondary bg-secondary/10',
  dsa: 'text-secondary bg-secondary/10',
  lld: 'text-on-surface-variant bg-surface-container-high',
  hld: 'text-tertiary bg-tertiary/10',
}

const TYPE_LABEL: Record<string, string> = {
  concept: 'Concept',
  'dsa-trace': 'DSA',
  dsa: 'DSA',
  lld: 'LLD',
  hld: 'HLD',
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const minutes = diff / 60_000
  const hours = diff / 3_600_000
  const days = diff / 86_400_000
  if (days >= 1) return rtf.format(-Math.floor(days), 'day')
  if (hours >= 1) return rtf.format(-Math.floor(hours), 'hour')
  return rtf.format(-Math.floor(minutes), 'minute')
}

interface CommunityCardProps {
  scene: CommunityScene
}

export function CommunityCard({ scene }: CommunityCardProps) {
  const typeColor = TYPE_COLOR[scene.type] ?? 'text-primary bg-primary/10'
  const typeLabel = TYPE_LABEL[scene.type] ?? scene.type

  return (
    <Link
      href={`/s/${scene.slug}`}
      className="block focus:outline-none group"
    >
      <article className="h-full rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 flex flex-col gap-3 hover:border-primary/35 hover:shadow-[0_0_12px_rgba(183,159,255,0.09)] transition-[border-color,box-shadow] duration-200 cursor-pointer">
        {/* Header row: type badge + time */}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${typeColor}`}>
            {typeLabel}
          </span>
          <span className="text-[10px] text-on-surface-variant truncate">
            {relativeTime(scene.generated_at)}
          </span>
        </div>

        {/* Title */}
        <p className="text-sm font-semibold text-on-surface leading-snug line-clamp-2 font-headline flex-1">
          {scene.title}
        </p>

        {/* Query prompt */}
        <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
          {scene.query.length > 60 ? `${scene.query.slice(0, 60)}…` : scene.query}
        </p>

        {/* Footer: hit count */}
        <div className="flex items-center gap-1 mt-auto">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-on-surface-variant/50">
            <path d="M6 1.5C3.51 1.5 1.5 3.51 1.5 6s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5S8.49 1.5 6 1.5zm.5 6.5H5.5V5.5h1V8zm0-3H5.5V4h1v1z" fill="currentColor"/>
          </svg>
          <span className="text-[10px] text-on-surface-variant/60">
            {scene.hit_count.toLocaleString()} {scene.hit_count === 1 ? 'view' : 'views'}
          </span>
        </div>
      </article>
    </Link>
  )
}
