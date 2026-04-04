import type { Metadata } from 'next'
import { Manrope, Inter, JetBrains_Mono } from 'next/font/google'
import { cn } from '@/lib/utils'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-headline',
  display: 'swap',
})

const inter = Inter({
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

export const metadata: Metadata = {
  title: 'insyte — See how it works.',
  description:
    'AI-powered platform that turns any tech concept into a live, interactive simulation you can play with.',
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
        'dark h-full antialiased',
        manrope.variable,
        inter.variable,
        jetbrainsMono.variable,
      )}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
