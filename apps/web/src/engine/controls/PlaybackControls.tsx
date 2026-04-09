'use client'

import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import { useIsMobile } from '@/components/hooks/useMediaQuery'
import { usePlayerStore } from '@/src/stores/player-store'
import type { PlaybackSpeed } from '@/src/stores/slices/playback-slice'

const SPEED_OPTIONS: PlaybackSpeed[] = [0.5, 1, 1.5, 2]

export function PlaybackControls() {
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
  const isMobile = useIsMobile()

  const disabled = totalSteps === 0

  const cycleSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(speed)
    const nextSpeed = SPEED_OPTIONS[(currentIndex + 1) % SPEED_OPTIONS.length] ?? SPEED_OPTIONS[0]!
    setSpeed(nextSpeed)
  }

  if (isMobile) {
    return (
      <div className="relative overflow-hidden bg-surface-container border border-outline-variant/20 rounded-2xl px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <PlaybackButton onClick={stepBack} disabled={disabled || currentStep === 0} title="Step back">
            <SkipBack className="h-4 w-4" />
          </PlaybackButton>
          <PlaybackButton
            onClick={isPlaying ? pause : play}
            disabled={disabled}
            title={isPlaying ? 'Pause' : 'Play'}
            prominent
          >
            {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
          </PlaybackButton>
          <PlaybackButton
            onClick={stepForward}
            disabled={disabled || currentStep >= totalSteps - 1}
            title="Step forward"
          >
            <SkipForward className="h-4 w-4" />
          </PlaybackButton>
        </div>

        <motion.button
          type="button"
          onClick={cycleSpeed}
          disabled={disabled}
          whileTap={disabled ? {} : { scale: 0.95 }}
          className={[
            'text-xs font-semibold rounded-full px-2 py-1 transition-colors',
            disabled
              ? 'opacity-30 cursor-not-allowed text-on-surface-variant'
              : 'text-secondary bg-secondary/10 hover:bg-secondary/20',
          ].join(' ')}
          aria-label="Cycle playback speed"
        >
          • {speed}x
        </motion.button>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden bg-surface-container border border-outline-variant/20 rounded-2xl px-4 py-2 flex items-center gap-3 flex-nowrap">
      <div className="flex items-center gap-1">
        <PlaybackButton onClick={reset} disabled={disabled} title="Reset">
          <RotateCcw className="h-4 w-4" />
        </PlaybackButton>

        <PlaybackButton onClick={stepBack} disabled={disabled || currentStep === 0} title="Step back">
          <SkipBack className="h-4 w-4" />
        </PlaybackButton>

        <PlaybackButton
          onClick={isPlaying ? pause : play}
          disabled={disabled}
          title={isPlaying ? 'Pause' : 'Play'}
          prominent
        >
          {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
        </PlaybackButton>

        <PlaybackButton
          onClick={stepForward}
          disabled={disabled || currentStep >= totalSteps - 1}
          title="Step forward"
        >
          <SkipForward className="h-4 w-4" />
        </PlaybackButton>
      </div>

      <span className="flex-1 text-center text-xs text-on-surface-variant font-mono tabular-nums select-none whitespace-nowrap">
        {disabled ? '-- / --' : `Step ${currentStep + 1} / ${totalSteps}`}
      </span>

      <div className="flex items-center gap-1">
        {SPEED_OPTIONS.map((speedOption) => (
          <motion.button
            key={speedOption}
            onClick={() => setSpeed(speedOption)}
            disabled={disabled}
            whileTap={disabled ? {} : { scale: 0.9 }}
            className={[
              'px-2 py-0.5 rounded-full text-xs font-medium transition-colors duration-150',
              disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
              speed === speedOption
                ? 'bg-secondary/15 text-secondary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high',
            ].join(' ')}
          >
            {speedOption}x
          </motion.button>
        ))}
      </div>

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

interface PlaybackButtonProps {
  onClick: () => void
  disabled?: boolean
  title?: string
  prominent?: boolean
  children: ReactNode
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
        disabled ? 'opacity-30 cursor-not-allowed text-on-surface-variant' : 'cursor-pointer',
        prominent
          ? 'bg-secondary/15 text-secondary hover:bg-secondary/25'
          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high',
      ].join(' ')}
    >
      {children}
    </motion.button>
  )
}
