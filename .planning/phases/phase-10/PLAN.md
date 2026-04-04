# Phase 10 — LLD + HLD Simulations

**Goal:** All 9 remaining pre-built simulations (5 LLD + 4 HLD) authored and rendering correctly. `SystemDiagramViz` fully complete with interactive controls. HLD `canvas-only` layout fully functional.

**Entry criteria:** Phase 9 complete. All primitives built. `SceneRenderer` handles all 3 layouts.

---

## Tasks

### 10.1 — Complete SystemDiagramViz
Finalize `apps/web/src/engine/primitives/SystemDiagramViz.tsx` (stubbed in Phase 3):

- [ ] **Component boxes:** rounded rect with icon + label, status-driven color
  - `normal`: `bg-surface-container border border-outline-variant/30`
  - `active`: `border-primary/60` + primary glow `box-shadow: 0 0 16px rgba(183,159,255,0.2)`
  - `overloaded`: `border-error/60` + red glow + CSS shake animation (`@keyframes shake`)
  - `dead`: `opacity-40 grayscale` + strikethrough label + `✕` overlay icon
- [ ] **SVG connections:** bezier paths between component positions
  - Solid line: `stroke-dasharray: none`
  - Dashed line: `stroke-dasharray: 6 4`
  - Active connection: animated `stroke-dashoffset` scroll effect (infinite loop while active)
- [ ] **DataFlowDot along connections:** dot(s) travel along each active connection path
  - Multiple dots allowed per connection (queue effect)
  - Color matches connection type (primary = request, secondary = response)
- [ ] **`showWhen` evaluation:** components and connections filter based on control state
- [ ] **Click handler:** `onClick?` prop per component — used for "Kill Server" and HLD drill-down (R2)
- [ ] **Position system:** absolute positioned within SVG viewBox, receives positions from scene JSON

### 10.2 — "Kill Server" and "Traffic Spike" action handlers
In `apps/web/src/engine/controls/ButtonControl.tsx`:
- [ ] `kill-server` action: finds component with matching id in scene-store, sets `status: 'dead'`
  - Triggers shake animation on connected components (overloaded)
  - Stops data flow dots to/from that component
- [ ] `traffic-spike` action: multiplies `DataFlowDot` count × 5 for 3 seconds, then normalizes
  - Some components go `overloaded` status
  - Load balancer distributes dots to remaining alive servers
- [ ] `add-server` action: sets a previously dead component back to `normal` status
- [ ] Actions update scene-store visual states via `sceneStore.updateVisualStatus(id, status)`

### 10.3 — `showWhen` condition system in SceneRenderer
Update `apps/web/src/engine/SceneRenderer.tsx`:
- [ ] Before rendering each `Visual`, evaluate `visual.showWhen` condition against current control values
- [ ] `evaluateCondition(condition: Condition, controlValues: Record<string, unknown>): boolean`
- [ ] Hide (not unmount) visuals that don't satisfy condition — use `display: none` with Framer Motion layout animation so canvas doesn't jump
- [ ] Same for connections in `SystemDiagramViz` — filter by `showWhen`
- [ ] Same for `Popup` — already handled by `useAnnotations` hook (extend to support `showWhen`)

### 10.4 — 5 LLD Scene JSONs
Create `apps/web/src/content/scenes/lld/`:

**`lru-cache.json`:**
- [ ] Type: `lld`, Layout: `text-left-canvas-right`
- [ ] Visuals: `LinkedListViz` (doubly-linked list) + `HashMapViz` (key → node pointer) + `CounterViz` (capacity)
- [ ] Steps (10+):
  - `put(1,"A")`, `put(2,"B")`, `put(3,"C")` → fill cache
  - `get(1)` → move-to-front animation
  - `put(4,"D")` when at capacity → evict LRU (tail), insert new (head)
  - `get(2)` after eviction → MISS (returns -1)
- [ ] Controls: `input` for put(key, val), `input` for get(key), `slider` for capacity (1–5)
- [ ] ExplanationSections: why doubly-linked list + hashmap, O(1) operations, LRU policy
- [ ] Challenges: fill to capacity + trigger eviction, explain why O(1) get/put

**`rate-limiter.json`:**
- [ ] Type: `lld`, Layout: `text-left-canvas-right`
- [ ] Visuals: `ArrayViz` (token bucket — filled cells = tokens) + `SystemDiagramViz` (requests → limiter → API) + `CounterViz` (allowed, rejected, tokens)
- [ ] Steps (10+): token refill, request allowed (consume token), request rejected (bucket empty), burst handling, steady-state throttling
- [ ] Controls: `slider` for Request Rate (1–30/s), `slider` for Bucket Size (1–20), `slider` for Refill Rate (1–20/s), `toggle-group` Token Bucket | Sliding Window | Fixed Window
- [ ] ExplanationSections: token bucket concept, burst allowance, why APIs use it, comparison of algorithms
- [ ] Challenges: configure so exactly 50% of requests are rejected at steady state

**`min-stack.json`:**
- [ ] Type: `lld`, Layout: `text-left-canvas-right`
- [ ] Visuals: `StackViz` (main stack) + `StackViz` (min stack) + `CounterViz` (current min)
- [ ] Steps (8+): push values, `getMin()` returns min in O(1), pop values, min changes
- [ ] Controls: `input` for push value, `button` for pop, `button` for getMin
- [ ] ExplanationSections: why naive O(n) min fails, dual-stack trick, sync strategy

**`trie.json`:**
- [ ] Type: `lld`, Layout: `text-left-canvas-right`
- [ ] Visuals: `TreeViz` (trie tree structure) + `TextBadgeViz` (current character)
- [ ] Steps (10+): insert "apple", insert "app", insert "banana" — shared prefix path shown; search "app" — highlight traversal; `startsWith("ap")` returns true
- [ ] Controls: `input` for insert word, `input` for search word, `button` for startsWith

