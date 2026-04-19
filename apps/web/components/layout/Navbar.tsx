'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useCallback, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { MenuIcon, SettingsIcon, StarIcon, Share2, Check, Maximize2, Minimize2, LogOut, User, Terminal } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { Provider } from '@/src/ai/registry'
import { useBoundStore } from '@/src/stores/store'
import { Pill } from '@/components/ui/Pill'
import { GITHUB_URL, NAV_LINKS } from '@/src/lib/config'
import { signOut, getUserInitials, getUserAvatarUrl } from '@/lib/auth'
import { BookmarkButton } from '@/components/simulation/BookmarkButton'

// Provider indicator

const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  groq: 'Groq',
  ollama: 'Ollama',
  custom: 'Custom',
}

function SettingsLink({
  className,
  showLabel = false,
  onClick,
}: {
  className?: string
  showLabel?: boolean
  onClick?: () => void
}) {
  const provider = useBoundStore((s) => s.provider)
  const apiKeys = useBoundStore((s) => s.apiKeys)
  const hasByok = Boolean(apiKeys[provider])

  return (
    <Link
      href="/settings"
      className={className}
      title={hasByok ? `Using ${PROVIDER_LABELS[provider]} key` : 'Using free tier'}
      onClick={onClick}
    >
      <span className="relative flex items-center">
        <SettingsIcon className={showLabel ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        <span
          className={[
            'absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full',
            hasByok ? 'bg-secondary' : 'bg-outline',
          ].join(' ')}
        />
      </span>
      {showLabel && <span>Settings</span>}
    </Link>
  )
}

// User menu (avatar + dropdown)

function UserMenu() {
  const user = useBoundStore((s) => s.user)
  const openAuthModal = useBoundStore((s) => s.openAuthModal)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  if (!user) {
    return (
      <button
        type="button"
        onClick={openAuthModal}
        className="px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors rounded-md hover:bg-surface-container-high"
      >
        Sign In
      </button>
    )
  }

  const initials = getUserInitials(user)
  const avatarUrl = getUserAvatarUrl(user)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen((v) => !v)}
        className="h-8 w-8 rounded-full overflow-hidden border-2 border-primary/30 hover:border-primary/60 transition-colors flex items-center justify-center bg-primary/10 text-primary text-xs font-bold focus:outline-none"
        aria-label="Account menu"
        aria-expanded={dropdownOpen}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={initials}
            width={32}
            height={32}
            className="object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </button>

      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            className="absolute right-0 top-full mt-2 w-52 rounded-md border border-outline-variant/30 bg-surface-container-low/95 backdrop-blur-md shadow-xl z-50 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          >
            {/* User info */}
            <div className="px-4 py-3 border-b border-outline-variant/20">
              <p className="text-sm font-semibold text-on-surface truncate">
                {(user.user_metadata?.full_name as string) ?? user.email ?? 'User'}
              </p>
              <p className="text-xs text-on-surface-variant truncate mt-0.5">
                {user.email}
              </p>
            </div>

            {/* Menu items */}
            <div className="p-1">
              <Link
                href="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <User className="h-4 w-4" />
                Profile
              </Link>

              <button
                type="button"
                onClick={async () => {
                  setDropdownOpen(false)
                  await signOut()
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-error hover:bg-error/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Navbar

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [showShareFallback, setShowShareFallback] = useState(false)
  const activeScene = useBoundStore((s) => s.activeScene)
  const isExpanded = useBoundStore((s) => s.isExpanded)
  const toggleExpanded = useBoundStore((s) => s.toggleExpanded)
  const pathname = usePathname()

  // Extract slug from /s/[slug] paths for bookmark button
  const currentSlug = pathname?.startsWith('/s/') ? pathname.slice(3) : null

  const handleShare = useCallback(async () => {
    const url = window.location.href
    try {
      if (!navigator.clipboard?.writeText) {
        setShareUrl(url)
        setShowShareFallback(true)
        return
      }

      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setShareUrl(url)
      setShowShareFallback(true)
    }
  }, [])

  const isScenePage = activeScene != null
  const isDevPage = (pathname?.startsWith('/dev') ?? false) && Boolean(process.env.NEXT_PUBLIC_DEV_TOOLS)

  return (
    <header
      className="sticky top-0 z-50 w-full backdrop-blur-md bg-background/80"
      style={{ boxShadow: '0 10px 30px -15px rgba(183,159,255,0.3)' }}
    >
      <nav className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-6 gap-3">

        {/* Logo */}
        <Link
          href="/"
          className="font-headline font-bold text-xl text-on-surface hover:opacity-90 transition-opacity shrink-0"
        >
          <span className="gradient-text">i</span>nsyte
        </Link>

        {isDevPage ? (
          <>
            {/* DEV badge */}
            <div className="flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-primary">
                Dev
              </span>
            </div>

            <div className="h-4 w-px bg-outline-variant/30" />

            {/* Dev nav links */}
            <div className="flex items-center gap-0.5">
              <Link
                href="/dev/pipeline"
                className={[
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  pathname === '/dev/pipeline'
                    ? 'text-on-surface bg-surface-container-high'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high',
                ].join(' ')}
              >
                Pipeline
              </Link>
              <Link
                href="/dev/scene"
                className={[
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  pathname === '/dev/scene'
                    ? 'text-on-surface bg-surface-container-high'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high',
                ].join(' ')}
              >
                Scene Studio
              </Link>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <span className="hidden md:block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/30 select-none">
                Dev Only
              </span>
              <div className="hidden md:block h-4 w-px bg-outline-variant/20" />
              <SettingsLink className="flex items-center p-1.5 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-150" />
              <UserMenu />
            </div>
          </>
        ) : isScenePage ? (
          <>
            <Link
              href="/explore"
              className="hidden md:block px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors rounded-md hover:bg-surface-container-high shrink-0"
            >
              Explore
            </Link>

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
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={copied ? 'copied' : 'share'}
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.15 }}
                    className="hidden sm:inline"
                  >
                    {copied ? 'Copied!' : 'Share'}
                  </motion.span>
                </AnimatePresence>
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

              {/* Bookmark */}
              {currentSlug && (
                <div className="hidden sm:flex">
                  <BookmarkButton slug={currentSlug} />
                </div>
              )}

              <SettingsLink className="hidden sm:flex items-center px-2.5 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-150" />

              {/* Auth UI on scene page */}
              <div className="hidden sm:flex ml-1">
                <UserMenu />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const isActive = pathname?.startsWith(link.href.split('/').slice(0, 2).join('/')) ?? false
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={[
                      'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'text-on-surface bg-surface-container-high'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high',
                    ].join(' ')}
                  >
                    {link.label}
                  </Link>
                )
              })}
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors rounded-md hover:bg-surface-container-high"
              >
                <StarIcon className="h-3.5 w-3.5" />
                GitHub
              </a>
              <SettingsLink
                showLabel
                className="ml-2 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors rounded-md hover:bg-surface-container-high"
              />
              {/* Auth UI */}
              <div className="ml-2">
                <UserMenu />
              </div>
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
                    {NAV_LINKS.map((link) => {
                      const isActive = pathname?.startsWith(link.href.split('/').slice(0, 2).join('/')) ?? false
                      return (
                        <Link
                          key={link.label}
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          className={[
                            'flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors',
                            isActive
                              ? 'text-on-surface bg-surface-container-high'
                              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high',
                          ].join(' ')}
                        >
                          {link.label}
                        </Link>
                      )
                    })}
                    <a
                      href={GITHUB_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-on-surface-variant hover:text-on-surface rounded-md hover:bg-surface-container-high transition-colors"
                    >
                      <StarIcon className="h-4 w-4" />
                      GitHub
                    </a>
                    <SettingsLink
                      showLabel
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-on-surface-variant hover:text-on-surface rounded-md hover:bg-surface-container-high transition-colors"
                    />
                    <div className="mt-2 px-3">
                      <UserMenu />
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </>
        )}
      </nav>

      <AnimatePresence>
                {showShareFallback && (
          <>
            <motion.div
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareFallback(false)}
              aria-hidden="true"
            />
            <motion.div
              className="fixed inset-0 z-[80] flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <div
                className="w-full max-w-lg rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 sm:p-5"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 className="text-sm font-semibold text-on-surface">Copy simulation URL</h3>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Clipboard API is unavailable on this device. Copy the URL manually.
                </p>
                <input
                  readOnly
                  value={shareUrl}
                  className="mt-3 w-full rounded-xl border border-outline-variant/30 bg-surface-container px-3 py-2 text-sm text-on-surface"
                  onFocus={(event) => event.currentTarget.select()}
                />
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowShareFallback(false)}
                    className="px-3 py-2 rounded-lg text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}


