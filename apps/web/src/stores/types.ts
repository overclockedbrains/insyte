import type { SceneSlice } from './slices/scene-slice'
import type { PlaybackSlice } from './slices/playback-slice'
import type { SettingsSlice } from './slices/settings-slice'
import type { ChatSlice } from './slices/chat-slice'
import type { DetectionSlice } from './slices/detection-slice'
import type { AuthSlice } from './slices/auth-slice'

export type BoundStore = SceneSlice &
  PlaybackSlice &
  SettingsSlice &
  ChatSlice &
  DetectionSlice &
  AuthSlice
