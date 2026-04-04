import type { StateCreator } from 'zustand'
import type { BoundStore } from '../store'

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
  setLoading: (val: boolean) => void
  clearHistory: () => void
  appendToLastMessage: (chunk: string) => void
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
    }),

  minimizeChat: () =>
    set((state) => {
      state.isMinimized = true
    }),

  addMessage: (msg) =>
    set((state) => {
      state.messages.push(msg)
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
})
