'use client'

import { motion } from 'framer-motion'
import type { Challenge } from '@insyte/scene-engine'

// ─── ChallengeCard ────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<Challenge['type'], { label: string; color: string }> = {
  predict: { label: 'Predict', color: 'bg-primary/10 text-primary border-primary/15' },
  'break-it': { label: 'Break It', color: 'bg-error/10 text-error border-error/15' },
  optimize: { label: 'Optimize', color: 'bg-secondary/10 text-secondary border-secondary/15' },
  scenario: { label: 'Scenario', color: 'bg-tertiary/10 text-tertiary border-tertiary/15' },
}

interface ChallengeCardProps {
  challenge: Challenge
  onTry?: (challengeId: string) => void
  className?: string
}

export function ChallengeCard({ challenge, onTry, className }: ChallengeCardProps) {
  const typeStyle = TYPE_STYLES[challenge.type] ?? TYPE_STYLES.scenario

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={[
        'bg-surface-container-low rounded-2xl border border-outline-variant/20 p-4',
        'flex flex-col gap-3 cursor-default',
        'min-w-[240px] max-w-[300px] shrink-0', // for horizontal scroll on desktop
        className ?? '',
      ].join(' ')}
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}
    >
      {/* Type badge */}
      <span
        className={[
          'w-fit text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full border',
          typeStyle.color,
        ].join(' ')}
      >
        {typeStyle.label}
      </span>

      {/* Title */}
      <h3 className="text-sm font-bold text-on-surface font-headline leading-snug">
        {challenge.title}
      </h3>

      {/* Description */}
      <p className="text-xs text-on-surface-variant leading-relaxed flex-1">
        {challenge.description}
      </p>

      {/* Try it button */}
      <button
        type="button"
        onClick={() => onTry?.(challenge.id)}
        className={[
          'w-fit flex items-center gap-1 text-xs font-bold',
          'text-primary hover:text-primary-dim transition-colors duration-150 cursor-pointer',
          'group',
        ].join(' ')}
      >
        Try it
        <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
      </button>
    </motion.div>
  )
}
