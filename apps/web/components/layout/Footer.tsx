import Link from 'next/link'
import { StarIcon } from 'lucide-react'
import { GITHUB_URL, NAV_LINKS } from '@/src/lib/config'

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-surface-container-low/20">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="col-span-2 md:col-span-2 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="font-headline font-bold text-xl text-on-surface">
                <span className="gradient-text">i</span>nsyte
              </p>
              <p className="text-sm text-on-surface-variant/70 leading-relaxed max-w-xs">
                Turn any tech concept into a live, interactive simulation you can play with.
              </p>
            </div>
            <p className="text-xs text-on-surface-variant/35 mt-auto">
              © {new Date().getFullYear()} insyte. Open source.
            </p>
          </div>

          {/* Product links */}
          <div className="flex flex-col gap-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant/35">
              Product
            </p>
            <div className="flex flex-col gap-2.5">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-on-surface-variant/70 hover:text-on-surface transition-colors duration-150"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/settings"
                className="text-sm text-on-surface-variant/70 hover:text-on-surface transition-colors duration-150"
              >
                Settings
              </Link>
            </div>
          </div>

          {/* Open source */}
          <div className="flex flex-col gap-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant/35">
              Open Source
            </p>
            <div className="flex flex-col gap-2.5">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-on-surface-variant/70 hover:text-on-surface transition-colors duration-150"
              >
                <StarIcon className="h-3.5 w-3.5" />
                GitHub
              </a>
              <a
                href={`${GITHUB_URL}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-on-surface-variant/70 hover:text-on-surface transition-colors duration-150"
              >
                Report an issue
              </a>
              <a
                href={`${GITHUB_URL}/blob/main/LICENSE`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-on-surface-variant/70 hover:text-on-surface transition-colors duration-150"
              >
                License
              </a>
            </div>
          </div>

        </div>
      </div>
    </footer>
  )
}
