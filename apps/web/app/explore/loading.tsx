import { SkeletonCard } from '@/components/skeleton/SkeletonCard'

export default function ExploreLoading() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 py-10 space-y-10">
      <div className="space-y-3">
        <div className="h-9 w-56 rounded animate-pulse bg-surface-container-high" />
        <div className="h-5 w-96 max-w-full rounded animate-pulse bg-surface-container-high" />
        <div className="h-12 w-full rounded-2xl animate-pulse bg-surface-container-high" />
      </div>

      {Array.from({ length: 2 }).map((_, rowIndex) => (
        <section key={rowIndex} className="space-y-4">
          <div className="h-5 w-44 rounded animate-pulse bg-surface-container-high" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((__, cardIndex) => (
              <SkeletonCard key={`${rowIndex}-${cardIndex}`} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
