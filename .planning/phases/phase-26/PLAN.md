# Phase 26 — Progressive Streaming Generation UX

**Goal:** Expose the 5-stage pipeline as a first-class UX. The user sees a skeleton from Stage 1 (~1.5s), primitive nodes populate from Stage 2 (~5s), explanation panel fills in from Stage 3, and the complete scene is ready at ~8–10s. Each stage has a distinct visual state. Errors are stage-specific with useful messages keyed by the `stage` field from `ValidationError`. This transforms the current "wait 8 seconds then see everything" into a "see something in 1.5 seconds" progressive reveal.

**Source research:** `ARCHITECTURE_V3.md` Part 2 §2.6, `ARCHITECTURE_RECOMMENDATIONS.md` Phase D §19, `ai-pipeline.md` §9

**Estimated effort:** 4–5 days

**Prerequisite:** Phase 25 (async generator pipeline with typed `GenerationEvent` and `ValidationError`)

---

## Generation State Machine

```
idle
  → generating:plan        (Stage 1 running — show shimmer skeleton)
  → generating:content     (Stages 2a+2b running — skeleton → primitive nodes)
  → generating:annotations (Stage 3 running — explanation panel fills)
  → generating:complete    (Stage 5 done — play button activates)
  → error:stage{n}         (any stage fails — show stage-specific message)
```

---

## What Actually Changes

### 1. `apps/web/src/stores/generation-store.ts` — New file

```typescript
import { create } from 'zustand'
import type { Scene } from '@insyte/scene-engine'
import type { GenerationEvent } from '../ai/pipeline'

export type GenerationPhase =
  | 'idle'
  | 'plan'        // Stage 1 complete — skeleton visible
  | 'content'     // Stage 2 complete — primitives visible
  | 'annotations' // Stage 3 complete — explanation visible
  | 'complete'    // Stage 5 complete — scene fully ready
  | 'error'

interface GenerationSkeleton {
  title: string
  visualCount: number
  stepCount: number
  layout: SceneLayout
}

interface GenerationState {
  phase: GenerationPhase
  skeleton: GenerationSkeleton | null
  partialScene: Partial<Scene> | null
  scene: Scene | null
  errorMessage: string | null
  errorStage: number | null
  isRetrying: boolean
}

interface GenerationActions {
  startGeneration: (topic: string, mode: SceneType) => Promise<void>
  retryGeneration: () => Promise<void>
  resetGeneration: () => void
  applyEvent: (event: GenerationEvent) => void
}

export const useGenerationStore = create<GenerationState & GenerationActions>((set, get) => ({
  phase: 'idle',
  skeleton: null,
  partialScene: null,
  scene: null,
  errorMessage: null,
  errorStage: null,
  isRetrying: false,

  applyEvent: (event: GenerationEvent) => {
    switch (event.type) {
      case 'plan':
        set({
          phase: 'plan',
          skeleton: {
            title: event.title,
            visualCount: event.visualCount,
            stepCount: event.stepCount,
            layout: event.layout,
          },
        })
        break

      case 'content':
        set(s => ({
          phase: 'content',
          partialScene: {
            ...s.partialScene,
            visuals: /* merge states into visual decls from skeleton */ [],
            steps: event.steps,
          },
        }))
        break

      case 'annotations':
        set(s => ({
          phase: 'annotations',
          partialScene: {
            ...s.partialScene,
            explanation: event.explanation,
            popups: event.popups,
          },
        }))
        break

      case 'complete':
        set({ phase: 'complete', scene: event.scene, partialScene: null })
        break

      case 'error':
        set({ phase: 'error', errorMessage: event.message, errorStage: event.stage })
        break
    }
  },

  startGeneration: async (topic, mode) => {
    set({ phase: 'plan', skeleton: null, partialScene: null, scene: null, errorMessage: null })

    const { applyEvent } = get()
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, mode }),
    })

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value)
      const lines = text.split('\n').filter(l => l.startsWith('data: '))

      for (const line of lines) {
        const event: GenerationEvent = JSON.parse(line.slice(6))
        applyEvent(event)
      }
    }
  },

  retryGeneration: async () => {
    // Retry using stored topic — implement by tracking last topic
    set({ isRetrying: true })
    // ... retry logic
  },

  resetGeneration: () => set({
    phase: 'idle', skeleton: null, partialScene: null, scene: null,
    errorMessage: null, errorStage: null, isRetrying: false,
  }),
}))
```

