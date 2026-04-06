# Phase 8 — Manual Verification Checklist

> Run `pnpm dev` from repo root, navigate to any `/s/[slug]` page (e.g. `/s/hash-tables`).

---

## 8.1 — ChatButton FAB

- [x] `💬` button is visible fixed bottom-right on every `/s/[slug]` page
- [x] Two sonar rings expand outward and fade continuously when chat is closed
- [x] Rings stop immediately when chat opens
- [x] Hover scales button up slightly; tap/click scales down
- [x] While chat is open: button shows `−` (Minus) icon instead of MessageCircle

---

## 8.2 — Chat Card (Desktop)

- [x] Clicking FAB opens a 320×420px glass card at `bottom-24 right-6`
- [x] Card has: title "Ask insyte" left · three control buttons right
- [x] Card entry animation: fades in with slight scale + upward translate
- [x] Shadow is uniform on all four sides (no bottom-right bias)
- [x] Empty state shows arrow icon + helper text

---

## 8.3 — Window Controls

- [x] All three buttons are equal-size circles (`18×18`) with Lucide icons inside
- [x] **Red ✕** (X icon): first click shows tooltip *"Clears history. Click again to confirm."* and button highlights; second click closes card and clears all messages
- [x] Moving mouse off the controls cancels the close confirmation
- [x] **Amber −** (Minus icon): collapses card back to FAB; history is preserved
- [x] **Green ⊠** (Maximize2 icon): visually dimmed, cursor shows not-allowed, does nothing (R1 scope)

---

## 8.4 — Chat Flow

- [x] Type a message and press **Enter** → user message appears right-aligned in a rounded bubble
- [x] An empty assistant placeholder appears immediately (blinking cursor visible)
- [x] Three animated dots show while waiting for first token
- [x] AI response streams in word-by-word with left purple border accent
- [x] Response references the simulation title or type (context is being sent)
- [x] **Shift+Enter** inserts a newline instead of sending
- [x] Send button (`→`) is disabled while loading; enabled otherwise

---

## 8.5 — Minimize / Reopen

- [x] Clicking Amber `−` → card hides, FAB returns with sonar rings
- [x] Clicking FAB again → card reopens with full message history intact
- [x] Minimize preserves history across multiple open/close cycles

---

## 8.6 — Close / Clear

- [x] Clicking Red `✕` once → tooltip appears (no close yet)
- [x] Clicking Red `✕` again → card closes AND history is cleared
- [x] Reopening after close → empty state (no previous messages)

---

## 8.7 — Scene Patching (if AI returns a patch)

- [x] Ask: *"Add a step that highlights the first element"*
- [x] If AI returns a patch block: canvas card glows with purple light for ~1s
- [x] Step count in PlaybackControls increases (new steps appended)
- [ ] Playback **pauses** after patch — does not auto-advance into new steps
- [x] Patch marker (`%%PATCH_START%%` / `%%PATCH_END%%`) is NOT visible in the chat message

---

## 8.8 — Patch Error Handling (no crash guarantee)

- [x] If AI returns a patch targeting a non-existent visual ID, the chat card shows inline error:
  `⚠ Could not apply visualization patch: Patch references unknown visual id "..."`
- [x] Simulation canvas remains fully interactive after the error
- [x] No console crash / unhandled exception

---

## 8.9 — Canvas Glow

- [x] On successful patch: `CanvasCard` border glows purple (`rgba(183,159,255,0.4)`) for ~1s
- [x] Glow fades via spring animation, does not repeat
- [x] No glow on failed patch (error shown in chat only)

---

## 8.10 — Mobile (resize browser to < 768px)

- [x] Clicking FAB → bottom sheet slides up from bottom (not a floating card)
- [x] Sheet occupies ~60% of screen height
- [x] Top corners of sheet are rounded; bottom edge is flush
- [x] Semi-transparent backdrop visible behind sheet
- [x] Tapping backdrop closes the sheet (same as clicking X)
- [x] All chat functionality (send, stream, minimize, close) works identically on mobile

---

## 8.11 — API Route

- [x] `POST /api/chat` with valid body returns `200` streaming response
- [x] `POST /api/chat` with empty `message` returns `400`
- [ ] `POST /api/chat` with missing `sceneContext` returns `400`
- [x] Response is plain text stream (not JSON) — readable as streamed tokens in network tab

---

## Exit Criteria (from PLAN.md)

- [x] `💬` button visible on all `/s/[slug]` pages
- [x] Click opens 320×420 glass morphism card with header
- [x] Typing a message + send → streaming AI response with typing cursor
- [x] AI response references simulation title/type
- [x] Patch → canvas glows → new steps visible → playback pauses
- [x] Minimize → history preserved; Close → history cleared
- [x] Mobile bottom sheet at 60% height
- [x] `applyDiff` with bad visual ID → inline error, simulation does not crash
- [ ] After `add-steps` patch: playback pauses (not auto-playing)
