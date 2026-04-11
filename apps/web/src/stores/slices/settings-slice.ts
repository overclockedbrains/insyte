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

  // Local & custom endpoint config
  ollamaBaseURL: string
  customBaseURL: string
  customApiKey: string
  customModelId: string

  // Actions — keys never leave the client
  setApiKey: (provider: Provider, key: string) => void
  clearApiKey: (provider: Provider) => void
  clearAllKeys: () => void
  setProvider: (provider: Provider) => void
  setModel: (model: string) => void
  setOllamaBaseURL: (url: string) => void
  setCustomBaseURL: (url: string) => void
  setCustomApiKey: (key: string) => void
  setCustomModelId: (id: string) => void
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

  // Local & custom endpoint defaults
  ollamaBaseURL: 'http://localhost:11434/v1',
  customBaseURL: '',
  customApiKey: '',
  customModelId: '',

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
      // Restore previously configured model for custom endpoint
      if (provider === 'custom' && state.customModelId) {
        state.model = state.customModelId
      } else {
        state.model = DEFAULT_MODELS[provider] ?? ''
      }
    }),

  setModel: (model) =>
    set((state) => {
      state.model = model
    }),

  setOllamaBaseURL: (url) =>
    set((state) => {
      state.ollamaBaseURL = url
    }),

  setCustomBaseURL: (url) =>
    set((state) => {
      state.customBaseURL = url
    }),

  setCustomApiKey: (key) =>
    set((state) => {
      state.customApiKey = key
    }),

  setCustomModelId: (id) =>
    set((state) => {
      state.customModelId = id
      // Keep model in sync when custom is the active provider
      if (state.provider === 'custom') {
        state.model = id
      }
    }),
})
