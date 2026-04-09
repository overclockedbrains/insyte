import type { StateCreator } from 'zustand'
import type { BoundStore } from '../store'
import { DEFAULT_MODELS, REGISTRY } from '@/src/ai/registry'
import type { Provider } from '@/src/ai/registry'

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

function createEmptyApiKeys(): Record<Provider, string | null> {
  return Object.fromEntries(
    Object.keys(REGISTRY).map((provider) => [provider, null]),
  ) as Record<Provider, string | null>
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
  apiKeys: createEmptyApiKeys(),

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
      state.apiKeys = createEmptyApiKeys()
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
