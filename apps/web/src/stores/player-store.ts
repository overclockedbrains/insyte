'use client'

import { createContext, useContext } from 'react'
import { createStore, useStore } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Scene } from '@insyte/scene-engine'
import type { PlaybackSpeed } from './slices/playback-slice'
import { useBoundStore } from './store'

// ─── Isolated player state ────────────────────────────────────────────────────
// Used by Phase 6 LiveDemo cards — each card gets its own player instance,
// completely isolated from the global useBoundStore.

export interface PlayerState {
  // Scene slice (minimal)
  activeScene: Scene | null
  setScene: (scene: Scene) => void
  clearScene: () => void

  // Playback slice (full)
  currentStep: number
  isPlaying: boolean
  speed: PlaybackSpeed
  totalSteps: number
  play: () => void
  pause: () => void
  stepForward: () => void
  stepBack: () => void
  reset: () => void
  setSpeed: (speed: PlaybackSpeed) => void
  jumpToStep: (n: number) => void
  setTotalSteps: (n: number) => void
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createPlayerStore() {
  return createStore<PlayerState>()(
    immer((set) => ({
      activeScene: null,
      setScene: (scene) =>
        set((state) => {
          state.activeScene = scene
        }),
      clearScene: () =>
        set((state) => {
          state.activeScene = null
        }),

      currentStep: 0,
      isPlaying: false,
      speed: 1,
      totalSteps: 0,

      play: () =>
        set((state) => {
          if (state.totalSteps > 0) state.isPlaying = true
        }),

      pause: () =>
        set((state) => {
          state.isPlaying = false
        }),

      stepForward: () =>
        set((state) => {
          if (state.currentStep < state.totalSteps - 1) {
            state.currentStep += 1
          } else {
            state.isPlaying = false
          }
        }),

      stepBack: () =>
        set((state) => {
          if (state.currentStep > 0) state.currentStep -= 1
        }),

      reset: () =>
        set((state) => {
          state.currentStep = 0
          state.isPlaying = false
        }),

      setSpeed: (speed) =>
        set((state) => {
          state.speed = speed
        }),

      jumpToStep: (n) =>
        set((state) => {
          state.currentStep = Math.max(0, Math.min(n, state.totalSteps - 1))
        }),

      setTotalSteps: (n) =>
        set((state) => {
          state.totalSteps = n
          if (state.currentStep >= n) state.currentStep = Math.max(0, n - 1)
        }),
    })),
  )
}

export type PlayerStoreApi = ReturnType<typeof createPlayerStore>

// ─── React context ────────────────────────────────────────────────────────────

export const ScenePlayerContext = createContext<PlayerStoreApi | null>(null)

// ─── Context-aware hook ───────────────────────────────────────────────────────
//
// usePlayerStore reads from ScenePlayerContext when inside a ScenePlayerProvider,
// otherwise falls back to the global useBoundStore.
// This means SceneRenderer and PlaybackControls work in both contexts.

export function usePlayerStore<T>(selector: (s: PlayerState) => T): T {
  const playerStoreApi = useContext(ScenePlayerContext)

  // Inside a ScenePlayerProvider — use the isolated store
  if (playerStoreApi) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useStore(playerStoreApi, selector)
  }

  // Global context — map PlayerState fields from useBoundStore
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useBoundStore((globalState) => {
    const playerState: PlayerState = {
      activeScene: globalState.activeScene,
      setScene: globalState.setScene,
      clearScene: globalState.clearScene,
      currentStep: globalState.currentStep,
      isPlaying: globalState.isPlaying,
      speed: globalState.speed,
      totalSteps: globalState.totalSteps,
      play: globalState.play,
      pause: globalState.pause,
      stepForward: globalState.stepForward,
      stepBack: globalState.stepBack,
      reset: globalState.reset,
      setSpeed: globalState.setSpeed,
      jumpToStep: globalState.jumpToStep,
      setTotalSteps: globalState.setTotalSteps,
    }
    return selector(playerState)
  })
}
