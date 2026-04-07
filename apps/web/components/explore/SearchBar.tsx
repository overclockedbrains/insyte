'use client'

import { useRef, useState, useCallback, useEffect, useId } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { SearchIcon, XIcon } from 'lucide-react'
import { searchTopics } from '@/src/content/topic-index'
import type { TopicEntry } from '@/src/content/topic-index'

// ─── Type badge labels ────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  concept: 'Concept',
  'dsa-trace': 'DSA',
  lld: 'LLD',
  hld: 'HLD',
}

// ─── SearchBar ────────────────────────────────────────────────────────────────

export function SearchBar() {
  const router = useRouter()
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TopicEntry[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  // ── Search on every keystroke ───────────────────────────────────────────────
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (val.trim()) {
      setResults(searchTopics(val).slice(0, 8))
      setIsOpen(true)
      setActiveIndex(-1)
    } else {
      setResults([])
      setIsOpen(false)
    }
  }, [])

  const navigateTo = useCallback(
    (slug: string) => {
      router.push(`/s/${slug}`)
      setIsOpen(false)
      setQuery('')
    },
    [router],
  )

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    inputRef.current?.focus()
  }, [])

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || results.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (activeIndex >= 0 && results[activeIndex]) {
          navigateTo(results[activeIndex].slug)
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    },
    [isOpen, results, activeIndex, navigateTo],
  )

  // ── Close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input */}
      <div
        className={[
          'flex items-center gap-3 bg-surface-container-low border rounded-2xl px-4 py-3 transition-all duration-200',
          isOpen
            ? 'border-secondary/30 ring-1 ring-secondary/50'
            : 'border-outline-variant hover:border-outline',
        ].join(' ')}
      >
        <SearchIcon className="h-4 w-4 text-on-surface-variant shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setIsOpen(true)}
          placeholder="Filter simulations..."
          aria-label="Search simulations"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `result-${activeIndex}` : undefined}
          className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant outline-none font-body"
        />
        {query && (
          <button
            onClick={clear}
            className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            id={listboxId}
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-outline-variant/30 overflow-hidden shadow-2xl"
            style={{
              background: 'rgba(25,25,31,0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {results.length > 0 ? (
              results.map((topic, i) => (
                <li
                  key={topic.slug}
                  id={`result-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => navigateTo(topic.slug)}
                  className={[
                    'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-100',
                    i === activeIndex
                      ? 'bg-surface-container-high'
                      : 'hover:bg-surface-container',
                  ].join(' ')}
                >
                  {/* Topic title */}
                  <span className="flex-1 text-sm text-on-surface font-medium truncate">
                    {topic.title}
                  </span>

                  {/* Category badge */}
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                    {topic.category}
                  </span>

                  {/* Type badge */}
                  <span className="text-[10px] font-medium text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant/20 shrink-0">
                    {TYPE_LABEL[topic.type] ?? topic.type}
                  </span>
                </li>
              ))
            ) : (
              <li className="px-4 py-4 text-sm text-on-surface-variant text-center">
                No simulations match &ldquo;{query}&rdquo;
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
