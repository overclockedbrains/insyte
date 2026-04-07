'use client'

import { SITE } from '@/src/lib/config'

type OgType = 'concept' | 'dsa-trace' | 'lld' | 'hld'

interface OgPreviewCardProps {
  title: string
  type?: OgType
  category?: string
}

const TYPE_STYLES: Record<OgType, { label: string; className: string }> = {
  concept: {
    label: 'Concept',
    className: 'bg-primary/15 text-primary border-primary/30',
  },
  'dsa-trace': {
    label: 'DSA',
    className: 'bg-secondary/15 text-secondary border-secondary/30',
  },
  lld: {
    label: 'LLD',
    className: 'bg-surface-container-high text-on-surface-variant border-outline-variant/50',
  },
  hld: {
    label: 'HLD',
    className: 'bg-tertiary/15 text-tertiary border-tertiary/30',
  },
}

function getSiteHost(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export function OgPreviewCard({
  title,
  type = 'concept',
  category,
}: OgPreviewCardProps) {
  const badge = TYPE_STYLES[type] ?? TYPE_STYLES.concept
  const siteHost = getSiteHost(SITE.url)

  return (
    <div className="relative w-full aspect-[1200/630] overflow-hidden rounded-2xl border border-outline-variant/30 bg-background p-6 sm:p-8">
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-40" />
      <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative flex h-full flex-col">
        <div className="mb-5 text-lg font-headline font-bold tracking-tight">
          <span className="gradient-text">i</span>nsyte
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={[
              'inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest',
              badge.className,
            ].join(' ')}
          >
            {badge.label}
          </span>
          {category ? (
            <span className="inline-flex items-center rounded-full border border-outline-variant/50 bg-surface-container-high px-3 py-1 text-xs text-on-surface-variant">
              {category}
            </span>
          ) : null}
        </div>

        <h3 className="mt-4 text-2xl sm:text-3xl font-headline font-extrabold leading-tight text-on-surface">
          {title}
        </h3>

        <p className="mt-auto pt-6 text-sm text-on-surface-variant">
          Interactive simulation - {siteHost}
        </p>
      </div>
    </div>
  )
}
