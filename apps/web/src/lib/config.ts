// Site-wide constants.
// Import from here and avoid hardcoding shared branding/links in components.

export const SITE = {
  name: 'insyte',
  tagline: 'See how it works.',
  title: 'insyte - See how it works.',
  description:
    'AI-powered platform that turns any tech concept into a live, interactive simulation you can play with.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://insyte.amanarya.com',
} as const

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0'

export const GITHUB_URL = 'https://github.com/overclockedbrains/insyte'

export const NAV_LINKS = [
  { label: 'Explore', href: '/explore' },
] as const
