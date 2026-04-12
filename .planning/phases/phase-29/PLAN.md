# Phase 29 — Zoom/Pan Viewport & Interactive Canvas

**Goal:** Add zoom and pan to the canvas zone, enabling users to navigate large graphs, system diagrams, and recursion trees that exceed the visible area. Uses the React Flow approach: a CSS transform viewport that updates at native browser speed with zero React re-renders during pan/zoom. Includes zoom-to-fit on scene load and mobile pinch-to-zoom.

**Source research:** `canvas-libs-analysis.md` §2 (Zoom/Pan), `ARCHITECTURE_V3.md` Part 4 §4.4, `existing-tools-analysis.md` §2 (Excalidraw zoom) + §3 (React Flow viewport), `rendering-approach.md` §2

**Estimated effort:** 4–5 days

**Prerequisite:** Phase 22 (scene graph provides the bounding box for zoom-to-fit) + Phase 23 (`useCanvasDimensions` from Scene Runtime provides container dimensions)

---

## Architecture: CSS Transform Viewport

```
CanvasCard (overflow: hidden, position: relative)
  └─ ViewportContainer (transform: translate(Xpx, Ypx) scale(Z))
       ├─ sceneGraph nodes (absolutely positioned within viewport)
       └─ SVG edge overlay (position: absolute, inset 0)

Pan:   update translateX, translateY via pointer events → one CSS transform → zero React re-renders
Zoom:  update scale via wheel event → same CSS transform
Fit:   compute scale/translate to center bounding box → animate CSS transform once
```

The viewport `transform` is managed via a `useRef` (not `useState`) to avoid React re-renders during pan/zoom. The transform is applied imperatively to the DOM element.

---

## What Actually Changes

### 1. `apps/web/src/stores/viewport-store.ts` — New file

```typescript
import { create } from 'zustand'

interface ViewportState {
  translateX: number
  translateY: number
  scale: number
  minScale: number
  maxScale: number
}

interface ViewportActions {
  setTranslate: (x: number, y: number) => void
  setScale: (scale: number, originX: number, originY: number) => void
  zoomToFit: (boundingBox: { minX: number; minY: number; maxX: number; maxY: number }, containerW: number, containerH: number) => void
  reset: () => void
}

export const useViewportStore = create<ViewportState & ViewportActions>((set, get) => ({
  translateX: 0,
  translateY: 0,
  scale: 1,
  minScale: 0.25,
  maxScale: 3,

  setTranslate: (x, y) => set({ translateX: x, translateY: y }),

  setScale: (newScale, originX, originY) => {
    const { scale, translateX, translateY, minScale, maxScale } = get()
    const clampedScale = Math.max(minScale, Math.min(maxScale, newScale))
    
    // Zoom toward cursor: adjust translate so the point under cursor stays fixed
    const scaleDelta = clampedScale / scale
    set({
      scale: clampedScale,
      translateX: originX - (originX - translateX) * scaleDelta,
      translateY: originY - (originY - translateY) * scaleDelta,
    })
  },

  zoomToFit: (bbox, containerW, containerH) => {
    const PADDING = 48
    const contentW = bbox.maxX - bbox.minX
    const contentH = bbox.maxY - bbox.minY

    if (contentW === 0 || contentH === 0) return

    const scaleX = (containerW - PADDING * 2) / contentW
    const scaleY = (containerH - PADDING * 2) / contentH
    const scale = Math.min(scaleX, scaleY, 2)  // cap at 2x zoom

    // Center the content in the container
    const translateX = (containerW - contentW * scale) / 2 - bbox.minX * scale
    const translateY = (containerH - contentH * scale) / 2 - bbox.minY * scale

    set({ scale, translateX, translateY })
  },

  reset: () => set({ translateX: 0, translateY: 0, scale: 1 }),
}))
```

---

### 2. `apps/web/src/components/ViewportContainer.tsx` — New file

