import Link from 'next/link'
import { StarIcon } from 'lucide-react'
import { SITE, GITHUB_URL } from '@/src/lib/config'

export function Footer() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant/20 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Left */}
          <div className="flex flex-col gap-1">
            <p className="font-headline font-bold text-on-surface">
              {SITE.name} <span className="text-on-surface-variant font-normal">· {SITE.tagline}</span>
            </p>
            <p className="text-xs text-on-surface-variant">
              © {new Date().getFullYear()} {SITE.name}. Open source.
            </p>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            <Link
              href="/explore"
              className="text-sm text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Explore
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <StarIcon className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
