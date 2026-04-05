import type { Metadata } from 'next'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { FeatureCards } from '@/components/landing/FeatureCards'
import { FeaturedSimulations } from '@/components/landing/FeaturedSimulations'
import { UnifiedInput } from '@/components/landing/UnifiedInput'
import { PopularChips } from '@/components/landing/PopularChips'
import { LiveDemoLoader } from '@/components/landing/LiveDemoLoader'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'insyte — See how it works.',
  description:
    'AI-powered platform that turns any tech concept into a live, interactive simulation you can play with. Not a video. Not text. A playground.',
  openGraph: {
    title: 'insyte — See how it works.',
    description:
      'Turn any tech concept into an interactive simulation you can play with.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'insyte — See how it works.',
    description: 'Turn any tech concept into an interactive simulation.',
  },
}

// ─── Landing page ─────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="flex flex-col gap-24 px-4 sm:px-6 pb-24">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="min-h-[calc(100vh-7rem)] flex items-center">
        <div className="mx-auto w-full max-w-screen-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">

            {/* Left column: headline + input + chips */}
            <div className="flex flex-col gap-8">
              {/* Headline */}
              <div className="flex flex-col gap-3">
                <h1 className="font-headline font-extrabold text-5xl sm:text-6xl xl:text-7xl text-on-surface leading-[1.08] tracking-tight">
                  Understand any<br />tech concept.
                </h1>
                <p className="font-headline font-extrabold text-5xl sm:text-6xl xl:text-7xl leading-[1.08] tracking-tight">
                  By{' '}
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #b79fff 0%, #3adffa 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    playing
                  </span>{' '}
                  with it.
                </p>
              </div>

              {/* Unified input */}
              <UnifiedInput />

              {/* Popular chips */}
              <PopularChips />
            </div>

            {/* Right column: live hash table demo — hidden on mobile per spec */}
            <div className="hidden md:block">
              <LiveDemoLoader />
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-screen-xl">
        <HowItWorks />
      </div>

      {/* ── FEATURED SIMULATIONS ──────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-screen-xl">
        <FeaturedSimulations />
      </div>

      {/* ── FEATURE HIGHLIGHTS ────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-screen-xl">
        <FeatureCards />
      </div>

    </div>
  )
}