---

### 2. `apps/web/src/components/GenerationSkeleton.tsx` — New file

The skeleton renders when `phase === 'plan'`. Shows the correct number of placeholder primitive nodes:

```tsx
interface GenerationSkeletonProps {
  skeleton: GenerationSkeleton
}

export function GenerationSkeleton({ skeleton }: GenerationSkeletonProps) {
  return (
    <div className="flex flex-col gap-4 w-full h-full p-6">
      {/* Title skeleton */}
      <motion.div
        className="h-6 w-48 rounded-md bg-white/5"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Step counter skeleton */}
      <div className="text-xs text-white/30 font-mono">
        {skeleton.stepCount} steps · {skeleton.visualCount} visual{skeleton.visualCount !== 1 ? 's' : ''}
      </div>

      {/* Placeholder primitive cards */}
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: skeleton.visualCount }).map((_, i) => (
          <motion.div
            key={i}
            className="rounded-xl border border-white/5 bg-white/3 p-4"
            style={{
              width: 160 + (i % 3) * 20,  // varied widths for visual interest
              height: 100,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="h-3 w-full rounded bg-white/10 mb-2"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
            />
            <motion.div
              className="h-8 w-full rounded bg-white/5"
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 + 0.1 }}
            />
          </motion.div>
        ))}
      </div>

      {/* Stage progress indicator */}
      <GenerationProgress phase="plan" />
    </div>
  )
}
```

---

### 3. `apps/web/src/components/GenerationProgress.tsx` — New file

```tsx
const STAGES = [
  { key: 'plan',        label: 'Planning visualization' },
  { key: 'content',     label: 'Building visual states' },
  { key: 'annotations', label: 'Writing explanations' },
  { key: 'complete',    label: 'Ready' },
]

const PHASE_TO_STAGE_INDEX: Record<GenerationPhase, number> = {
  idle: -1, plan: 0, content: 1, annotations: 2, complete: 3, error: -1,
}

export function GenerationProgress({ phase }: { phase: GenerationPhase }) {
  const currentStage = PHASE_TO_STAGE_INDEX[phase]

  return (
    <div className="flex items-center gap-2 mt-4">
      {STAGES.map((stage, i) => (
        <div key={stage.key} className="flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full transition-colors duration-300',
            i < currentStage  ? 'bg-green-500' :
            i === currentStage ? 'bg-purple-500 animate-pulse' :
            'bg-white/10'
          )} />
          <span className={cn(
            'text-xs transition-colors duration-300',
            i <= currentStage ? 'text-white/60' : 'text-white/20'
          )}>
            {stage.label}
          </span>
          {i < STAGES.length - 1 && <div className="w-4 h-px bg-white/10" />}
        </div>
      ))}
    </div>
  )
}
```

---

### 4. `apps/web/src/components/GenerationError.tsx` — New file

Stage-specific error messages. The `stage` field comes directly from the pipeline's `ValidationError.stage` field, surfaced via the `{ type: 'error', stage }` GenerationEvent:

```tsx
const STAGE_MESSAGES: Record<number, { title: string; description: string }> = {
  1: {
    title: 'Visualization planning failed',
    description: 'The AI had trouble planning the visualization structure. Try rephrasing your topic or trying a simpler concept.',
  },
  2: {
    title: 'Visual state generation failed',
    description: 'The AI had trouble filling in the visual states or step sequence. This sometimes happens with complex algorithms.',
  },
  3: {
    title: 'Annotation generation failed',
    description: 'The explanations and popups couldn\'t be generated. The visualization may still work without them.',
  },
  5: {
    title: 'Assembly validation failed',
    description: 'The generated scene has internal consistency errors. Please try again.',
  },
}

export function GenerationError({ stage, message, onRetry }: {
  stage: number
  message: string
  onRetry: () => void
}) {
  const info = STAGE_MESSAGES[stage] ?? { title: 'Generation failed', description: message }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4 p-8 text-center"
    >
      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <span className="text-red-400 text-xl">✕</span>
      </div>
      <h3 className="text-white font-semibold">{info.title}</h3>
      <p className="text-white/50 text-sm max-w-sm">{info.description}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
      >
        Try again
      </button>
    </motion.div>
  )
}
```

