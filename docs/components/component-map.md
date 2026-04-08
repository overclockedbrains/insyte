# Component Map

This document explains what UI component groups exist and how they connect to the simulation runtime.

## Top-Level Component Folders (`apps/web/components`)

| Folder | Responsibility | Key Files |
| --- | --- | --- |
| `landing` | Homepage hero, prompt intake, featured sections | `UnifiedInput.tsx`, `LiveDemoLoader.tsx`, `HowItWorks.tsx` |
| `simulation` | Streaming states and simulation-specific UX | `StreamingView.tsx`, `StreamingSkeleton.tsx`, `ChallengesSection.tsx` |
| `chat` | In-scene tutor UI and stream handling | `ChatCard.tsx`, `ChatButton.tsx`, `useChatStream.ts` |
| `settings` | Provider/model/key management UI | `ProviderSelector.tsx`, `ModelSelector.tsx`, `ApiKeyInput.tsx` |
| `explore` | Discover/search curated topics | `SearchBar.tsx`, `TopicRow.tsx`, `TopicCard.tsx` |
| `auth` | Auth provider lifecycle and modal | `AuthProvider.tsx`, `AuthModal.tsx` |
| `layout` | Global chrome and visual background layers | `Navbar.tsx`, `Footer.tsx`, `GlowEffect.tsx` |
| `ui` | Shared design-system primitives | `button.tsx`, `dialog.tsx`, `slider.tsx`, `tabs.tsx` |
| `skeleton` | Generic loading placeholders | `SkeletonSimulation.tsx`, `SkeletonText.tsx` |

## Simulation Rendering Stack

Runtime rendering is layered and mostly driven from `src/engine`:

1. `SimulationLayout.tsx` selects layout mode (`canvas-only`, `text-left-canvas-right`, `code-left-canvas-right`).
2. `SceneRenderer.tsx` composes canvas area + annotation/panel regions.
3. `PrimitiveRegistry` maps `visual.type` to concrete visual components.
4. Primitive components render computed visual state for `currentStep`.
5. Playback controls mutate store state (`currentStep`, `isPlaying`, `speed`).

## Primary Feature Entry Components

| Feature | Entry Component | Notes |
| --- | --- | --- |
| Prompt intake | `components/landing/UnifiedInput.tsx` | Detects mode and routes to `/s/[slug]` |
| Scene streaming | `components/simulation/StreamingView.tsx` | Starts `useStreamScene` and handles skeleton/error/success states |
| DSA pipeline | `app/s/[slug]/DSAPipelineView.tsx` | Runs instrument -> sandbox execute -> visualize-trace flow |
| Main player | `src/engine/SimulationLayout.tsx` | Shared player shell for static, streamed, and DSA scenes |
| Live tutor | `components/chat/ChatCard.tsx` + `components/chat/useChatStream.ts` | Streams replies and applies optional scene patches |

## State Coupling (What Reads/Writes Store)

| Slice | Main Consumers |
| --- | --- |
| `scene-slice` | `StreamingView`, `SimulationLayout`, chat patch application |
| `playback-slice` | `PlaybackControls`, renderer hooks, step annotations |
| `settings-slice` | Settings page + all BYOK request header builders |
| `chat-slice` | `ChatCard`, `useChatStream` |
| `detection-slice` | `UnifiedInput` |
| `auth-slice` | `AuthProvider`, auth modal and profile gating |

## Where To Add New UI

| If you are adding... | Place it in... |
| --- | --- |
| New landing section | `components/landing` |
| New simulation panel/interaction | `components/simulation` or `src/engine/*` |
| New reusable visual primitive | `src/engine/primitives` + registry update |
| New generic design-system atom | `components/ui` |
| New app-level route shell | `app/<route>/page.tsx` (+ optional client boundary component) |

