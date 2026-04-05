'use client'

import { motion } from 'framer-motion'
import { usePlayerStore } from '@/src/stores/player-store'
import type { PlaybackSpeed } from '@/src/stores/slices/playback-slice'

// ─── Icons (inline SVG to avoid extra dep before Phase 3) ────────────────────

function IconReset() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

function IconStepBack() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="19 20 9 12 19 4 19 20" />
      <line x1="5" y1="19" x2="5" y2="5" />
    </svg>
  )
}

function IconPlay() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

function IconPause() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  )
}

function IconStepForward() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  )
}

// ─── PlaybackControls ─────────────────────────────────────────────────────────

const SPEED_OPTIONS: PlaybackSpeed[] = [0.5, 1, 1.5, 2]

export function PlaybackControls() {
  // Consume from context-aware usePlayerStore
  const currentStep = usePlayerStore((s) => s.currentStep)
  const totalSteps = usePlayerStore((s) => s.totalSteps)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const speed = usePlayerStore((s) => s.speed)
  const play = usePlayerStore((s) => s.play)
  const pause = usePlayerStore((s) => s.pause)
  const stepForward = usePlayerStore((s) => s.stepForward)
  const stepBack = usePlayerStore((s) => s.stepBack)
  const reset = usePlayerStore((s) => s.reset)
  const setSpeed = usePlayerStore((s) => s.setSpeed)

  const disabled = totalSteps === 0

  return (
    <div className="relative overflow-hidden bg-surface-container border border-outline-variant/20 rounded-2xl px-4 py-2 flex items-center gap-3 flex-wrap">
      {/* Transport buttons */}
      <div className="flex items-center gap-1">
        <PlaybackButton onClick={reset} disabled={disabled} title="Reset">
          <IconReset />
        </PlaybackButton>

        <PlaybackButton onClick={stepBack} disabled={disabled || currentStep === 0} title="Step back">
          <IconStepBack />
        </PlaybackButton>

        <PlaybackButton
          onClick={isPlaying ? pause : play}
          disabled={disabled}
          title={isPlaying ? 'Pause' : 'Play'}
          prominent
        >
          {isPlaying ? <IconPause /> : <IconPlay />}
        </PlaybackButton>

        <PlaybackButton
          onClick={stepForward}
          disabled={disabled || currentStep >= totalSteps - 1}
          title="Step forward"
        >
          <IconStepForward />
        </PlaybackButton>
      </div>

      {/* Step counter */}
      <span className="flex-1 text-center text-xs text-on-surface-variant font-mono tabular-nums select-none">
        {disabled ? '— / —' : `Step ${currentStep + 1} / ${totalSteps}`}
      </span>

      {/* Speed selector */}
      <div className="flex items-center gap-1">
        {SPEED_OPTIONS.map((s) => (
          <motion.button
            key={s}
            onClick={() => setSpeed(s)}
            disabled={disabled}
            whileTap={{ scale: 0.9 }}
            className={[
              'px-2 py-0.5 rounded-full text-xs font-medium transition-colors duration-150',
              disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
              speed === s
                ? 'bg-secondary/15 text-secondary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high',
            ].join(' ')}
          >
            {s}×
          </motion.button>
        ))}
      </div>

      {/* Step progress bar — sweeps 0→100% during auto-play */}
      {isPlaying && !disabled && (
        <motion.div
          key={`progress-${currentStep}`}
          className="absolute bottom-0 left-0 h-[2px] bg-secondary/60 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 1 / speed, ease: 'linear' }}
        />
      )}
    </div>
  )
}

// ─── PlaybackButton ───────────────────────────────────────────────────────────

interface PlaybackButtonProps {
  onClick: () => void
  disabled?: boolean
  title?: string
  prominent?: boolean
  children: React.ReactNode
}

function PlaybackButton({ onClick, disabled, title, prominent, children }: PlaybackButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      title={title}
      whileTap={disabled ? {} : { scale: 0.9 }}
      className={[
        'p-2 rounded-xl transition-colors duration-150 flex items-center justify-center',
        disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
        prominent
          ? 'bg-secondary/15 text-secondary hover:bg-secondary/25'
          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high',
      ].join(' ')}
    >
      {children}
    </motion.button>
  )
}
