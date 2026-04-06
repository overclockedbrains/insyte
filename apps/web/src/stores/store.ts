import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'
import { enableMapSet } from 'immer'

enableMapSet()

import { createSceneSlice, type SceneSlice } from './slices/scene-slice'
import { createPlaybackSlice, type PlaybackSlice } from './slices/playback-slice'
import { createSettingsSlice, type SettingsSlice } from './slices/settings-slice'
import { createChatSlice, type ChatSlice } from './slices/chat-slice'
import { createDetectionSlice, type DetectionSlice } from './slices/detection-slice'

// ─── Combined store type ──────────────────────────────────────────────────────

export type BoundStore = SceneSlice &
  PlaybackSlice &
  SettingsSlice &
  ChatSlice &
  DetectionSlice

// ─── Single bound store ───────────────────────────────────────────────────────
//
// One useBoundStore is the single source of truth for all app state.
// - immer middleware: clean immutable updates in slice creators
// - persist middleware: only settings fields written to localStorage
//
// Cross-slice actions (e.g. chat patch that also pauses playback) must be written
// in the initiating slice and issue a single set() call spanning multiple slices.

export const useBoundStore = create<BoundStore>()(
  immer(
    persist(
      (...a) => ({
        ...createSceneSlice(...a),
        ...createPlaybackSlice(...a),
        ...createSettingsSlice(...a),
        ...createChatSlice(...a),
        ...createDetectionSlice(...a),
      }),
      {
        name: 'insyte-settings',
        // Only persist the settings slice fields — session state is ephemeral
        partialize: (state) => ({
          provider: state.provider,
          model: state.model,
          apiKeys: state.apiKeys,
        }),
      },
    ),
  ),
)
