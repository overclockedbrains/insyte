import Link from 'next/link'

export default function Home() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-24 text-center">
      <h1 className="font-headline font-extrabold text-5xl sm:text-7xl text-on-surface mb-4 leading-tight">
        <span className="gradient-text">insyte</span>
      </h1>
      <p className="text-lg sm:text-xl text-on-surface-variant max-w-md mb-10 font-body leading-relaxed">
        Interactive simulations for every tech concept.
      </p>
      <Link
        href="/explore"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary/30 text-primary text-sm font-medium hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 hover:scale-[1.02] active:scale-95"
      >
        Explore →
      </Link>
    </section>
  )
}
