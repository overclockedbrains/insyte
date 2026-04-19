'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { CommunityScene } from '@/app/api/community/gallery/route'
import { CommunityCard } from './CommunityCard'

type Sort = 'recent' | 'popular'

// ─── Skeleton grid ────────────────────────────────────────────────────────────

function GallerySkeletonGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 flex flex-col gap-3 h-44"
        >
          <div className="flex justify-between">
            <div className="h-4 w-12 rounded-full animate-pulse bg-surface-container-high" />
            <div className="h-3 w-16 rounded animate-pulse bg-surface-container-high" />
          </div>
          <div className="h-4 w-4/5 rounded animate-pulse bg-surface-container-high" />
          <div className="h-3 w-full rounded animate-pulse bg-surface-container-high" />
          <div className="h-3 w-3/4 rounded animate-pulse bg-surface-container-high" />
          <div className="mt-auto h-3 w-16 rounded animate-pulse bg-surface-container-high" />
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
      <div className="text-4xl select-none">✨</div>
      <p className="text-on-surface font-semibold">No simulations yet</p>
      <p className="text-sm text-on-surface-variant max-w-xs">
        Be the first — generate a simulation and it will appear here.
      </p>
    </div>
  )
}

// ─── Sort tabs ────────────────────────────────────────────────────────────────

function SortTabs({ sort, onSort }: { sort: Sort; onSort: (s: Sort) => void }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-container w-fit">
      {(['recent', 'popular'] as Sort[]).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSort(s)}
          className="relative px-4 py-1.5 text-sm font-medium rounded-lg transition-colors focus:outline-none"
        >
          {sort === s && (
            <motion.span
              layoutId="sort-indicator"
              className="absolute inset-0 rounded-lg bg-surface-container-high"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <span className={`relative z-10 ${sort === s ? 'text-on-surface' : 'text-on-surface-variant'}`}>
            {s === 'recent' ? 'Recent' : 'Popular'}
          </span>
        </button>
      ))}
    </div>
  )
}

// ─── GalleryPageClient ────────────────────────────────────────────────────────

interface GalleryPageClientProps {
  initialScenes: CommunityScene[]
  initialHasMore: boolean
  initialSort: Sort
}

export function GalleryPageClient({ initialScenes, initialHasMore, initialSort }: GalleryPageClientProps) {
  const [sort, setSort] = useState<Sort>(initialSort)
  const [scenes, setScenes] = useState<CommunityScene[]>(initialScenes)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sortLoading, setSortLoading] = useState(false)

  const fetchPage = useCallback(async (nextSort: Sort, nextPage: number, append: boolean) => {
    try {
      const res = await fetch(`/api/community/gallery?sort=${nextSort}&page=${nextPage}`)
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json() as { scenes: CommunityScene[]; hasMore: boolean }
      setScenes((prev) => append ? [...prev, ...data.scenes] : data.scenes)
      setHasMore(data.hasMore)
      setPage(nextPage)
    } catch {
      // silent — leave existing state
    }
  }, [])

  const handleSort = useCallback(async (s: Sort) => {
    if (s === sort) return
    setSort(s)
    setSortLoading(true)
    await fetchPage(s, 0, false)
    setSortLoading(false)
  }, [sort, fetchPage])

  const handleLoadMore = useCallback(async () => {
    setLoading(true)
    await fetchPage(sort, page + 1, true)
    setLoading(false)
  }, [sort, page, fetchPage])

  return (
    <div className="flex flex-col gap-6">
      <SortTabs sort={sort} onSort={handleSort} />

      {sortLoading ? (
        <GallerySkeletonGrid />
      ) : scenes.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {scenes.map((scene) => (
              <CommunityCard key={`${scene.slug}-${scene.generated_at}`} scene={scene} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high disabled:opacity-50 transition-colors"
              >
                {loading ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
