import type { Metadata } from 'next'
import { ProfilePageClient } from './ProfilePageClient'

export const metadata: Metadata = {
  title: 'Profile — insyte',
  description: 'Your saved simulations and generation history on insyte.',
}

// ─── Profile page (Server Component shell) ───────────────────────────────────
// All auth-gating and data fetching happens in the client component
// since we use client-side Supabase auth (no SSR cookies).

export default function ProfilePage() {
  return <ProfilePageClient />
}
