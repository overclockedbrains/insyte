export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-screen-lg px-4 sm:px-6 py-10 space-y-10">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full animate-pulse bg-surface-container-high" />
        <div className="space-y-2">
          <div className="h-6 w-44 rounded animate-pulse bg-surface-container-high" />
          <div className="h-4 w-64 max-w-[70vw] rounded animate-pulse bg-surface-container-high" />
        </div>
      </div>

      <section className="space-y-4">
        <div className="h-5 w-40 rounded animate-pulse bg-surface-container-high" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-16 rounded-xl animate-pulse bg-surface-container-high" />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="h-5 w-48 rounded animate-pulse bg-surface-container-high" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-12 rounded-xl animate-pulse bg-surface-container-high" />
          ))}
        </div>
      </section>
    </div>
  )
}