```tsx
import { useRef, useEffect, useCallback } from 'react'
import { useViewportStore } from '../stores/viewport-store'

interface ViewportContainerProps {
  children: React.ReactNode
  onPanZoom?: (viewport: { translateX: number; translateY: number; scale: number }) => void
}

export function ViewportContainer({ children, onPanZoom }: ViewportContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  
  const { translateX, translateY, scale, setTranslate, setScale } = useViewportStore()

  // Apply transform imperatively — no React re-render on pan/zoom
  useEffect(() => {
    if (!innerRef.current) return
    innerRef.current.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`
    onPanZoom?.({ translateX, translateY, scale })
  }, [translateX, translateY, scale])

  // ─── Mouse wheel zoom ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const originX = e.clientX - rect.left
      const originY = e.clientY - rect.top
      const delta = e.deltaY > 0 ? 0.9 : 1.1  // zoom out / in
      setScale(scale * delta, originX, originY)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [scale, setScale])

  // ─── Mouse drag pan ───────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return  // left click or middle click
    isDragging.current = true
    lastPointer.current = { x: e.clientX, y: e.clientY }
    containerRef.current?.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastPointer.current.x
    const dy = e.clientY - lastPointer.current.y
    lastPointer.current = { x: e.clientX, y: e.clientY }
    setTranslate(translateX + dx, translateY + dy)
  }, [translateX, translateY, setTranslate])

  const onPointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  // ─── Touch pinch-to-zoom ──────────────────────────────────────────────────
  const lastPinchDist = useRef<number | null>(null)

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2) return
    e.preventDefault()

    const t1 = e.touches[0]
    const t2 = e.touches[1]
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
    const rect = containerRef.current!.getBoundingClientRect()
    const originX = ((t1.clientX + t2.clientX) / 2) - rect.left
    const originY = ((t1.clientY + t2.clientY) / 2) - rect.top

    if (lastPinchDist.current !== null) {
      const delta = dist / lastPinchDist.current
      setScale(scale * delta, originX, originY)
    }

    lastPinchDist.current = dist
  }, [scale, setScale])

  const onTouchEnd = useCallback(() => {
    lastPinchDist.current = null
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'none' }}
    >
      <div
        ref={innerRef}
        style={{
          transformOrigin: '0 0',
          willChange: 'transform',  // promote to compositor layer
        }}
      >
        {children}
      </div>
    </div>
  )
}
```

---

### 3. `apps/web/src/components/ViewportControls.tsx` — New file (HUD buttons)

```tsx
import { ZoomInIcon, ZoomOutIcon, MaximizeIcon } from 'lucide-react'
import { useViewportStore } from '../stores/viewport-store'
import { useCanvasDimensions } from '../hooks/useCanvasDimensions'

export function ViewportControls({ sceneGraph }: { sceneGraph: SceneGraph | null }) {
  const { scale, setScale, zoomToFit } = useViewportStore()
  const { width, height } = useCanvasDimensions()

  const handleFit = () => {
    if (!sceneGraph) return
    // Compute bounding box from all positioned nodes
    const allNodes = [...sceneGraph.nodes.values()]
    if (allNodes.length === 0) return

    const bbox = {
      minX: Math.min(...allNodes.map(n => n.x - n.width / 2)),
      minY: Math.min(...allNodes.map(n => n.y - n.height / 2)),
      maxX: Math.max(...allNodes.map(n => n.x + n.width / 2)),
      maxY: Math.max(...allNodes.map(n => n.y + n.height / 2)),
    }

    zoomToFit(bbox, width, height)
  }

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
      <button
        onClick={() => setScale(scale * 1.2, width / 2, height / 2)}
        className="w-8 h-8 rounded glass-panel flex items-center justify-center text-white/60 hover:text-white transition-colors"
        title="Zoom in"
      >
        <ZoomInIcon size={14} />
      </button>
      <button
        onClick={() => setScale(scale / 1.2, width / 2, height / 2)}
        className="w-8 h-8 rounded glass-panel flex items-center justify-center text-white/60 hover:text-white transition-colors"
        title="Zoom out"
      >
        <ZoomOutIcon size={14} />
      </button>
      <button
        onClick={handleFit}
        className="w-8 h-8 rounded glass-panel flex items-center justify-center text-white/60 hover:text-white transition-colors"
        title="Fit to screen"
      >
        <MaximizeIcon size={14} />
      </button>
      <div className="w-8 h-6 flex items-center justify-center text-white/30 text-[10px] font-mono">
        {Math.round(scale * 100)}%
      </div>
    </div>
  )
}
```

---

### 4. Wrap DOMRenderer in ViewportContainer

```tsx
// apps/web/src/components/CanvasCard.tsx
import { ViewportContainer } from './ViewportContainer'
import { ViewportControls } from './ViewportControls'

