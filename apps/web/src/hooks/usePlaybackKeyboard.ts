'use client'

/**
 * Phase 27 — Keyboard controls for simulation playback.
 *
 * Bindings:
 *   Space       — play / pause toggle
 *   →           — step forward
 *   ←           — step back
 *   Home        — reset to step 0
 *   1           — 0.5× speed
 *   2           — 1× speed
 *   3           — 1.5× speed
 *   4           — 2× speed
 *
 * Skipped when the focused element is an input, textarea, or select so that
 * users can type without accidentally triggering playback controls.
 */

import { useEffect } from 'react'
import { usePlayerStore } from '@/src/stores/player-store'
import type { PlaybackSpeed } from '@/src/stores/slices/playback-slice'

export function usePlaybackKeyboard(): void {
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const play = usePlayerStore((s) => s.play)
  const pause = usePlayerStore((s) => s.pause)
  const stepForward = usePlayerStore((s) => s.stepForward)
  const stepBack = usePlayerStore((s) => s.stepBack)
  const reset = usePlayerStore((s) => s.reset)
  const setSpeed = usePlayerStore((s) => s.setSpeed)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when user is typing in a form element
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (target?.isContentEditable) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (isPlaying) { pause() } else { play() }
          break
        case 'ArrowRight':
          e.preventDefault()
          stepForward()
          break
        case 'ArrowLeft':
          e.preventDefault()
          stepBack()
          break
        case 'Home':
          e.preventDefault()
          reset()
          break
        case '1':
          setSpeed(0.5 as PlaybackSpeed)
          break
        case '2':
          setSpeed(1 as PlaybackSpeed)
          break
        case '3':
          setSpeed(1.5 as PlaybackSpeed)
          break
        case '4':
          setSpeed(2 as PlaybackSpeed)
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isPlaying, play, pause, stepForward, stepBack, reset, setSpeed])
}
