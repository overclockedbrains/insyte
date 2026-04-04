# Phase 8 — AI Chat + Scene Patching

**Goal:** Floating `💬` button → expandable glass morphism chat card with live streaming AI responses that can patch the active simulation.

**Entry criteria:** Phase 7 complete. AI generation pipeline working. Active scene in scene-store.

---

## Tasks

### 8.1 — AI chat prompt
Create `apps/web/src/ai/prompts/live-chat.md`:
- [ ] System: You are an expert tutor helping users understand the active simulation. You have context about the current simulation and the user's current step.
- [ ] Context block: `{sceneTitle}`, `{sceneType}`, `{currentStep}`, `{currentExplanation}`, `{visuals summary}`
- [ ] Response format:
  - Text response for explanations/questions
  - Optional `scenePatch` object for visual modifications:
    ```json
    {
      "text": "Here's what I'll show you...",
      "patch": {
        "type": "add-steps",
        "steps": [...]
      }
    }
    ```
- [ ] Patch types:
  - `add-steps` — append new animation steps
  - `update-popup` — change popup text at a step
  - `add-visual` — add a new primitive to canvas
  - `update-visual` — change a visual's state
- [ ] Instruct AI: keep patches minimal, targeted, additive — never replace the whole scene

### 8.2 — applyDiff function
Create `apps/web/src/ai/applyDiff.ts`:
- [ ] `applyDiff(scene: Scene, patch: ScenePatch): Scene`
- [ ] `ScenePatch` type: `{ type: 'add-steps'|'update-popup'|'add-visual'|'update-visual'; payload: unknown }`
- [ ] `add-steps`: appends `patch.steps` to `scene.steps`, updates `scene.steps.length`
- [ ] `update-popup`: finds popup by id, updates text
- [ ] `add-visual`: appends to `scene.visuals`, validates the new visual has required fields
- [ ] `update-visual`: finds visual by id, merges `initialState`
- [ ] Returns a new Scene object (immutable — no mutation of input)
- [ ] Validates the result with `safeParseScene()` before returning

