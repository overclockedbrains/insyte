import { useState, useEffect, useRef } from 'react'
import type React from 'react'

interface CanvasDimensions {
  width: number
  height: number
}

/**
 * Track the pixel dimensions of the canvas container via ResizeObserver.
 * Returns a ref to attach to the container element + the current dimensions.
 *
 * Used by:
 *   - ViewportControls (Phase 29): zoom-to-fit needs container size.
 *   - useAutoFit (Phase 29): determines whether content overflows at 1x scale.
 *   - ELK layout (Phase 28): container size informs initial zoom level.
 */
export function useCanvasDimensions(): {
  ref: React.RefObject<HTMLDivElement | null>
  width: number
  height: number
} {
  const ref = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState<CanvasDimensions>({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Capture initial size immediately
    setDims({ width: el.clientWidth, height: el.clientHeight })

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setDims({ width, height })
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, ...dims }
}
