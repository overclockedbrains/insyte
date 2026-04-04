'use client'

import { usePlayerStore } from '@/src/stores/player-store'
import type { Scene } from '@insyte/scene-engine'

/** Returns the currently active Scene, or null if none is loaded. */
export function useActiveScene(): Scene | null {
  return usePlayerStore((s) => s.activeScene)
}

/** Returns a specific visual from the active scene by id, or null. */
export function useVisual(id: string) {
  return usePlayerStore((s) => s.activeScene?.visuals.find((v) => v.id === id) ?? null)
}

/** Returns all visuals from the active scene. */
export function useVisuals() {
  return usePlayerStore((s) => s.activeScene?.visuals ?? [])
}

/** Returns all controls from the active scene. */
export function useControls() {
  return usePlayerStore((s) => s.activeScene?.controls ?? [])
}

/** Returns explanation sections from the active scene. */
export function useExplanation() {
  return usePlayerStore((s) => s.activeScene?.explanation ?? [])
}

/** Returns all popups from the active scene. */
export function usePopups() {
  return usePlayerStore((s) => s.activeScene?.popups ?? [])
}
