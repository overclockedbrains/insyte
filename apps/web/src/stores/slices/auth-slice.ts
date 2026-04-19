import type { StateCreator } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import type { BoundStore } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthSlice {
  // State
  user: User | null
  session: Session | null
  authLoading: boolean
  authModalOpen: boolean

  // Actions
  setSession: (session: Session | null) => void
  setAuthLoading: (loading: boolean) => void
  openAuthModal: () => void
  closeAuthModal: () => void
}

// ─── Slice creator ────────────────────────────────────────────────────────────

export const createAuthSlice: StateCreator<
  BoundStore,
  [['zustand/immer', never]],
  [],
  AuthSlice
> = (set) => ({
  user: null,
  session: null,
  authLoading: true, // true on first mount — gets resolved by initAuth()
  authModalOpen: false,

  setSession: (session) =>
    set((state) => {
      state.session = session
      state.user = session?.user ?? null
      state.authLoading = false
    }),

  setAuthLoading: (loading) =>
    set((state) => {
      state.authLoading = loading
    }),

  openAuthModal: () =>
    set((state) => {
      state.authModalOpen = true
    }),

  closeAuthModal: () =>
    set((state) => {
      state.authModalOpen = false
    }),
})