**`design-hashmap.json`:**
- [ ] Type: `lld`, Layout: `text-left-canvas-right`
- [ ] Visuals: `ArrayViz` (underlying array of buckets) + `HashMapViz` (logical view) + `CounterViz` (load factor)
- [ ] Steps (10+): initialize array, insert using hash function, collision → chaining, resize when load factor > 0.75
- [ ] Controls: `input` for put(key, val), `input` for get(key), `button` for remove

### 10.5 — 4 HLD Scene JSONs
Create `apps/web/src/content/scenes/hld/`:

**`url-shortener.json`:**
- [ ] Type: `hld`, Layout: `canvas-only`
- [ ] Components: Client → API Server → `[Cache (Redis)]` → Database → `[CDN Edge]`
- [ ] Flows: Write path (long URL → generate short ID → store in DB), Read path (short ID → cache check → DB lookup → redirect)
- [ ] Controls: `toggle` Cache On/Off, `toggle` CDN On/Off, `slider` Cache Hit Rate (0–100%), `button` Shorten URL, `button` Resolve URL
- [ ] Stat cards: Cache Hit Rate, DB Reads, DB Writes, Total Requests
- [ ] ExplanationSections: read-heavy vs write-heavy, Base62 encoding, cache strategy

**`twitter-feed.json`:**
- [ ] Type: `hld`, Layout: `canvas-only`
- [ ] Components: Client → API Gateway → Tweet Service → DB → Fanout Service → [User Feed Caches A,B,C] → Read Service
- [ ] Flows: Write path (fanout-on-write vs fanout-on-read, controlled by toggle)
- [ ] Controls: `toggle-group` Fanout-on-Write | Fanout-on-Read, `slider` Follower Count (10–10,000,000), `toggle` Celebrity Mode, `button` Post Tweet, `button` Read Feed, `button` Traffic Spike
- [ ] Celebrity mode: when follower count > 1M, shows "Fanout overloaded" + switches to hybrid approach
- [ ] ExplanationSections: fanout strategies, celebrity problem, hybrid approach

**`consistent-hashing.json`:**
- [ ] Type: `hld`, Layout: `canvas-only`
- [ ] Visuals: `GraphViz` (ring with server nodes + key tokens around it) + `CounterViz` (keys per server)
- [ ] Steps: initial ring with 3 servers, hash keys distributed, add Server 4 (minimal key redistribution), remove Server 2 (keys shift to next server), show with virtual nodes (rebalancing)
- [ ] Controls: `button` Add Server, `button` Remove Server, `toggle` Virtual Nodes On/Off, `slider` Key Count
- [ ] ExplanationSections: why consistent hashing, virtual nodes, minimal redistribution

**`chat-system.json`:**
- [ ] Type: `hld`, Layout: `canvas-only`
- [ ] Components: Client A + Client B → WebSocket Server(s) → Message Queue → DB → Notification Service
- [ ] Flows: message sent → WebSocket delivery → Message Queue (for offline users) → push notification
- [ ] Controls: `toggle-group` WebSocket | Long Polling | SSE, `toggle` User B Online/Offline, `button` Send Message
- [ ] Offline flow: message queues, notification sent, delivery on reconnect
- [ ] ExplanationSections: WebSocket vs polling vs SSE, message queue for reliability, delivery guarantees

### 10.6 — CanvasOnly layout with floating explanation cards
Update `apps/web/src/engine/layouts/CanvasOnly.tsx`:
- [ ] Full-width canvas
- [ ] Floating explanation card: glass-panel, positioned in bottom-left or configured position
- [ ] Card shows current `ExplanationSection` text synchronized with playback step
- [ ] Playback controls overlay (top of canvas, semi-transparent)
- [ ] Controls bar at bottom inside canvas

### 10.7 — Wire all 9 into static routes
- [ ] Update `loadStaticScene()` and `getAllStaticSlugs()` to include all 9 new scenes
- [ ] Test each at their respective `/s/[slug]` routes
- [ ] Verify HLD simulations: toggle switches change flow animation, "Kill Server" works

---

## Exit Criteria
- [ ] All 9 simulations load at their `/s/[slug]` routes
- [ ] `lru-cache`: move-to-front animation plays correctly, eviction shows correctly
- [ ] `rate-limiter`: token bucket drains visually, requests toggle between allowed/rejected
- [ ] `twitter-feed`: fanout-on-write vs read toggle changes the animation path completely
- [ ] `consistent-hashing`: add/remove server shows ring rebalancing with minimal key movement
- [ ] `chat-system`: offline user flow shows message queuing + notification
- [ ] HLD `showWhen` conditions: cache components appear/disappear when cache toggle fires
- [ ] "Kill Server" button in load-balancer and twitter-feed changes server status visually
- [ ] "Traffic Spike" floods the system with dots, causing overloaded states

---

## Key Notes
- **Use `ui-ux-pro-max` skill** for HLD diagram component box sizing and ring layout for consistent-hashing
- HLD scenes use `SystemDiagramViz` as their primary visual — this primitive does the heavy lifting
- Consistent hashing is a special case — the "ring" is better visualized as a `GraphViz` circular layout, not `SystemDiagramViz` boxes. The ring's circular structure is essential to understanding the concept.
- For the Twitter Feed, the celebrity problem should be DRAMATIC — when follower count hits 1M, the fanout service should visually "explode" (overloaded state) and the system should automatically switch strategy
- LLD simulations are closer to DSA traces than HLD diagrams — they show code execution state through data structure visualizations