---

### 5. Update `CanvasCard.tsx` — Handle all generation phases

```tsx
export function CanvasCard() {
  const { phase, skeleton, partialScene, scene } = useGenerationStore()
  const { errorMessage, errorStage, retryGeneration } = useGenerationStore()

  if (phase === 'idle') return <EmptyCanvasPlaceholder />
  if (phase === 'error') return <GenerationError stage={errorStage!} message={errorMessage!} onRetry={retryGeneration} />
  if (phase === 'plan' && skeleton) return <GenerationSkeleton skeleton={skeleton} />

  // phase === 'content' | 'annotations' | 'complete'
  const activeScene = scene ?? partialScene as Scene

  return (
    <>
      <SceneRenderer scene={activeScene} />
      {phase !== 'complete' && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <GenerationProgress phase={phase} />
        </div>
      )}
    </>
  )
}
```

---

### 6. Staggered node reveal animation (Stage 2 → content)

When `phase` transitions from `plan` to `content`, primitive nodes animate in with a stagger:

```typescript
// In DOMRenderer.tsx
useEffect(() => {
  if (prevPhase === 'plan' && phase === 'content') {
    // Stagger node entry — one visual at a time
    sceneGraph.groups.forEach((group, groupId, i) => {
      animate(`#group-${groupId}`, { opacity: [0, 1], y: [20, 0] }, {
        delay: i * 0.15,
        duration: 0.4,
        ease: 'easeOut',
      })
    })
  }
}, [phase])
```

---

### 7. Explanation panel fill-in animation (Stage 3 → annotations)

When `phase` transitions to `annotations`, the explanation panel animates in:

```typescript
// In ExplanationPanel.tsx
<AnimatePresence>
  {explanation.map((section, i) => (
    <motion.div
      key={section.appearsAtStep}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.1, duration: 0.3 }}
    >
      <ExplanationSection section={section} />
    </motion.div>
  ))}
</AnimatePresence>
```

---

### 8. Play button activation (Stage 5 → complete)

Play button is disabled and shows a spinner until `phase === 'complete'`:

```tsx
// In PlaybackControls.tsx
const { phase } = useGenerationStore()
const isReady = phase === 'complete'

<button
  disabled={!isReady}
  className={cn(
    'play-button',
    !isReady && 'opacity-40 cursor-not-allowed'
  )}
>
  {isReady ? <PlayIcon /> : <SpinnerIcon className="animate-spin" />}
</button>
```

---

## Files Changed Summary

| File | Action | Why |
|------|--------|-----|
| `apps/web/src/stores/generation-store.ts` | New | Typed generation state machine |
| `apps/web/src/components/GenerationSkeleton.tsx` | New | Skeleton with shimmer + placeholder nodes |
| `apps/web/src/components/GenerationProgress.tsx` | New | Stage-by-stage progress indicator |
| `apps/web/src/components/GenerationError.tsx` | New | Stage-specific error messages keyed by `stage` field |
| `apps/web/src/components/CanvasCard.tsx` | Edit | Handle all generation phases |
| `apps/web/src/components/renderers/DOMRenderer.tsx` | Edit | Staggered node reveal on content |
| `apps/web/src/components/ExplanationPanel.tsx` | Edit | Animated fill-in on annotations |
| `apps/web/src/components/PlaybackControls.tsx` | Edit | Disabled until complete |
| `apps/web/src/app/generate/page.tsx` | Edit | Wire generation store |

---

## User Experience Timeline

| Time | What user sees |
|------|---------------|
| 0s | User submits topic |
| 0.1s | Input collapses, navigation starts, skeleton canvas appears |
| 1.5s | Title appears, N placeholder visual cards animate in, stage 1 dot turns green |
| 4–5s | Placeholder cards replaced by actual primitive components with initial state |
| 6–7s | Explanation panel animates in (left panel fills) |
| 8–10s | Play button activates, challenges appear, scene is complete |
