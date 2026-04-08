'use client'

import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { SectionHeader } from '@/components/landing/SectionHeader'

const STEPS = [
  {
    number: '1',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9" y1="20" x2="15" y2="20" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    ),
    title: 'Type',
    description: 'Describe any tech concept or paste your code.',
  },
  {
    number: '2',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" opacity="0.2" />
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
    title: 'Watch it Come Alive',
    description: 'An interactive simulation renders in seconds.',
  },
  {
    number: '3',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      </svg>
    ),
    title: 'Master It',
    description: 'Play, tweak, and challenge yourself to go deeper.',
  },
]

// Height of the connector strip below the cards
const STRIP_H = 54
// Vertical center of the S-curve within the strip
const MID_Y = STRIP_H / 2 + 6
// Amplitude of the S-curve (how much it rises/dips)
const AMP = 14

function buildPath(w: number): string {
  // Card centers at 1/6, 3/6, 5/6 of total width
  const x1 = w / 6
  const x2 = w / 2
  const x3 = (w * 5) / 6

  return (
    `M ${x1} ${MID_Y} ` +
    `C ${x1 + (x2 - x1) * 0.4} ${MID_Y - AMP}, ` +
    `${x2 - (x2 - x1) * 0.4} ${MID_Y + AMP}, ` +
    `${x2} ${MID_Y} ` +
    `C ${x2 + (x3 - x2) * 0.4} ${MID_Y - AMP}, ` +
    `${x3 - (x3 - x2) * 0.4} ${MID_Y + AMP}, ` +
    `${x3} ${MID_Y}`
  )
}

export function HowItWorks() {
  const stripRef = useRef<HTMLDivElement>(null)
  const [pathD, setPathD] = useState('')

  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    const update = () => setPathD(buildPath(el.offsetWidth))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <section className="w-full">
      <SectionHeader
        title="How It Works"
        description="From prompt to interactive simulation in three focused steps."
        className="mb-8 sm:mb-10"
      />

      {/* ── Desktop ── */}
      <div className="hidden md:flex flex-col">

        {/* Cards */}
        <div className="grid grid-cols-3 gap-5">
          {STEPS.map(step => <StepCard key={step.number} step={step} />)}
        </div>

        {/* Connector strip — fully visible below cards */}
        <div ref={stripRef} className="relative w-full" style={{ height: STRIP_H }}>
          {pathD && (
            <>
              {/* Dashed track */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ overflow: 'visible' }}
                aria-hidden="true"
              >
                <path
                  d={pathD}
                  fill="none"
                  stroke="rgba(72,71,77,0.6)"
                  strokeWidth="1.25"
                  strokeDasharray="6 5"
                />
                <path
                  d={pathD}
                  fill="none"
                  stroke="#3adffa"
                  strokeWidth="1.25"
                  strokeDasharray="6 5"
                  opacity="0.22"
                />
              </svg>

              {/* Traveling dot via CSS motion path */}
              <motion.div
                className="absolute w-3 h-3 rounded-full bg-secondary pointer-events-none"
                style={{
                  offsetPath: `path("${pathD}")`,
                  top: 0,
                  left: 0,
                  marginLeft: '-6px',
                  marginTop: '0px',
                  filter: 'drop-shadow(0 0 5px #3adffa)',
                } as CSSProperties}
                animate={{ offsetDistance: ['0%', '100%'] }}
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Mobile ── */}
      <div className="md:hidden flex flex-col gap-3.5">
        {STEPS.map(step => <StepCard key={step.number} step={step} mobile />)}
      </div>
    </section>
  )
}

function StepCard({ step, mobile }: { step: typeof STEPS[number]; mobile?: boolean }) {
  return (
    <div className={[
      'flex gap-4 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5',
      mobile ? 'flex-row items-start' : 'min-h-[182px] flex-col items-center text-center',
    ].join(' ')}>
      <div className={[
        'flex items-center justify-center rounded-xl shrink-0 border border-outline-variant/20 bg-surface-container-high',
        mobile ? 'h-11 w-11' : 'h-12 w-12 mb-1',
      ].join(' ')}>
        <span className="text-primary">{step.icon}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className={[
          'text-xs font-bold text-on-surface-variant/50 tracking-widest uppercase',
          mobile ? '' : 'block text-center',
        ].join(' ')}>
          Step {step.number}
        </span>
        <h3 className="text-base font-bold font-headline text-on-surface">{step.title}</h3>
        <p className="text-sm text-on-surface-variant leading-relaxed">{step.description}</p>
      </div>
    </div>
  )
}
