'use client'

import Link from 'next/link'
import { Eye, Zap, Layers, Network, Code2, BrainCircuit } from 'lucide-react'
import type { CommunityScene } from '@/app/api/community/gallery/route'

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  concept: {
    label: 'Concept',
    badgeClass: 'text-primary bg-primary/15 border border-primary/20',
    glowClass: 'hover:shadow-[0_0_20px_rgba(183,159,255,0.12)]',
    gradientClass: 'from-primary/10 via-transparent',
    Icon: BrainCircuit,
  },
  'dsa-trace': {
    label: 'DSA',
    badgeClass: 'text-secondary bg-secondary/15 border border-secondary/20',
    glowClass: 'hover:shadow-[0_0_20px_rgba(103,232,249,0.10)]',
    gradientClass: 'from-secondary/10 via-transparent',
    Icon: Zap,
  },
  dsa: {
    label: 'DSA',
    badgeClass: 'text-secondary bg-secondary/15 border border-secondary/20',
    glowClass: 'hover:shadow-[0_0_20px_rgba(103,232,249,0.10)]',
    gradientClass: 'from-secondary/10 via-transparent',
    Icon: Zap,
  },
  lld: {
    label: 'LLD',
    badgeClass: 'text-on-surface bg-surface-container-highest border border-outline-variant/30',
    glowClass: 'hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]',
    gradientClass: 'from-surface-container-highest/50 via-transparent',
    Icon: Code2,
  },
  hld: {
    label: 'HLD',
    badgeClass: 'text-tertiary bg-tertiary/15 border border-tertiary/20',
    glowClass: 'hover:shadow-[0_0_20px_rgba(167,243,208,0.10)]',
    gradientClass: 'from-tertiary/10 via-transparent',
    Icon: Network,
  },
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const days = diff / 86_400_000
  const hours = diff / 3_600_000
  const minutes = diff / 60_000
  if (days >= 1) return rtf.format(-Math.floor(days), 'day')
  if (hours >= 1) return rtf.format(-Math.floor(hours), 'hour')
  return rtf.format(-Math.max(1, Math.floor(minutes)), 'minute')
}

type TypeConfigEntry = (typeof TYPE_CONFIG)[keyof typeof TYPE_CONFIG]

interface CommunityCardProps {
  scene: CommunityScene
}

export function CommunityCard({ scene }: CommunityCardProps) {
  const cfg: TypeConfigEntry =
    (TYPE_CONFIG as Record<string, TypeConfigEntry>)[scene.type] ?? TYPE_CONFIG.concept
  const { label, badgeClass, glowClass, gradientClass, Icon } = cfg

  return (
    <Link href={`/s/${scene.slug}`} className="block focus:outline-none group h-full">
      <article
        className={[
          'relative h-full flex flex-col overflow-hidden rounded-2xl',
          'border border-outline-variant/20 bg-surface-container-low',
          'hover:border-primary/30 transition-all duration-300 cursor-pointer',
          glowClass,
        ].join(' ')}
      >
        {/* Top gradient tint */}
        <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${gradientClass} to-transparent pointer-events-none`} />

        {/* Arrow on hover */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 6.5L6.5 1.5M6.5 1.5H2.5M6.5 1.5V5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"/>
            </svg>
          </div>
        </div>

        <div className="relative flex flex-col gap-3 p-4 flex-1">
          {/* Header: type badge + time */}
          <div className="flex items-center justify-between gap-2 pr-6">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${badgeClass}`}>
              <Icon className="h-2.5 w-2.5" />
              {label}
            </span>
            <span className="text-[10px] text-on-surface-variant/60 shrink-0">
              {relativeTime(scene.generated_at)}
            </span>
          </div>

          {/* Title */}
          <p className="text-sm font-bold text-on-surface leading-snug line-clamp-2 font-headline">
            {scene.title}
          </p>

          {/* Query prompt */}
          <div className="flex items-start gap-1.5 flex-1">
            <span className="mt-0.5 text-primary/40 text-xs font-bold shrink-0">&ldquo;</span>
            <p className="text-[11px] text-on-surface-variant/70 leading-relaxed line-clamp-3 italic">
              {scene.query.length > 80 ? `${scene.query.slice(0, 80)}…` : scene.query}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-outline-variant/10">
            <div className="flex items-center gap-1.5">
              <Eye className="h-3 w-3 text-on-surface-variant/40" />
              <span className="text-[10px] text-on-surface-variant/50">
                {scene.hit_count.toLocaleString()} {scene.hit_count === 1 ? 'view' : 'views'}
              </span>
            </div>
            <Layers className="h-3 w-3 text-on-surface-variant/20" />
          </div>
        </div>
      </article>
    </Link>
  )
}
