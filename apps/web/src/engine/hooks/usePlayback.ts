'use client'

import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@/src/stores/player-store'

// ─── usePlayback ──────────────────────────────────────────────────────────────

import { useShallow } from 'zustand/react/shallow'

export function usePlayback() {
  return usePlayerStore(
    useShallow((s) => ({
      currentStep: s.currentStep,
      isPlaying: s.isPlaying,
      totalSteps: s.totalSteps,
      speed: s.speed,
      play: s.play,
      pause: s.pause,
      stepForward: s.stepForward,
      stepBack: s.stepBack,
      reset: s.reset,
      setSpeed: s.setSpeed,
      jumpToStep: s.jumpToStep,
      setTotalSteps: s.setTotalSteps,
    }))
  )
}

// ─── usePlaybackTick ──────────────────────────────────────────────────────────
//
// Drives auto-advance when isPlaying is true.
// Uses setInterval with useEffect cleanup — no memory leaks.
// Reads speed and stepForward from usePlayerStore so it works in both
// global and ScenePlayerProvider isolated contexts.

export function usePlaybackTick() {
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const speed = usePlayerStore((s) => s.speed)
  const stepForward = usePlayerStore((s) => s.stepForward)

  // Keep stepForward stable in the interval callback via a ref
  const stepForwardRef = useRef(stepForward)
  useEffect(() => {
    stepForwardRef.current = stepForward
  }, [stepForward])

  useEffect(() => {
    if (!isPlaying) return

    // Base interval is 1000ms; speed multiplier shortens it
    const intervalMs = Math.round(1000 / speed)
    const id = setInterval(() => {
      stepForwardRef.current()
    }, intervalMs)

    return () => clearInterval(id)
  }, [isPlaying, speed])
}
