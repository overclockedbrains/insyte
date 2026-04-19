import type { StateCreator } from 'zustand'
import type { BoundStore } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DetectedMode = 'concept' | 'dsa' | 'lld' | 'hld' | null

// ─── detectMode (exported for use in components) ──────────────────────────────

/**
 * Detects the simulation mode from user input text.
 * - Contains code block or language keywords → 'dsa'
 * - "Design a ..." or system design keywords → 'hld'
 * - "LRU Cache" / "Rate Limiter" / "implement X" → 'lld'
 * - Otherwise → 'concept'
 * Returns null for empty input.
 */
export function detectMode(text: string): DetectedMode {
  if (!text.trim()) return null

  // Code detection: code fences or common programming keywords on their own line
  if (
    /```[\s\S]/.test(text) ||
    /(^|\n)\s*(def |class [A-Z]|function |const |let |var |=>|for\s*\(|while\s*\(|if\s*\()/.test(
      text,
    )
  ) {
    return 'dsa'
  }

  // LLD patterns — implement a specific data structure
  if (
    /\b(lru[\s-]cache|rate[\s-]limiter|min[\s-]stack|trie|design[\s-]hashmap|implement\s+(a|an|the)\s+\w+|implement\s+\w+)\b/i.test(
      text,
    )
  ) {
    return 'lld'
  }

  // HLD patterns — system design
  if (
    /\b(design\s+(a|an|the)|system\s+design|url[\s-]shortener|twitter|instagram|chat\s+system|consistent[\s-]hashing|distributed\s+system|architecture|scalab)\b/i.test(
      text,
    )
  ) {
    return 'hld'
  }

  // Default: concept simulation
  return 'concept'
}

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
