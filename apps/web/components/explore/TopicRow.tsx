'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { TopicEntry } from '@/src/content/topic-index'
import { TopicCard } from './TopicCard'

interface TopicRowProps {
  title: string
  topics: TopicEntry[]
  seeAllHref?: string
  seeAllLabel?: string
  layout?: 'carousel' | 'grid'
}

const CAROUSEL_EDGE_EPSILON = 4

function RowCards({ topics }: { topics: TopicEntry[] }) {
  return (
    <>
      {topics.map((topic, index) => (
        <div
          key={topic.slug}
          className="shrink-0 insyte-card-enter"
          style={{
            animationDelay: `${Math.min(index * 24, 180)}ms`,
          }}
        >
          <TopicCard topic={topic} />
        </div>
      ))}
    </>
  )
}

function ScrollArrow({
  direction,
  onClick,
}: {
  direction: 'left' | 'right'
  onClick: () => void
}) {
  const isLeft = direction === 'left'
  return (
    <button
      type="button"
      aria-label={isLeft ? 'Scroll left' : 'Scroll right'}
      onClick={onClick}
      className={[
        'absolute top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-outline-variant/35 bg-surface-container-high/90 text-on-surface shadow-[0_0_10px_rgba(0,0,0,0.25)] transition-all duration-200 lg:flex',
        'opacity-0 group-hover/row:opacity-100',
        isLeft ? 'left-3' : 'right-3',
        'pointer-events-auto',
      ].join(' ')}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        {isLeft ? (
          <path d="m10.5 3.5-4 4 4 4" />
        ) : (
          <path d="m5.5 3.5 4 4-4 4" />
        )}
      </svg>
    </button>
  )
}

export function TopicRow({
  title,
  topics,
  seeAllHref,
  seeAllLabel = 'See all ->',
  layout = 'carousel',
}: TopicRowProps) {
  const desktopCarouselRef = useRef<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isScrollable, setIsScrollable] = useState(false)

  const updateScrollState = useCallback(() => {
    const node = desktopCarouselRef.current
    if (!node) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      setIsScrollable(false)
      return
    }

    const maxScrollLeft = Math.max(node.scrollWidth - node.clientWidth, 0)
    const hasOverflow = maxScrollLeft > CAROUSEL_EDGE_EPSILON

    setIsScrollable(hasOverflow)
    setCanScrollLeft(hasOverflow && node.scrollLeft > CAROUSEL_EDGE_EPSILON)
    setCanScrollRight(hasOverflow && node.scrollLeft < maxScrollLeft - CAROUSEL_EDGE_EPSILON)
  }, [])

  useEffect(() => {
    if (layout !== 'carousel') {
      return
    }

    const node = desktopCarouselRef.current
    if (!node) return

    const rafId = requestAnimationFrame(() => updateScrollState())

    const onScroll = () => updateScrollState()
    node.addEventListener('scroll', onScroll, { passive: true })

    const resizeObserver = new ResizeObserver(() => updateScrollState())
    resizeObserver.observe(node)

    return () => {
      cancelAnimationFrame(rafId)
      node.removeEventListener('scroll', onScroll)
      resizeObserver.disconnect()
    }
  }, [layout, topics.length, updateScrollState])

  const scrollDesktopRow = useCallback((direction: 'left' | 'right') => {
    const node = desktopCarouselRef.current
    if (!node) return
    const delta = Math.max(Math.round(node.clientWidth * 0.85), 280)
    node.scrollBy({
      left: direction === 'left' ? -delta : delta,
      behavior: 'smooth',
    })
  }, [])

  if (topics.length === 0) return null

  return (
    <section className="group/row relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold font-headline text-on-surface">{title}</h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-sm text-on-surface-variant hover:text-primary transition-colors duration-150"
          >
            {seeAllLabel}
          </Link>
        )}
      </div>

      {layout === 'grid' ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] [&>div]:min-w-0 [&>div>a]:w-full [&>div>a]:min-w-0 [&>div>a]:lg:w-full [&>div>a]:lg:min-w-0">
          <RowCards topics={topics} />
        </div>
      ) : (
        <>
          <div
            className="flex md:hidden overflow-x-auto px-2 py-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex gap-4 px-1">
              <RowCards topics={topics} />
            </div>
          </div>

          <div className="hidden md:grid lg:hidden grid-cols-2 gap-4">
            <RowCards topics={topics} />
          </div>

          <div className="relative hidden lg:block">
            {isScrollable && (
              <>
                {canScrollLeft ? (
                  <ScrollArrow
                    direction="left"
                    onClick={() => scrollDesktopRow('left')}
                  />
                ) : null}
                {canScrollRight ? (
                  <ScrollArrow
                    direction="right"
                    onClick={() => scrollDesktopRow('right')}
                  />
                ) : null}
              </>
            )}

            <div
              ref={desktopCarouselRef}
              className="flex overflow-x-auto px-2 py-4 scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="flex gap-4 px-1">
                <RowCards topics={topics} />
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
