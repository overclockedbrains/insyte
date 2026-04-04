import type { StateCreator } from 'zustand'
import type { BoundStore } from '../store'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DetectedMode = 'concept' | 'dsa' | 'lld' | 'hld' | null

export interface DetectionSlice {
  // State
  inputText: string
  detectedMode: DetectedMode
  showConfirmation: boolean

  // Actions — client-side only, no SSR
  setInput: (text: string) => void
  setMode: (mode: DetectedMode) => void
  confirmDSA: () => void
  cancelDSA: () => void
}

// ─── Slice creator ────────────────────────────────────────────────────────────

export const createDetectionSlice: StateCreator<
  BoundStore,
  [['zustand/immer', never]],
  [],
  DetectionSlice
> = (set) => ({
  inputText: '',
  detectedMode: null,
  showConfirmation: false,

  setInput: (text) =>
    set((state) => {
      state.inputText = text
    }),

  setMode: (mode) =>
    set((state) => {
      state.detectedMode = mode
      // Show confirmation step when DSA is detected
      state.showConfirmation = mode === 'dsa'
    }),

  confirmDSA: () =>
    set((state) => {
      state.showConfirmation = false
    }),

  cancelDSA: () =>
    set((state) => {
      state.detectedMode = null
      state.showConfirmation = false
    }),
})
