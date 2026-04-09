import type { StateCreator } from 'zustand'
import type { Scene } from '@insyte/scene-engine'
import type { BoundStore } from '../store'

// ─── Types ────────────────────────────────────────────────────────────────────

type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T

export interface SceneSlice {
  // State
  activeScene: Scene | null
  draftScene: DeepPartial<Scene> | null
  isStreaming: boolean
  streamedFields: Set<string>
  isPatchGlowing: boolean
  patchGlowNonce: number

  // Actions
  setScene: (scene: Scene) => void
  updateScene: (partial: Partial<Scene>) => void
  clearScene: () => void

  setDraftScene: (partial: DeepPartial<Scene>) => void
  promoteDraftField: (field: keyof Scene) => void

  setStreaming: (val: boolean) => void
  markFieldStreamed: (field: string) => void
  triggerGlow: () => void
  clearGlow: () => void
}

// ─── Slice creator ────────────────────────────────────────────────────────────

export const createSceneSlice: StateCreator<
  BoundStore,
  [['zustand/immer', never]],
  [],
  SceneSlice
> = (set) => ({
  activeScene: null,
  draftScene: null,
  isStreaming: false,
  streamedFields: new Set<string>(),
  isPatchGlowing: false,
  patchGlowNonce: 0,

  setScene: (scene) =>
    set((state) => {
      state.activeScene = scene
    }),

  updateScene: (partial) =>
    set((state) => {
      if (state.activeScene) {
        Object.assign(state.activeScene, partial)
      }
    }),

  clearScene: () =>
    set((state) => {
      state.activeScene = null
      state.draftScene = null
      state.streamedFields = new Set()
    }),

  setDraftScene: (partial) =>
    set((state) => {
      state.draftScene = partial
    }),

  promoteDraftField: (field) =>
    set((state) => {
      if (!state.draftScene || state.draftScene[field] === undefined) return
      if (state.activeScene) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(state.activeScene as any)[field] = state.draftScene[field]
      }
      state.streamedFields.add(field as string)
    }),

  setStreaming: (val) =>
    set((state) => {
      state.isStreaming = val
    }),

  markFieldStreamed: (field) =>
    set((state) => {
      state.streamedFields.add(field)
    }),

  triggerGlow: () =>
    set((state) => {
      state.isPatchGlowing = true
      state.patchGlowNonce += 1
    }),

  clearGlow: () =>
    set((state) => {
      state.isPatchGlowing = false
    }),
})
