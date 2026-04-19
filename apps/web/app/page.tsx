import type { Metadata } from 'next'
import { SITE } from '@/src/lib/config'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { FeatureCards } from '@/components/landing/FeatureCards'
import { FeaturedSimulations } from '@/components/landing/FeaturedSimulations'
import { UnifiedInput } from '@/components/landing/UnifiedInput'
import { PopularChips } from '@/components/landing/PopularChips'
import { LiveDemoLoader } from '@/components/landing/LiveDemoLoader'

export const metadata: Metadata = {
  title: SITE.title,
  description: `${SITE.description} Not a video. Not text. A playground.`,
  openGraph: {
    title: SITE.title,
    description: 'Turn any tech concept into an interactive simulation you can play with.',
    type: 'website',
    images: [`${SITE.url}/og-image.png`],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.title,
    description: 'Turn any tech concept into an interactive simulation.',
    images: [`${SITE.url}/og-image.png`],
  },
}

export default function Home() {
  return (
    <div className="flex flex-col px-4 pb-24 sm:px-6">
      <section className="relative min-h-[calc(100vh-7rem)] flex items-center">
        <div className="mx-auto w-full max-w-screen-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-8 lg:gap-16 items-center">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <h1 className="font-headline font-extrabold text-4xl sm:text-5xl lg:text-6xl min-[1800px]:text-7xl text-on-surface leading-[1.08] tracking-tight">
                  Understand any<br />tech concept.
                </h1>
                <p className="font-headline font-extrabold text-4xl sm:text-5xl lg:text-6xl min-[1800px]:text-7xl leading-[1.08] tracking-tight">
                  By{' '}
                  <span className="hero-gradient-text">playing</span>{' '}
                  with it.
                </p>
              </div>

              <UnifiedInput />
              <PopularChips />

              {/* Trust indicators */}
              <div className="flex items-center gap-5 flex-wrap">
                {[
                  { dot: 'bg-primary/60',   label: 'Open source' },
                  { dot: 'bg-secondary/60', label: 'Free tier' },
                  { dot: 'bg-tertiary/60',  label: 'BYOK supported' },
                ].map(({ dot, label }) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs text-on-surface-variant/40">
                    <span className={`h-1 w-1 rounded-full ${dot}`} />
                    {label}
                  </span>
                ))}
              </div>

              <div className="md:hidden">
                <LiveDemoLoader compact />
              </div>
            </div>

            <div className="hidden md:block">
              <LiveDemoLoader />
            </div>
          </div>
        </div>

        {/* Scroll signal */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-1 text-on-surface-variant/20 animate-bounce pointer-events-none select-none">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 8l5 5 5-5" />
          </svg>
        </div>
      </section>

      <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-outline-variant/30 via-primary/20 to-transparent" />
      </div>

      <div className="mx-auto mt-16 flex w-full max-w-screen-xl flex-col gap-16 sm:mt-20 sm:gap-20 lg:gap-24">
        <HowItWorks />
        <FeaturedSimulations />
        <FeatureCards />
      </div>
    </div>
  )
}
