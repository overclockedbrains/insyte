import type { StateCreator } from 'zustand'
import type { BoundStore } from '../types'

export type ThemeName = 'default' | 'aurora' | 'ember' | 'ocean' | 'rose' | 'midnight' | 'forest' | 'light'

export interface ThemeSlice {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
}

export const THEMES: { name: ThemeName; label: string; primary: string; secondary: string; mode: 'dark' | 'light' }[] = [
  // ── Dark themes ──
  { name: 'default',  label: 'Nebula',    primary: '#b79fff', secondary: '#3adffa', mode: 'dark' },
  { name: 'midnight', label: 'Midnight',  primary: '#818cf8', secondary: '#a78bfa', mode: 'dark' },
  { name: 'ocean',    label: 'Ocean',     primary: '#38bdf8', secondary: '#818cf8', mode: 'dark' },
  { name: 'aurora',   label: 'Aurora',    primary: '#4ade80', secondary: '#22d3ee', mode: 'dark' },
  { name: 'forest',   label: 'Forest',    primary: '#6ee7b7', secondary: '#fb923c', mode: 'dark' },
  { name: 'ember',    label: 'Ember',     primary: '#fb923c', secondary: '#f43f5e', mode: 'dark' },
  { name: 'rose',     label: 'Rose',      primary: '#f472b6', secondary: '#c084fc', mode: 'dark' },
  // ── Light themes ──
  { name: 'light',    label: 'Daylight',  primary: '#5b3fd8', secondary: '#0891b2', mode: 'light' },
]

export const createThemeSlice: StateCreator<
  BoundStore,
  [['zustand/immer', never]],
  [],
  ThemeSlice
> = (set) => ({
  theme: 'default',

  setTheme: (theme) => {
    // Apply data-theme to DOM immediately — before Zustand notifies subscribers
    // so that readCSSVar() inside resolveHighlight/getLivePrimary/etc returns
    // fresh CSS var values when components re-render from this state change.
    if (typeof document !== 'undefined') {
      if (!theme || theme === 'default') document.documentElement.removeAttribute('data-theme')
      else document.documentElement.dataset.theme = theme
    }
    set((state) => { state.theme = theme })
  },
})
