import type { StateCreator } from 'zustand'
import type { BoundStore } from '../store'
import { DEFAULT_MODELS } from '@/src/ai/registry'
import type { Provider } from '@/src/ai/registry'

// Re-export Provider so existing imports of it from this file keep working.
export type { Provider }

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SettingsSlice {
  // State
  provider: Provider
  model: string
  apiKeys: Record<Provider, string | null>

  // Actions — keys never leave the client
  setApiKey: (provider: Provider, key: string) => void
  clearApiKey: (provider: Provider) => void
  clearAllKeys: () => void
  setProvider: (provider: Provider) => void
  setModel: (model: string) => void
}

// ─── Slice creator ────────────────────────────────────────────────────────────

export const createSettingsSlice: StateCreator<
  BoundStore,
  [['zustand/immer', never]],
  [],
  SettingsSlice
> = (set) => ({
  provider: 'gemini',
  model: DEFAULT_MODELS['gemini'],
  apiKeys: {
    gemini: null,
    openai: null,
    anthropic: null,
    groq: null,
  },

  setApiKey: (provider, key) =>
    set((state) => {
      state.apiKeys[provider] = key
    }),

  clearApiKey: (provider) =>
    set((state) => {
      state.apiKeys[provider] = null
    }),

  clearAllKeys: () =>
    set((state) => {
      state.apiKeys = { gemini: null, openai: null, anthropic: null, groq: null }
    }),

  setProvider: (provider) =>
    set((state) => {
      state.provider = provider
      state.model = DEFAULT_MODELS[provider]
    }),

  setModel: (model) =>
    set((state) => {
      state.model = model
    }),
})
