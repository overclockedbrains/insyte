import { create, type UseBoundStore, type StoreApi } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'
import { enableMapSet } from 'immer'

enableMapSet()

import { createSceneSlice } from './slices/scene-slice'
import { createPlaybackSlice } from './slices/playback-slice'
import { createSettingsSlice } from './slices/settings-slice'
import { createChatSlice } from './slices/chat-slice'
import { createDetectionSlice } from './slices/detection-slice'
import { createAuthSlice } from './slices/auth-slice'
import { createThemeSlice } from './slices/theme-slice'
import { type BoundStore } from './types'

export type { BoundStore }

// ─── Single bound store ───────────────────────────────────────────────────────

export const useBoundStore: UseBoundStore<StoreApi<BoundStore>> = create<BoundStore>()(
  immer(
    persist(
      (...a) => ({
        ...createSceneSlice(...a),
        ...createPlaybackSlice(...a),
        ...createSettingsSlice(...a),
        ...createChatSlice(...a),
        ...createDetectionSlice(...a),
        ...createAuthSlice(...a),
        ...createThemeSlice(...a),
      }),
      {
        name: 'insyte-settings',
        // Only persist the settings slice fields — auth + session state is ephemeral
        partialize: (state) => ({
          provider: state.provider,
          model: state.model,
          apiKeys: state.apiKeys,
          ollamaBaseURL: state.ollamaBaseURL,
          customBaseURL: state.customBaseURL,
          customApiKey: state.customApiKey,
          customModelId: state.customModelId,
          theme: state.theme,
        }),
      },
    ),
  ),
)
