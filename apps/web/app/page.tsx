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
      <section className="min-h-[calc(100vh-7rem)] flex items-center">
        <div className="mx-auto w-full max-w-screen-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-8 lg:gap-16 items-center">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <h1 className="font-headline font-extrabold text-4xl sm:text-6xl xl:text-7xl text-on-surface leading-[1.08] tracking-tight">
                  Understand any<br />tech concept.
                </h1>
                <p className="font-headline font-extrabold text-4xl sm:text-6xl xl:text-7xl leading-[1.08] tracking-tight">
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

              <UnifiedInput />
              <PopularChips />

              <div className="md:hidden">
                <LiveDemoLoader compact />
              </div>
            </div>

            <div className="hidden md:block">
              <LiveDemoLoader />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-16 flex w-full max-w-screen-xl flex-col gap-16 sm:mt-20 sm:gap-20 lg:gap-24">
        <HowItWorks />
        <FeaturedSimulations />
        <FeatureCards />
      </div>
    </div>
  )
}
