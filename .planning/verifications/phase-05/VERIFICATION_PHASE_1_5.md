# Manual Verification Checklist — Phases 1–5

Run the dev server first:
```bash
pnpm --filter web dev
# open http://localhost:3000
```

---

## Phase 1 — Design System

- [x] `localhost:3000` loads without errors
- [x] Global Navbar renders with correct fonts and dark background
- [x] No layout shift on page load

---

## Phase 2 — Scene Engine (store layer)

Open any `/s/[slug]` page, check browser DevTools console:

- [x] No errors or warnings in console
- [x] `localStorage` has key `insyte-settings` after page load

---

## Phase 3 — Primitives

Open `localhost:3000/s/test`

- [x] Page loads, SimulationNav shows **"Minimal Test Scene"** with **"Testing"** category pill
- [x] **ArrayViz** renders 5 cells with values `[1, 2, 3, 4, 5]` — not blank
- [x] Step forward → cell at index 2 highlights in **primary color** (active)
- [x] Step forward again → cell at index 4 highlights in **secondary color** (found)
- [x] Step back → highlights revert correctly
- [x] ControlBar shows: slider (Animation Speed), toggle (Show Values), toggle-group (Linear / Binary)
- [x] ChallengesSection visible below canvas with 4 challenge cards
- [x] Clicking challenges header collapses/expands with animation

---

## Phase 4 — Simulation Layouts

Still on `localhost:3000/s/test`

**Playback controls:**
- [x] Play button starts auto-advancing steps at 1s intervals
- [x] Pause stops auto-advance
- [x] Speed selector (0.5× / 1× / 1.5× / 2×) visibly changes advance rate
- [x] Reset returns to step 0
- [x] Step counter shows "Step X / 3"

**Expand mode:**
- [x] Expand button (top-right of nav) → canvas fills viewport with smooth animation
- [x] `F` key toggles expand/collapse
- [x] `Escape` while expanded → collapses
- [x] SimulationNav sits behind the overlay when expanded (z-index correct)

**Explanation panel:**
- [x] Left panel shows "Explanation" heading
- [x] Sections appear progressively as steps advance
- [x] Active section has primary-colored left border, others are dimmed
- [x] Panel auto-scrolls to the active section on step change

**Nav:**
- [x] Share button → shows "Copied!" with checkmark, URL is in clipboard

**Mobile (DevTools → 375px viewport):**
- [x] Canvas stacks on top, explanation below
- [x] Expand button hidden on mobile
- [x] ChallengesSection stacks vertically

---

## Phase 5 — Concept Scenes

### `/s/hash-tables`

- [x] Loads — title: **Hash Tables**, category: **Data Structures**
- [x] Step 0: 4 empty bucket cells ("—"), empty hashmap, badge says "Ready"
- [x] Step 1: bucket[1] highlights primary, hashmap shows "alice" with insert highlight
- [x] Step 3: bucket[1] shows "alice→carol", highlights error (collision), Collisions counter = 1
- [x] Step 4: hashmap "alice" entry highlights secondary (HIT)
- [x] Step 5: bucket[0] highlights error (MISS)
- [x] Step 6: load-factor counter turns error color
- [x] Step 7: bucket array expands to 8 cells, load-factor drops, collisions reset to 0
- [x] Step 8: open addressing probe — skipped slots show error, inserted slot shows primary
- [x] Step 9: bucket shows "⌫" tombstone in error highlight

### `/s/js-event-loop`

- [x] Loads — title: **JavaScript Event Loop**, category: **JavaScript**
- [x] Step 0: all queues empty
- [x] Step 1: StackViz shows `console.log('start')` pushed
- [x] Step 2: stack empties (popped)
- [x] Step 3: `setTimeout(fn, 0)` on stack, Web APIs diagram shows active connection
- [x] Step 5: microtask queue gets "Promise callback"
- [x] Step 6: call stack gets `console.log('end')`
- [x] Step 7: callback queue gets "setTimeout callback" (timer fires), Web APIs clears
- [x] Step 8: microtask drains first — Promise callback moves to stack
- [x] Step 10: setTimeout callback finally runs
- [x] Step 11: all empty, badge shows correct execution order

### `/s/load-balancer`

- [x] Loads — title: **Load Balancer**, category: **System Design**
- [x] Step 1: Server 1 active, s1-count = 1
- [x] Step 2: Server 2 active, s2-count = 1
- [x] Step 3: Server 3 active, s3-count = 1
- [x] Step 4: cycles back to Server 1, s1-count = 2
- [x] Step 5: switches to Least Connections mode, Server 2 routed (fewest connections)
- [x] Step 6: Server 2 shows **dead** state (greyed, X overlay), s2 counter shows error color
- [x] Step 7: Server 2 back online, s2-count resumes
- [x] Step 8: Weighted mode — Server 3 label shows weight, s3-count highest
- [x] Step 9: all 3 servers show **overloaded** state (red with pulsing alert icon)

### `/s/dns-resolution`

- [x] Loads — title: **DNS Resolution**, category: **Networking**
- [x] Step 0: browser node active, badge shows "MISS"
- [x] Step 1: browser → resolver connection active, latency = 5ms
- [x] Step 2: resolver → Root NS active, latency = 35ms
- [x] Step 3: resolver → TLD NS active, latency = 70ms
- [x] Step 4: resolver → Auth NS active, latency = 110ms
- [x] Step 5: resolver + browser both active, latency = 145ms (IP returned)
- [x] Step 6: both nodes show "(cached)", badge says "TTL: 300s"
- [x] Step 7: badge shows "HIT", latency drops to 0
- [x] Step 8: badge shows TTL expired, latency resets to 0
- [x] Step 9: full chain active again (all connections lit)

### `/s/git-branching`

- [x] Loads — title: **Git Branching**, category: **Git**
- [x] Step 0: single node C1 appears
- [x] Step 1: C2 appears, edge C1→C2 drawn (primary/purple)
- [x] Step 2: "feature" pointer node appears, connected to C2 (teal)
- [x] Step 3: C3 appears diverged below, edge C2→C3 highlighted
- [x] Step 4: C4 appears on main track, two-lane divergence visible
- [x] Step 5: C5 merge commit appears with **two** highlighted incoming edges
- [x] Step 6: linear graph (fast-forward) — only one track
- [x] Step 7: C3 and C4 both show error/red (conflict state)
- [x] Step 8: C3' appears rebased onto main (linear, C4→C3' edge highlighted)
- [x] Step 9: C3'' cherry-pick appears on main track alongside C3'
- [x] Step 10: C3'' disappears (reset), HEAD badge shows "← HEAD" on C4
- [x] Step 11: C5 revert commit appears with highlighted edge

---

## Cross-cutting

- [x] Back arrow in SimulationNav navigates to `/explore` (404 expected — Phase 6)
- [x] All 5 scenes have a Challenges section with 3 cards each
- [x] No JS errors in console on any of the 5 scenes
- [x] All scenes work at 375px mobile width (canvas on top, explanation below, challenges collapsed by default)
