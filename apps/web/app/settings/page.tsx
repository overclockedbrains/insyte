import type { Metadata } from 'next'
import { SettingsPageClient } from './SettingsPageClient'

export const metadata: Metadata = {
  title: 'Settings',
  robots: {
    index: false,
    follow: false,
  },
}

export default function SettingsPage() {
  return <SettingsPageClient />
}
