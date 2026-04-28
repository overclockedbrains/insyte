import type { Metadata, Viewport } from 'next'
import { Manrope, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { cn } from '@/lib/utils'
import { SITE } from '@/src/lib/config'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { GlowEffect } from '@/components/layout/GlowEffect'
import { DotGridBackground } from '@/components/layout/DotGridBackground'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { AuthModal } from '@/components/auth/AuthModal'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-headline',
  display: 'swap',
})

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#0e0e13',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    template: '%s — insyte',
    default: SITE.title,
  },
  description: SITE.description,
  verification: {
    google: 'GOOGLE_VERIFICATION_CODE_HERE',
  },
  openGraph: {
    title: SITE.title,
    description: SITE.description,
    type: 'website',
    url: SITE.url,
    siteName: 'insyte',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.title,
    description: SITE.description,
  },
}

const webApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'insyte',
  url: SITE.url,
  description: SITE.description,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'Interactive algorithm visualizations',
    'DSA step-by-step simulations',
    'System design diagrams',
    'AI-generated custom simulations',
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={cn(
        'dark',
        manrope.variable,
        plusJakartaSans.variable,
        jetbrainsMono.variable,
      )}
    >
      <body className="min-h-screen flex flex-col bg-background text-on-surface font-body antialiased relative">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(webApplicationJsonLd).replace(/</g, '\\u003c'),
          }}
        />

        {/* Background layers */}
        <GlowEffect />
        <DotGridBackground opacity={0.4} />

        {/* Auth provider — initialises session on mount */}
        <AuthProvider>
          {/* Page chrome */}
          <Navbar />
          <main className="flex-1 relative z-10">
            {children}
          </main>
          <Footer />

          {/* Global auth modal — triggered from anywhere via openAuthModal() */}
          <AuthModal />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