### 8.3 — liveChat function
Create `apps/web/src/ai/liveChat.ts`:
- [ ] `streamChatResponse(message: string, scene: Scene, step: number, settings: SettingsState): ReadableStream`
- [ ] Builds context from scene (title, type, current step's explanation text, visual types)
- [ ] Calls `streamText({ model, system: chatPrompt, messages: [...history, userMessage] })`
- [ ] Streams text + optionally emits a `scenePatch` object at end of response

### 8.4 — `/api/chat` route
Create `apps/web/src/app/api/chat/route.ts`:
- [ ] POST: `{ message: string, sceneContext: { title, type, step, visuals }, history: ChatMessage[] }`
- [ ] Server uses Gemini Flash key
- [ ] BYOK: if `X-API-Key` header present, use that key
- [ ] Calls `streamChatResponse()`, returns streaming response
- [ ] Stream format: text chunks + optional `scenePatch` JSON at end (as a special stream part)
- [ ] Rate limiting: IP-based counter (same as /api/generate, Phase 11 completes)

### 8.5 — ChatButton component
Create `apps/web/src/components/chat/ChatButton.tsx`:
- [ ] Fixed bottom-right position: `fixed bottom-6 right-6 z-50`
- [ ] Round button: `w-14 h-14 rounded-full bg-surface-container border border-primary/20`
- [ ] `💬` icon (Lucide `MessageCircle`)
- [ ] Subtle pulse animation when no chat open: `animate-pulse` on a background glow ring
- [ ] Click: expands chat card
- [ ] When chat is open: icon changes to minimize symbol

### 8.6 — ChatCard component
Create `apps/web/src/components/chat/ChatCard.tsx`:
- [ ] **Desktop:** 320px wide × 420px tall, `fixed bottom-24 right-6 z-50`
- [ ] Glass morphism: `.glass-panel rounded-3xl border border-primary/20 shadow-2xl`
- [ ] Primary glow border: `box-shadow: 0 0 30px rgba(183,159,255,0.15)`
- [ ] Header: "Ask insyte" + `[─ Minimize]` + `[× Close]` buttons
- [ ] Message history: scrollable area, `overflow-y-auto`, `flex flex-col gap-3`
- [ ] User message: `rounded-2xl bg-surface-container-high px-4 py-2 self-end max-w-[85%]`
- [ ] AI message: no bubble, just text with subtle left border in primary color; streaming with typing cursor
- [ ] Input area: `<textarea>` at bottom, auto-resize, max 3 lines; `Enter` submits, `Shift+Enter` newline
- [ ] Send button: `[→]` icon
- [ ] Loading indicator: 3 animated dots when AI is responding
- [ ] Entry animation: `initial={{ opacity:0, scale:0.95, y:20 }} animate={{ opacity:1, scale:1, y:0 }}`

### 8.7 — Chat state management
In `chat-store.ts` (from Phase 2):
- [ ] `isOpen: boolean` — chat card visible
- [ ] `isMinimized: boolean` — card hidden but history preserved
- [ ] `openChat()`, `closeChat()`, `minimizeChat()`
- [ ] `addUserMessage(text: string)`, `addAssistantMessage(text: string)`, `appendToLastMessage(chunk: string)`
- [ ] On `isOpen: false`: history is cleared
- [ ] On `isMinimized: true`: history preserved, card hidden

### 8.8 — Streaming response handler in client
Create `apps/web/src/components/chat/useChatStream.ts`:
- [ ] Calls `/api/chat` with message + scene context
- [ ] Reads streaming response, dispatches text chunks to `chat-store.appendToLastMessage()`
- [ ] Detects `scenePatch` marker in stream
- [ ] On `scenePatch` received: calls `applyDiff(currentScene, patch)` → `sceneStore.setScene(updatedScene)`
- [ ] Canvas glow trigger: dispatch `sceneStore.triggerGlow()` — canvas border glows for 600ms via Framer Motion

### 8.9 — Canvas patch glow animation
In `CanvasCard.tsx`:
- [ ] Subscribe to `sceneStore.isPatchGlowing`
- [ ] When `true`: `animate={{ boxShadow: '0 0 40px rgba(183,159,255,0.4)' }}` → auto-resets after 600ms
- [ ] Framer Motion spring transition

### 8.10 — Mobile bottom sheet variant
- [ ] Detect mobile with `useMediaQuery('(max-width: 768px)')`
- [ ] On mobile: `ChatCard` renders as a bottom sheet using shadcn `Sheet` component
- [ ] Bottom sheet: 60% of screen height, slides up from bottom
- [ ] Same content as desktop card but full-width

---

## Exit Criteria
- [ ] `💬` button visible on all `/s/[slug]` pages
- [ ] Click opens 320×420 glass morphism card with header
- [ ] Typing a message + send → streaming AI response appears with typing cursor
- [ ] AI response about the current simulation (title/type appears in response context)
- [ ] When AI returns a patch → canvas glows briefly → new steps/popups visible
- [ ] Minimize → card hides, `💬` button returns; re-open → history preserved
- [ ] Close → history cleared
- [ ] Mobile: bottom sheet slides up to 60% height
- [ ] `applyDiff({ type: 'add-steps', ... })` correctly appends steps to scene

---

## Key Notes
- The patch feature is "R1 scope" but should be conservative — only support the 4 patch types listed
- Never replace the full scene via chat — patches are additive/targeted only
- Keep context sent to AI minimal: title + type + current step's explanation text + visual type list. Don't send the full scene JSON (too many tokens)
- `useChatStream` should handle partial JSON at stream end for the `scenePatch` extraction
- The pulse animation on `ChatButton` should be subtle — it should not distract from the simulation
