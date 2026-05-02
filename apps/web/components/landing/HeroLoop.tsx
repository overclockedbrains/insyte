'use client'

import Link from 'next/link'
import { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { DotGridBackground } from '@/components/layout/DotGridBackground'
import { getLiveHeroColors } from '@/src/engine/styles/colors'
import { useThemeSync } from '@/src/engine/styles/useThemeSync'

type HeroColors = ReturnType<typeof getLiveHeroColors>

const STAGES = [
  {
    id: 'prompt',
    label: 'Prompt',
    caption: 'Idea becomes simulation brief.',
  },
  {
    id: 'code',
    label: 'Code',
    caption: 'Code lights up into execution.',
  },
  {
    id: 'network',
    label: 'Network',
    caption: 'Requests fan out through clean lanes.',
  },
  {
    id: 'system',
    label: 'System',
    caption: 'A readable model assembles itself.',
  },
] as const

const HERO_STAGE_MS = 2600

function PromptScene({ compact }: { compact: boolean }) {
  const parsedFields = compact
    ? [
        { key: 'topic', value: 'cache miss traffic spike' },
        { key: 'goal', value: 'show why surge happens' },
      ]
    : [
        { key: 'topic', value: 'cache miss traffic spike' },
        { key: 'goal', value: 'show why surge happens' },
        { key: 'output', value: 'interactive request-flow demo' },
      ]

  const stages = compact
    ? ['parse prompt', 'build plan', 'render scene']
    : ['parse prompt', 'extract entities', 'build plan', 'render scene']

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-3 overflow-hidden">
      <div className="rounded-[20px] border border-outline-variant/18 bg-surface-container-low/88 p-3 sm:p-4">
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-secondary">Prompt Input</div>
        <div className="mt-2 rounded-xl border border-outline-variant/18 bg-on-surface/8 px-3 py-2.5 font-mono text-[11px] leading-snug text-on-surface sm:text-xs">
          explain cache miss traffic spike and visualize the fix
        </div>
      </div>

      <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="min-h-0 rounded-[20px] border border-outline-variant/16 bg-surface-container-low/72 p-3">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-on-surface-variant/62">Parsed Intent</div>
          <div className="mt-2.5 space-y-2">
            {parsedFields.map((field, index) => (
              <motion.div
                key={field.key}
                className="flex items-center justify-between gap-2 rounded-xl border border-outline-variant/16 bg-on-surface/5 px-2.5 py-2"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
              >
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-on-surface-variant/58">
                  {field.key}
                </span>
                <span className="text-[11px] text-on-surface">{field.value}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="min-h-0 rounded-[20px] border border-outline-variant/16 bg-surface-container-low/72 p-3">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-on-surface-variant/62">Execution</div>
          <div className="mt-2.5 space-y-2">
            {stages.map((step, index) => (
              <motion.div
                key={step}
                className="flex items-center gap-2 rounded-xl border border-outline-variant/16 bg-on-surface/5 px-2.5 py-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07 }}
              >
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-secondary/30 bg-secondary/12 text-[9px] font-mono text-secondary">
                  {index + 1}
                </span>
                <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-on-surface-variant/86">
                  {step}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CodeScene({ colors }: { colors: HeroColors }) {
  const lines = [
    'const nums=[12,7,19,4]',
    'nums.sort((x,y)=>x-y)',
    'const pick=nums.slice(1,3)',
    'draw(pick)',
  ]
  const steps = [
    { label: 'INPUT', values: ['12', '7', '19', '4'], active: [] as number[] },
    { label: 'RESULT', values: ['7', '12'], active: [0, 1] },
  ]

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[1.08fr_0.82fr]">
      <div className="rounded-[24px] border border-outline-variant/18 bg-surface-container-low/82 p-3 sm:p-4">
        <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.22em] text-on-surface-variant/58">
          route.ts
        </div>
        {lines.map((line, index) => (
          <motion.div
            key={line}
            className="mt-1.5 flex items-start gap-2 rounded-2xl px-2.5 py-2 font-mono text-[10px] leading-snug sm:text-[11px]"
            animate={{
              backgroundColor: index === 2 ? colors.codeLineActive.bg : colors.codeLineOff.bg,
              borderColor: index === 2 ? colors.codeLineActive.border : colors.codeLineOff.border,
            }}
            style={{ borderWidth: 1 }}
          >
            <span className="w-4 shrink-0 pt-0.5 text-right text-on-surface-variant/45">{index + 1}</span>
            <span className={['block min-w-0 break-words', index === 2 ? 'text-on-surface' : 'text-on-surface-variant/82'].join(' ')}>
              {line}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="rounded-[24px] border border-outline-variant/18 bg-surface-container-low/68 p-3 sm:p-4">
        <div className="flex h-full min-h-0 flex-col rounded-[20px] border border-outline-variant/16 bg-surface-container-high/60 px-3 py-3">
          <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.22em] text-on-surface-variant/58">
            array flow
          </div>
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-3">
            {steps.map((step, stepIndex) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className="w-9 shrink-0 text-[9px] font-mono uppercase tracking-[0.18em] text-on-surface-variant/70">
                  {step.label}
                </div>
                <div className="min-w-0 flex-1 rounded-2xl border border-outline-variant/16 bg-on-surface/5 px-2 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {step.values.map((value, valueIndex) => {
                      const isActive = step.active.includes(valueIndex)

                      return (
                        <motion.div
                          key={`${step.label}-${value}`}
                          className="rounded-xl border px-2 py-1 text-[10px] font-mono"
                          animate={{
                            borderColor: isActive ? colors.codeActive.border : colors.codeDim.border,
                            backgroundColor: isActive ? colors.codeActive.bg : colors.codeDim.bg,
                            color: isActive ? colors.codeActive.text : colors.codeDim.text,
                          }}
                        >
                          {value}
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
                {stepIndex < steps.length - 1 ? (
                  <div className="shrink-0 text-[10px] text-on-surface-variant/40">↓</div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.18em] text-on-surface-variant/55">
            numeric trace
          </div>
        </div>
      </div>
    </div>
  )
}

function NetworkCard({
  title,
  subtitle,
  active = false,
  className = '',
  colors,
}: {
  title: string
  subtitle: string
  active?: boolean
  className?: string
  colors: HeroColors
}) {
  return (
    <motion.div
      className={[
        'rounded-[18px] border bg-surface-container-high/88 px-3 py-2.5',
        className,
      ].join(' ')}
      animate={{
        borderColor: active ? colors.networkActive.border : colors.networkDim.border,
        backgroundColor: active ? colors.networkActive.bg : colors.networkDim.bg,
      }}
      transition={{ duration: 0.25 }}
    >
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-on-surface">{title}</div>
      <div className="mt-1 text-[10px] leading-snug text-on-surface-variant/62">{subtitle}</div>
    </motion.div>
  )
}

function NetworkScene({ compact, colors }: { compact: boolean; colors: HeroColors }) {
  const pills = compact ? ['reroute', 'hit', '42ms'] : ['reroute', 'cache hit', '42ms recovery']

  return (
    <div className="relative h-full min-h-0 overflow-hidden px-1 sm:px-2">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M18 26 L47 26"
          fill="none"
          stroke={colors.connectorStrong}
          strokeLinecap="round"
          strokeWidth="1"
        />
        <path
          d="M53 26 L78 26"
          fill="none"
          stroke={colors.connectorStrong}
          strokeLinecap="round"
          strokeWidth="1"
        />
        <path
          d="M18 33 L18 47"
          fill="none"
          stroke={colors.connectorFaint}
          strokeLinecap="round"
          strokeWidth="1"
        />
        <path
          d="M50 33 L50 47"
          fill="none"
          stroke={colors.connectorFaint}
          strokeLinecap="round"
          strokeWidth="1"
        />
        <path
          d="M78 33 L78 47"
          fill="none"
          stroke={colors.connectorFaint}
          strokeLinecap="round"
          strokeWidth="1"
        />
        <circle cx="18" cy="26" r="0.9" fill={colors.packetDot}>
          <animate attributeName="cx" values="18;47;18" dur="1.7s" repeatCount="indefinite" calcMode="spline" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
          <animate attributeName="opacity" values="0;1;0" dur="1.7s" repeatCount="indefinite" calcMode="spline" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
        </circle>
        <circle cx="53" cy="26" r="0.9" fill={colors.packetDot}>
          <animate attributeName="cx" values="53;78;53" dur="1.7s" begin="0.25s" repeatCount="indefinite" calcMode="spline" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
          <animate attributeName="opacity" values="0;1;0" dur="1.7s" begin="0.25s" repeatCount="indefinite" calcMode="spline" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
        </circle>
        <circle cx="18" cy="33" r="0.55" fill={colors.junctionDot} />
        <circle cx="50" cy="33" r="0.55" fill={colors.junctionDot} />
        <circle cx="78" cy="33" r="0.55" fill={colors.junctionDot} />
      </svg>

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-3">
          <div className="grid grid-cols-3 gap-2.5">
            <NetworkCard title="Browser" subtitle="user request" active colors={colors} />
            <NetworkCard title="Edge" subtitle="route + shield" active colors={colors} />
            <NetworkCard title="Origin" subtitle="serve response" colors={colors} />
          </div>

          <div className="grid grid-cols-[0.9fr_1.1fr_0.9fr] gap-2.5">
            <NetworkCard title="DNS" subtitle="lookup" className="mx-auto w-[82%]" colors={colors} />
            <NetworkCard title="API" subtitle="miss -> fetch" active className="mx-auto w-[88%]" colors={colors} />
            <NetworkCard title="Cache" subtitle="hot path" className="mx-auto w-[82%]" colors={colors} />
          </div>
        </div>

        <div className="flex justify-center pb-1">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-[20px] border border-outline-variant/16 bg-surface-container-low/80 px-3 py-2">
            {pills.map((pill) => (
              <div
                key={pill}
                className="rounded-xl border border-secondary/18 bg-secondary/10 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-secondary"
              >
                {pill}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SystemScene({ colors }: { colors: HeroColors }) {
  const gradientId = useId()
  const mainGradientId = `${gradientId}-main`
  const sideGradientId = `${gradientId}-side`

  return (
    <div className="relative h-full min-h-0 overflow-hidden px-1 sm:px-2">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={mainGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.gradientMainA} />
            <stop offset="50%" stopColor={colors.gradientMainB} />
            <stop offset="100%" stopColor={colors.gradientMainC} />
          </linearGradient>
          <linearGradient id={sideGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.gradientSideA} />
            <stop offset="100%" stopColor={colors.gradientSideB} />
          </linearGradient>
        </defs>
        <motion.path
          d="M16 46 C25 46, 31 46, 39 46"
          fill="none"
          stroke={`url(#${mainGradientId})`}
          strokeLinecap="round"
          strokeWidth="1.7"
          animate={{ pathLength: [0.7, 1, 0.7], opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        />
        <motion.path
          d="M53 46 C62 46, 69 27, 78 27"
          fill="none"
          stroke={`url(#${mainGradientId})`}
          strokeLinecap="round"
          strokeWidth="1.7"
          animate={{ pathLength: [0.7, 1, 0.7], opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay: 0.18 }}
        />
        <motion.path
          d="M53 46 C62 46, 69 46, 78 46"
          fill="none"
          stroke={`url(#${mainGradientId})`}
          strokeLinecap="round"
          strokeWidth="1.7"
          animate={{ pathLength: [0.7, 1, 0.7], opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay: 0.3 }}
        />
        <motion.path
          d="M53 46 C62 46, 69 65, 78 65"
          fill="none"
          stroke={`url(#${mainGradientId})`}
          strokeLinecap="round"
          strokeWidth="1.7"
          animate={{ pathLength: [0.7, 1, 0.7], opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay: 0.42 }}
        />
        <path
          d="M46 27 C46 35, 46 39, 46 44"
          fill="none"
          stroke={`url(#${sideGradientId})`}
          strokeLinecap="round"
          strokeWidth="1.1"
        />
      </svg>

      <div className="relative z-10 grid h-full min-h-0 grid-cols-[0.9fr_1.05fr_1fr] gap-3">
        <div className="flex min-h-0 items-center">
          <NetworkCard
            title="Client"
            subtitle="prompt"
            active
            className="w-full max-w-[136px] px-3 py-3"
            colors={colors}
          />
        </div>

        <div className="flex min-h-0 flex-col justify-center gap-2">
          <div className="rounded-[20px] border border-primary/24 bg-surface-container-high/90 px-3 py-3">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-on-surface">
              Load Balancer
            </div>
            <div className="mt-1 text-[11px] leading-snug text-on-surface-variant/64">
              route request to scene workers
            </div>
            <div className="mt-2 inline-flex rounded-full border border-outline-variant/18 bg-on-surface/5 px-2 py-1 text-[9px] font-mono uppercase tracking-[0.16em] text-secondary">
              least latency
            </div>
          </div>

          <div className="rounded-[16px] border border-outline-variant/16 bg-on-surface/5 px-3 py-2">
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-on-surface-variant/60">
              health checks
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-secondary/90" />
              <span className="h-2 w-2 rounded-full bg-secondary/90" />
              <span className="h-2 w-2 rounded-full bg-secondary/55" />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col justify-center gap-2">
          <NetworkCard title="Scene Worker A" subtitle="generate" active colors={colors} />
          <NetworkCard title="Scene Worker B" subtitle="patch + stream" colors={colors} />
          <NetworkCard title="Share Renderer" subtitle="persist + og" colors={colors} />
        </div>
      </div>
    </div>
  )
}

function StageContent({ id, compact, colors }: { id: string; compact: boolean; colors: HeroColors }) {
  if (id === 'prompt') return <PromptScene compact={compact} />
  if (id === 'code') return <CodeScene colors={colors} />
  if (id === 'network') return <NetworkScene compact={compact} colors={colors} />
  return <SystemScene colors={colors} />
}

export function HeroLoop({ compact = false }: { compact?: boolean }) {
  useThemeSync()
  const colors = getLiveHeroColors()

  const [index, setIndex] = useState(0)
  const stage = STAGES[index] ?? STAGES[0]

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % STAGES.length)
    }, HERO_STAGE_MS)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <div
      className="relative w-full overflow-hidden rounded-[32px] border border-primary/20 bg-surface-container"
      style={{
        aspectRatio: compact ? '16 / 13.1' : '16 / 11',
        boxShadow: colors.outerShadow,
      }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <DotGridBackground opacity={0.22} />
      </div>
      <div className="relative z-10 grid h-full min-h-0 grid-rows-[auto_1fr_auto] p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-container-high/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
            </span>
            Live Demo
          </span>

          <div className="flex max-w-[70%] flex-wrap justify-end gap-2 sm:max-w-none">
            {STAGES.map((item, itemIndex) => {
              const isActive = itemIndex === index
              return (
                <div
                  key={item.id}
                  className="rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.2em]"
                  style={{
                    borderColor: isActive
                      ? 'color-mix(in srgb, var(--color-secondary) 55%, transparent)'
                      : 'color-mix(in srgb, var(--color-on-surface) 22%, transparent)',
                    background: isActive
                      ? 'color-mix(in srgb, var(--color-secondary) 12%, transparent)'
                      : 'color-mix(in srgb, var(--color-on-surface) 8%, transparent)',
                    color: isActive
                      ? 'var(--color-on-surface)'
                      : 'color-mix(in srgb, var(--color-on-surface) 78%, transparent)',
                  }}
                >
                  {item.label}
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-3 min-h-0 rounded-[28px] border border-outline-variant/12 bg-on-surface/5 p-3 sm:p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={stage.id}
              className="h-full min-h-0 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              <StageContent id={stage.id} compact={compact} colors={colors} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 rounded-[20px] border border-outline-variant/18 bg-surface-container-low/85 px-3 py-2 backdrop-blur-md sm:max-w-[64%]">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-[10px] font-mono uppercase tracking-[0.22em] text-on-surface-variant/72">
                {stage.label}
              </span>
              <span className="min-w-0 truncate whitespace-nowrap text-[11px] text-on-surface-variant/88 sm:text-xs">
                {stage.caption}
              </span>
            </div>
          </div>

          <Link
            href="/explore"
            className="group inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[20px] border border-primary/30 bg-surface-container-highest/90 px-3 py-2 text-[11px] font-semibold text-primary transition-all duration-150 hover:border-primary/55 hover:bg-primary/10 sm:text-xs"
          >
            Try it out
            <ArrowRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
