'use client'

import { useBoundStore } from '@/src/stores/store'

/**
 * Subscribes the calling component to theme changes.
 * Call this in any viz/connector component that uses resolveHighlight,
 * getGridCellColors, getLivePrimary, etc. — it forces a re-render when
 * the user switches themes so the live CSS var reads pick up fresh values.
 */
export function useThemeSync() {
  return useBoundStore((s) => s.theme)
}
