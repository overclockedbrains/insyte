'use client'

import Link from 'next/link'
import { useState, useCallback } from 'react'
import { MenuIcon, SettingsIcon, StarIcon, Share2, Check, Maximize2, Minimize2 } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useBoundStore } from '@/src/stores/store'
import { Pill } from '@/components/ui/Pill'

const GITHUB_URL = 'https://github.com/Aman-Arya/insyte'

const navLinks = [
  { label: 'Explore', href: '/explore' },
  { label: 'Gallery', href: '/explore' },
]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const activeScene = useBoundStore((s) => s.activeScene)
  const isExpanded = useBoundStore((s) => s.isExpanded)
  const toggleExpanded = useBoundStore((s) => s.toggleExpanded)

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = window.location.href
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [])

  const isScenePage = activeScene != null

  return (
    <header
      className="sticky top-0 z-50 w-full backdrop-blur-md bg-background/80"
      style={{ boxShadow: '0 10px 30px -15px rgba(183,159,255,0.3)' }}
    >
      <nav className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-6 gap-3">

        {/* Logo — always present */}
        <Link
          href="/"
          className="font-headline font-bold text-xl text-on-surface hover:opacity-90 transition-opacity shrink-0"
        >
          <span className="gradient-text">i</span>nsyte
        </Link>

        {isScenePage ? (
          <>
            {/* Explore link — kept visible on scene pages */}
            <Link
              href="/explore"
              className="hidden md:block px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors rounded-md hover:bg-surface-container-high shrink-0"
            >
              Explore
            </Link>

            {/* Center: scene title + category */}
            <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
              <span className="text-sm font-semibold text-on-surface font-headline truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {activeScene.title}
              </span>
              {activeScene.category && (
                <Pill className="hidden sm:inline-block shrink-0 text-[10px]">
                  {activeScene.category}
                </Pill>
              )}
            </div>

            {/* Right: Share + Expand + Settings */}
            <div className="flex items-center gap-1 shrink-0">
              <motion.button
                type="button"
                onClick={handleShare}
                whileTap={{ scale: 0.93 }}
                title="Copy link to clipboard"
                aria-label="Share"
                className={[
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer',
                  copied
                    ? 'text-secondary bg-secondary/10'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high',
                ].join(' ')}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
              </motion.button>

              <motion.button
                type="button"
                onClick={toggleExpanded}
                whileTap={{ scale: 0.93 }}
                title={isExpanded ? 'Exit full-canvas (F)' : 'Full-canvas (F)'}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                className={[
                  'hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer',
                  isExpanded
                    ? 'text-primary bg-primary/10 border border-primary/20'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high',
                ].join(' ')}
              >
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                <span className="hidden md:inline">{isExpanded ? 'Collapse' : 'Expand'}</span>
              </motion.button>

              <Link
                href="/settings"
                className="hidden sm:flex items-center px-2.5 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-150"
                title="Settings"
              >
                <SettingsIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Normal nav links (non-scene pages) */}
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
          </>
        )}
      </nav>
    </header>
  )
}
