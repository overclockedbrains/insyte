'use client'

import { useShallow } from 'zustand/react/shallow'
import { useBoundStore } from './store'

// ─── Convenience selector hooks ───────────────────────────────────────────────
// Each hook selects only the fields it exposes, preventing unnecessary re-renders.
//
// IMPORTANT: selectors that return a new object literal must be wrapped in
// useShallow so Zustand compares the result field-by-field (Object.is per key)
// rather than by reference. Without it, every render produces a new object →
// useSyncExternalStore detects an ever-changing snapshot → infinite loop.



export function useSettings() {
  return useBoundStore(
    useShallow((s) => ({
      provider: s.provider,
      model: s.model,
      apiKeys: s.apiKeys,
      setApiKey: s.setApiKey,
      clearApiKey: s.clearApiKey,
      clearAllKeys: s.clearAllKeys,
      setProvider: s.setProvider,
      setModel: s.setModel,
    })),
  )
}


