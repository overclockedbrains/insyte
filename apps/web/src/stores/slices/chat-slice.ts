import type { StateCreator } from 'zustand'
import type { BoundStore } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface ChatSlice {
  // State
  isOpen: boolean
  isMinimized: boolean
  messages: ChatMessage[]
  isLoading: boolean

  // Actions
  openChat: () => void
  closeChat: () => void
  minimizeChat: () => void

  addMessage: (msg: ChatMessage) => void
  /** Convenience: push a user message with current timestamp */
  addUserMessage: (text: string) => void
  /** Convenience: push an empty assistant message (content filled by appendToLastMessage) */
  addAssistantMessage: (text?: string) => void
  setLoading: (val: boolean) => void
  clearHistory: () => void
  appendToLastMessage: (chunk: string) => void
  /** Replace the full content of the last assistant message (used to strip patch block) */
  setLastMessageContent: (content: string) => void
}

// ─── Slice creator ────────────────────────────────────────────────────────────

export const createChatSlice: StateCreator<
  BoundStore,
  [['zustand/immer', never]],
  [],
  ChatSlice
> = (set) => ({
  isOpen: false,
  isMinimized: false,
  messages: [],
  isLoading: false,

  openChat: () =>
    set((state) => {
      state.isOpen = true
      state.isMinimized = false
    }),

  closeChat: () =>
    set((state) => {
      state.isOpen = false
      state.isMinimized = false
      // Clear history on close — minimize preserves it
      state.messages = []
    }),

  minimizeChat: () =>
    set((state) => {
      state.isMinimized = true
    }),

  addMessage: (msg) =>
    set((state) => {
      state.messages.push(msg)
    }),

  addUserMessage: (text) =>
    set((state) => {
      state.messages.push({ role: 'user', content: text, timestamp: Date.now() })
    }),

  addAssistantMessage: (text = '') =>
    set((state) => {
      state.messages.push({ role: 'assistant', content: text, timestamp: Date.now() })
    }),

  setLoading: (val) =>
    set((state) => {
      state.isLoading = val
    }),

  clearHistory: () =>
    set((state) => {
      state.messages = []
    }),

  appendToLastMessage: (chunk) =>
    set((state) => {
      const last = state.messages[state.messages.length - 1]
      if (last && last.role === 'assistant') {
        last.content += chunk
      }
    }),

  setLastMessageContent: (content) =>
    set((state) => {
      const last = state.messages[state.messages.length - 1]
      if (last && last.role === 'assistant') {
        last.content = content
      }
    }),
})
