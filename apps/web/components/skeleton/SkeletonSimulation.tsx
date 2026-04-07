import { SkeletonText } from './SkeletonText'

export function SkeletonSimulation() {
  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="px-4 md:px-6 py-3 border-b border-outline-variant/20">
        <div className="h-6 w-64 max-w-full rounded animate-pulse bg-surface-container-high" />
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        <div className="hidden md:flex w-[35%] border-r border-outline-variant/20 p-5">
          <div className="w-full space-y-4">
            <div className="h-5 w-2/3 rounded animate-pulse bg-surface-container-high" />
            <SkeletonText lines={8} />
          </div>
        </div>

        <div className="flex-1 p-3 md:p-5 flex flex-col gap-3">
          <div className="h-12 rounded-2xl animate-pulse bg-surface-container-high" />
          <div className="flex-1 rounded-3xl border border-outline-variant/20 bg-surface-container-low p-4">
            <div className="h-full rounded-2xl animate-pulse bg-surface-container-high" />
          </div>
          <div className="h-16 rounded-2xl animate-pulse bg-surface-container-high" />
        </div>
      </div>
    </div>
  )
}
