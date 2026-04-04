import type { StateCreator } from 'zustand'
import type { BoundStore } from '../store'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Provider = 'gemini' | 'openai' | 'anthropic' | 'groq'

const DEFAULT_MODELS: Record<Provider, string> = {
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
  groq: 'llama-3.1-70b-versatile',
}

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
