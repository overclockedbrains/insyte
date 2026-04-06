// ─── Site-wide constants ──────────────────────────────────────────────────────
// Single source of truth for branding, links, and shared UI labels.
// Import from here — never hardcode these values in components.

export const SITE = {
  name: 'insyte',
  tagline: 'See how it works.',
  title: 'insyte — See how it works.',
  description:
    'AI-powered platform that turns any tech concept into a live, interactive simulation you can play with.',
  url: 'https://insyte.dev',
} as const

export const GITHUB_URL = 'https://github.com/overclockedbrains/insyte'

export const NAV_LINKS = [
  { label: 'Explore', href: '/explore' },
  { label: 'Gallery', href: '/explore' },
] as const
