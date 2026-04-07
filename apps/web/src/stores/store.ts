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
import { createAuthSlice, type AuthSlice } from './slices/auth-slice'

// ─── Combined store type ──────────────────────────────────────────────────────

export type BoundStore = SceneSlice &
  PlaybackSlice &
  SettingsSlice &
  ChatSlice &
  DetectionSlice &
  AuthSlice

// ─── Single bound store ───────────────────────────────────────────────────────

export const useBoundStore = create<BoundStore>()(
  immer(
    persist(
      (...a) => ({
        ...createSceneSlice(...a),
        ...createPlaybackSlice(...a),
        ...createSettingsSlice(...a),
        ...createChatSlice(...a),
        ...createDetectionSlice(...a),
        ...createAuthSlice(...a),
      }),
      {
        name: 'insyte-settings',
        // Only persist the settings slice fields — auth + session state is ephemeral
        partialize: (state) => ({
          provider: state.provider,
          model: state.model,
          apiKeys: state.apiKeys,
        }),
      },
    ),
  ),
)
