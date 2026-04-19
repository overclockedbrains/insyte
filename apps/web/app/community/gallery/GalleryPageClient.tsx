'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clock, Flame, Search } from 'lucide-react'
import type { CommunityScene } from '@/app/api/community/gallery/route'
import { CommunityCard } from './CommunityCard'
import { SearchInput } from '@/components/ui/SearchInput'

type Sort = 'recent' | 'popular'

// ─── Skeleton grid ────────────────────────────────────────────────────────────

function GallerySkeletonGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 flex flex-col gap-3 h-52"
        >
          <div className="flex justify-between items-center">
            <div className="h-4 w-14 rounded-full animate-pulse bg-surface-container-high" />
            <div className="h-3 w-16 rounded animate-pulse bg-surface-container-high" />
          </div>
          <div className="h-4 w-4/5 rounded animate-pulse bg-surface-container-high" />
          <div className="h-3 w-full rounded animate-pulse bg-surface-container-high" />
          <div className="h-3 w-3/4 rounded animate-pulse bg-surface-container-high" />
          <div className="h-3 w-2/3 rounded animate-pulse bg-surface-container-high" />
          <div className="mt-auto h-px w-full rounded animate-pulse bg-surface-container-high" />
          <div className="h-3 w-16 rounded animate-pulse bg-surface-container-high" />
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
      <div className="h-16 w-16 rounded-2xl border border-outline-variant/20 bg-surface-container-low flex items-center justify-center text-2xl select-none">
        ✨
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-on-surface font-semibold font-headline">No simulations yet</p>
        <p className="text-sm text-on-surface-variant max-w-xs">
          Be the first — generate a simulation and it will appear here for everyone to explore.
        </p>
      </div>
    </div>
  )
}

// ─── Sort tabs ────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: Sort; label: string; Icon: React.ElementType }[] = [
  { value: 'recent', label: 'Recent', Icon: Clock },
  { value: 'popular', label: 'Popular', Icon: Flame },
]

function SortTabs({ sort, onSort }: { sort: Sort; onSort: (s: Sort) => void }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-container border border-outline-variant/10 w-fit">
      {SORT_OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onSort(value)}
          className="relative flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors focus:outline-none"
        >
          {sort === value && (
            <motion.span
              layoutId="sort-indicator"
              className="absolute inset-0 rounded-lg bg-surface-container-high border border-outline-variant/20"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <Icon className={`relative z-10 h-3.5 w-3.5 ${sort === value ? 'text-primary' : 'text-on-surface-variant/50'}`} />
          <span className={`relative z-10 ${sort === value ? 'text-on-surface' : 'text-on-surface-variant'}`}>
            {label}
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
  totalCount: number
}

export function GalleryPageClient({ initialScenes, initialHasMore, initialSort, totalCount }: GalleryPageClientProps) {
  const [sort, setSort] = useState<Sort>(initialSort)
  const [scenes, setScenes] = useState<CommunityScene[]>(initialScenes)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sortLoading, setSortLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredScenes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return scenes
    return scenes.filter(
      (s) => s.title.toLowerCase().includes(q) || s.query.toLowerCase().includes(q),
    )
  }, [scenes, searchQuery])

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
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <SortTabs sort={sort} onSort={handleSort} />

        {/* Search input */}
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search simulations…"
          className="flex-1 min-w-[180px] max-w-xs"
        />

        {/* Count */}
        {totalCount > 0 && !searchQuery && (
          <span className="ml-auto text-xs text-on-surface-variant/50 shrink-0">
            {totalCount} simulation{totalCount === 1 ? '' : 's'} generated
          </span>
        )}
        {searchQuery && (
          <span className="ml-auto text-xs text-on-surface-variant/50 shrink-0">
            {filteredScenes.length} result{filteredScenes.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {sortLoading ? (
        <GallerySkeletonGrid />
      ) : filteredScenes.length === 0 && searchQuery ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Search className="h-8 w-8 text-on-surface-variant/20" />
          <p className="text-sm text-on-surface-variant">No results for <span className="text-on-surface">&ldquo;{searchQuery}&rdquo;</span></p>
        </div>
      ) : scenes.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredScenes.map((scene) => (
              <CommunityCard key={`${scene.slug}-${scene.generated_at}`} scene={scene} />
            ))}
          </div>

          {hasMore && !searchQuery && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loading}
                className="px-8 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-low text-sm font-medium text-on-surface-variant hover:text-on-surface hover:border-primary/30 hover:bg-surface-container disabled:opacity-50 transition-all duration-200"
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
