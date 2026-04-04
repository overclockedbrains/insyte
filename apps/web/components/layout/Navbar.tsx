'use client'

import Link from 'next/link'
import { useState } from 'react'
import { MenuIcon, SettingsIcon, StarIcon } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'

const GITHUB_URL = 'https://github.com/Aman-Arya/insyte'

const navLinks = [
  { label: 'Explore', href: '/explore' },
  { label: 'Gallery', href: '/explore' },
]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header
      className="sticky top-0 z-50 w-full backdrop-blur-md bg-background/80"
      style={{ boxShadow: '0 10px 30px -15px rgba(183,159,255,0.3)' }}
    >
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="font-headline font-bold text-xl text-on-surface hover:opacity-90 transition-opacity"
        >
          <span className="gradient-text">i</span>nsyte
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors rounded-md hover:bg-surface-container-high"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors rounded-md hover:bg-surface-container-high"
          >
            <StarIcon className="h-3.5 w-3.5" />
            GitHub
          </a>
          <Link
            href="/settings"
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors rounded-md hover:bg-surface-container-high"
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            Settings
          </Link>
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className="flex items-center justify-center h-9 w-9 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              aria-label="Open navigation menu"
            >
              <MenuIcon className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-64 bg-surface-container-low border-outline-variant/20 pt-12"
            >
              <nav className="flex flex-col gap-1 p-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center px-3 py-2.5 text-sm font-medium text-on-surface-variant hover:text-on-surface rounded-md hover:bg-surface-container-high transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-on-surface-variant hover:text-on-surface rounded-md hover:bg-surface-container-high transition-colors"
                >
                  <StarIcon className="h-4 w-4" />
                  GitHub
                </a>
                <Link
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-on-surface-variant hover:text-on-surface rounded-md hover:bg-surface-container-high transition-colors"
                >
                  <SettingsIcon className="h-4 w-4" />
                  Settings
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  )
}
