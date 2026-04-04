'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Share2, Maximize2, Minimize2, Check } from 'lucide-react'
import { useBoundStore } from '@/src/stores/store'
import { Pill } from '@/components/ui/Pill'

// ─── SimulationNav ────────────────────────────────────────────────────────────
// Simulation-specific sticky nav rendered below the global Navbar (top-14).
// Left: ← insyte back link to /explore
// Center: simulation title + category badge
// Right: Share button (clipboard toast) + Expand button (⛶/⊠)
// Mobile: back arrow + truncated title + share icon only

interface SimulationNavProps {
  title: string
  category?: string
  slug: string
}

export function SimulationNav({ title, category }: SimulationNavProps) {
  const isExpanded = useBoundStore((s) => s.isExpanded)
  const toggleExpanded = useBoundStore((s) => s.toggleExpanded)
  const [copied, setCopied] = useState(false)

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for non-secure contexts
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

  return (
    <header
      className={[
        // Position: below global Navbar (h-14 = 3.5rem → sticky top-14)
        // When canvas is expanded, nav sits behind the overlay (z-40 < z-60)
        'sticky z-40 top-14 w-full',
        'backdrop-blur-md bg-background/85',
        'border-b border-outline-variant/20',
      ].join(' ')}
      style={{ boxShadow: '0 8px 24px -12px rgba(183,159,255,0.25)' }}
    >
      <div className="mx-auto flex h-12 max-w-screen-2xl items-center justify-between px-4 sm:px-6 gap-3">

        {/* ── Left: back link ── */}
        <Link
          href="/explore"
          className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface transition-colors duration-150 shrink-0 group"
          aria-label="Back to explore"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
          <span className="hidden sm:inline text-sm font-medium font-headline">insyte</span>
        </Link>

        {/* ── Center: title + category ── */}
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
          <h1 className="text-sm font-semibold text-on-surface font-headline truncate max-w-[200px] sm:max-w-xs md:max-w-md">
            {title}
          </h1>
          {category && (
            <Pill className="hidden sm:inline-block shrink-0 text-[10px]">
              {category}
            </Pill>
          )}
        </div>

        {/* ── Right: action buttons ── */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Share button */}
          <motion.button
            type="button"
            onClick={handleShare}
            whileTap={{ scale: 0.93 }}
            title="Copy link to clipboard"
            aria-label="Share simulation"
            className={[
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium',
              'transition-colors duration-150 cursor-pointer',
              copied
                ? 'text-secondary bg-secondary/10'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high',
            ].join(' ')}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Share2 className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
          </motion.button>

          {/* Expand / Collapse button (hidden on mobile) */}
          <motion.button
            type="button"
            onClick={toggleExpanded}
            whileTap={{ scale: 0.93 }}
            title={isExpanded ? 'Exit full-canvas mode (F)' : 'Full-canvas mode (F)'}
            aria-label={isExpanded ? 'Collapse canvas' : 'Expand canvas'}
            className={[
              'hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium',
              'transition-colors duration-150 cursor-pointer',
              isExpanded
                ? 'text-primary bg-primary/10 border border-primary/20'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high',
            ].join(' ')}
          >
            {isExpanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
            <span className="hidden md:inline">{isExpanded ? 'Collapse' : 'Expand'}</span>
          </motion.button>
        </div>
      </div>
    </header>
  )
}