export function CanvasCard({ scene }: { scene: Scene }) {
  // ...
  return (
    <div className="relative w-full h-full">
      <ViewportContainer>
        <DOMRenderer sceneGraph={sceneGraph} step={currentStep} isPlaying={isPlaying} speed={speed} />
      </ViewportContainer>
      <ViewportControls sceneGraph={sceneGraph} />
    </div>
  )
}
```

---

### 5. Auto zoom-to-fit on scene load

When a scene first loads (generation complete), zoom to fit automatically:

```typescript
// apps/web/src/hooks/useAutoFit.ts
export function useAutoFit(sceneGraph: SceneGraph | null, dims: { width: number; height: number }) {
  const { zoomToFit } = useViewportStore()
  const didFit = useRef(false)
  // Track previous scene identity (title at step 0) to reset on new scene
  const prevSceneTitle = useRef<string | null>(null)

  useEffect(() => {
    if (!sceneGraph || sceneGraph.nodes.size === 0) return

    // Detect new scene: step 0 with different topology is a new generation
    const currentTitle = sceneGraph.stepIndex === 0
      ? [...sceneGraph.groups.keys()].join('|')
      : null

    if (currentTitle !== null && currentTitle !== prevSceneTitle.current) {
      didFit.current = false
      prevSceneTitle.current = currentTitle
    }

    if (didFit.current) return

    const allNodes = [...sceneGraph.nodes.values()]
    const bbox = {
      minX: Math.min(...allNodes.map(n => n.x - n.width / 2)),
      minY: Math.min(...allNodes.map(n => n.y - n.height / 2)),
      maxX: Math.max(...allNodes.map(n => n.x + n.width / 2)),
      maxY: Math.max(...allNodes.map(n => n.y + n.height / 2)),
    }

    // Only auto-fit if content doesn't naturally fit at 1x scale
    const contentW = bbox.maxX - bbox.minX
    const contentH = bbox.maxY - bbox.minY
    if (contentW > dims.width * 0.9 || contentH > dims.height * 0.9) {
      zoomToFit(bbox, dims.width, dims.height)
    }

    didFit.current = true
  }, [sceneGraph, dims.width, dims.height])
}
```

---

### 6. Reset viewport on step reset

When the user clicks "Reset" (step 0), reset viewport to zoom-to-fit:

```typescript
// In usePlaybackKeyboard.ts (Phase 27)
case 'Home':
  reset()
  // Also reset viewport
  const { zoomToFit } = useViewportStore.getState()
  zoomToFit(currentBbox, dims.width, dims.height)
  break
```

---

### 7. Keyboard zoom controls

Extend keyboard controls from Phase 27:

```typescript
case '+':
case '=':
  setScale(scale * 1.2, dims.width / 2, dims.height / 2)
  break
case '-':
  setScale(scale / 1.2, dims.width / 2, dims.height / 2)
  break
case '0':
  zoomToFit(currentBbox, dims.width, dims.height)
  break
```

---

### 8. Only apply viewport to canvas zone

The viewport must NOT wrap explanation panels, playback controls, or the HUD. Only the canvas content zone gets the viewport treatment:

```
SimulationPage
├─ ExplanationPanel (no viewport)
├─ CanvasZone
│   ├─ ViewportContainer (ONLY this is the viewport)
│   │   └─ DOMRenderer
│   └─ ViewportControls (HUD overlay, outside ViewportContainer)
└─ PlaybackControls (no viewport)
```

---

### 9. Performance optimization: `willChange: 'transform'`

The `ViewportContainer` inner div gets `willChange: 'transform'` which tells the browser to promote this layer to a GPU compositor layer. This makes pan/zoom silky-smooth even on mid-range devices — the browser compositor handles the transform without the JavaScript engine or React reconciler.

---

## When Viewport Is Useful

Not all scenes need zoom/pan. Simple scenes (arrays, stacks, counters) fit naturally without it. The viewport is **always available** but only essential for:
- System diagrams (5–15 boxes, HLD scenes)
- Large graphs (10+ nodes)
- Deep recursion trees (depth ≥ 4)
- Complex linked lists (10+ nodes)

The auto-fit on load ensures the user always sees the full scene — they can then zoom in on specific parts.

---

## Files Changed Summary

| File | Action | Why |
|------|--------|-----|
| `apps/web/src/stores/viewport-store.ts` | New | Zoom/pan state (not in React state during pan/zoom) |
| `apps/web/src/components/ViewportContainer.tsx` | New | CSS transform viewport with event handlers |
| `apps/web/src/components/ViewportControls.tsx` | New | HUD zoom-in/zoom-out/fit buttons |
| `apps/web/src/hooks/useAutoFit.ts` | New | Auto zoom-to-fit on scene load |
| `apps/web/src/components/CanvasCard.tsx` | Edit | Wrap DOMRenderer with ViewportContainer |
| `apps/web/src/hooks/usePlaybackKeyboard.ts` | Edit | Add +/-/0 zoom keyboard controls |
