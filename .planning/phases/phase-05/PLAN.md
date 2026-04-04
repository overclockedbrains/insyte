# Phase 5 — 5 Concept Simulations (Hand-Crafted Scene JSONs)

**Goal:** 5 fully interactive concept Scene JSONs hand-authored, loading correctly via `/s/[slug]`, all primitives animating as designed.

**Entry criteria:** Phase 4 complete. Simulation page layouts working. At least ArrayViz, HashMapViz, StackViz, QueueViz, GraphViz, SystemDiagramViz, TextBadgeViz, CounterViz primitives functional.

---

## Tasks

### 5.1 — Scene loader utility
Create `apps/web/src/lib/scene-loader.ts`:
- [ ] `loadStaticScene(slug: string): Scene | null`
  - Checks `src/content/scenes/concepts/[slug].json` → `src/content/scenes/dsa/[slug].json` → `src/content/scenes/lld/[slug].json` → `src/content/scenes/hld/[slug].json`
  - Parses with `parseScene()` from scene-engine
  - Returns `null` if not found
- [ ] `getAllStaticSlugs(): string[]` — used for `generateStaticParams` in Next.js

Update `/s/[slug]/page.tsx`:
- [ ] Call `loadStaticScene(slug)` — if found, render scene immediately
- [ ] If not found, render streaming skeleton (stub for now)

### 5.2 — hash-tables.json
`apps/web/src/content/scenes/concepts/hash-tables.json`:
- [ ] Type: `concept`, Layout: `text-left-canvas-right`
- [ ] Visuals: `HashMapViz` (the table) + `ArrayViz` (underlying buckets array) + `TextBadgeViz` (hash function label) + `CounterViz` (load factor, collisions)
- [ ] Steps (minimum 10):
  1. Initial empty state — show empty bucket array + empty hashmap
  2. Insert "alice" — show hash("alice") = 3, insert into bucket 3
  3. Insert "bob" — hash("bob") = 0, insert into bucket 0
  4. Insert "carol" — hash("carol") = 3, COLLISION with "alice" → chaining
  5. Lookup "alice" — hash → bucket → scan chain, HIT
  6. Lookup "dave" — hash → bucket → MISS
  7. Load factor crosses 0.75 → rehash animation
  8. Open addressing mode — show linear probing on same collision
  9. Toggle back to chaining — show comparison
  10. Delete key — show removal from chain
- [ ] Controls:
  - `toggle-group`: Chaining | Open Addressing
  - `slider`: Table Size (4–16)
  - `input`: key to insert
  - `button`: Insert, Lookup, Reset
  - Stat cards: Load Factor (CounterViz), Collisions (CounterViz)
- [ ] ExplanationSections: 5+ sections covering hashing, buckets, collision resolution, rehashing, complexity
- [ ] Challenges: 3 challenges (predict collisions, make load factor > 1.0, use open addressing to reach 100% load)

### 5.3 — js-event-loop.json
`apps/web/src/content/scenes/concepts/js-event-loop.json`:
- [ ] Type: `concept`, Layout: `text-left-canvas-right`
- [ ] Visuals: `StackViz` (call stack) + `QueueViz` (callback queue) + `QueueViz` (microtask queue) + `SystemDiagramViz` (Web APIs box) + `TextBadgeViz` (current executing code)
- [ ] Steps (minimum 12):
  1. `console.log('start')` → call stack push/pop
  2. `setTimeout(fn, 0)` → pushed to call stack, handed to Web APIs
  3. `Promise.resolve().then(fn)` → microtask queued
  4. `console.log('end')` → call stack push/pop
  5. Call stack empty → event loop checks microtask queue FIRST
  6. Microtask runs (Promise callback)
  7. Event loop checks callback queue
  8. setTimeout callback runs
  9. Demonstrate: microtasks always before macrotasks
  10. Nested microtask example
- [ ] Controls:
  - `button`: Run Code Snippet
  - `toggle-group`: Example: setTimeout | Promise | async/await
  - Stat cards: Call Stack Depth, Pending Microtasks, Pending Callbacks
- [ ] ExplanationSections: call stack, web APIs, microtask vs callback queue, event loop tick
- [ ] Challenges: predict execution order of mixed setTimeout/Promise code

### 5.4 — load-balancer.json
`apps/web/src/content/scenes/concepts/load-balancer.json`:
- [ ] Type: `concept`, Layout: `text-left-canvas-right`
- [ ] Visuals: `SystemDiagramViz` (clients → load balancer → 3 servers) + `DataFlowDot` (requests flowing) + `CounterViz` (requests per server) + `TextBadgeViz` (algorithm name)
- [ ] Steps (minimum 10):
  1. Client sends request → Load Balancer
  2. Round Robin: request 1 → Server 1
  3. Round Robin: request 2 → Server 2
  4. Round Robin: request 3 → Server 3
  5. Round Robin cycles back: request 4 → Server 1
  6. Switch to Least Connections — Server 2 has 0 connections → routes there
  7. Kill Server 2 → requests re-route to Server 1 and 3
  8. Add Server back → load redistributes
  9. Weighted algorithm — Server 3 is 2x powerful, gets 2x requests
  10. Traffic spike — all servers overloaded (overloaded state animation)
- [ ] Controls:
  - `toggle-group`: Round Robin | Least Connections | Weighted
  - `slider`: Requests per second (1–20)
  - `button`: Kill Server 2, Add Server, Traffic Spike
  - Stat cards: Server 1/2/3 request counts
- [ ] ExplanationSections: what load balancing is, why it matters, algorithm comparison, health checks

### 5.5 — dns-resolution.json
`apps/web/src/content/scenes/concepts/dns-resolution.json`:
- [ ] Type: `concept`, Layout: `text-left-canvas-right`
- [ ] Visuals: `SystemDiagramViz` (Browser → Resolver → Root NS → TLD NS → Authoritative NS) + `BezierConnector` (query/response paths) + `DataFlowDot` (DNS packets) + `TextBadgeViz` (cache states) + `CounterViz` (latency)
- [ ] Steps (minimum 10):
  1. Browser looks up `insyte.dev` — checks local cache (MISS)
  2. Query goes to Recursive Resolver
  3. Resolver checks its cache (MISS)
  4. Resolver queries Root Name Server → returns `.dev` TLD NS address
  5. Resolver queries TLD NS → returns Authoritative NS address
  6. Resolver queries Authoritative NS → gets `104.21.x.x` IP
  7. Resolver caches result + returns to browser
  8. Browser caches result (TTL: 300s)
  9. Second request for `insyte.dev` → Browser cache HIT (instant)
  10. TTL expires → process repeats
- [ ] Controls:
  - `toggle`: Cache On/Off
  - `slider`: Simulated Latency (10–200ms per hop)
  - `button`: Query again, Clear Cache
  - Stat cards: Total Latency, Cache Status
- [ ] ExplanationSections: what DNS is, resolver, hierarchy, caching, TTL

### 5.6 — git-branching.json
`apps/web/src/content/scenes/concepts/git-branching.json`:
- [ ] Type: `concept`, Layout: `text-left-canvas-right`
- [ ] Visuals: `GraphViz` (commit graph with branch labels) + `TextBadgeViz` (HEAD pointer, branch names)
- [ ] Steps (minimum 12):
  1. Initial commit on `main`
  2. Second commit on `main`
  3. Create `feature` branch — new pointer at same commit
  4. Commit on `feature` — graph diverges
  5. Commit on `main` — divergence grows
  6. Merge `feature` into `main` — merge commit appears
  7. Show fast-forward merge (no divergence case)
  8. Show merge conflict visualization (both modified same file)
  9. Rebase `feature` onto `main` — commits "move" (replayed)
  10. Cherry-pick a commit from `feature` to `main`
  11. `git reset --hard` — HEAD moves back, commits disappear
  12. `git revert` — new commit added that undoes changes
- [ ] Controls:
  - `button`: Commit, Create Branch, Merge, Rebase, Cherry-Pick, Reset, Revert
  - `input`: Branch name
  - Stat cards: Commits, Branches, HEAD position
- [ ] ExplanationSections: what branches are, merge vs rebase, HEAD, detached HEAD

### 5.7 — Wire all 5 into static routes
- [ ] Update `loadStaticScene()` to find all 5 JSONs
- [ ] `generateStaticParams()` returns slugs for all 5
- [ ] Test each at `localhost:3000/s/hash-tables`, `/s/js-event-loop`, `/s/load-balancer`, `/s/dns-resolution`, `/s/git-branching`
- [ ] Verify playback controls work, ExplanationPanel syncs, all animations run

---

## Exit Criteria
- [ ] All 5 simulations load at their respective `/s/[slug]` routes
- [ ] Each has minimum 10 steps that all animate correctly
- [ ] `hash-tables`: toggle between Chaining and Open Addressing changes the animation
- [ ] `js-event-loop`: execution order is correct (microtasks before macrotasks)
- [ ] `load-balancer`: "Kill Server" changes routing behavior visually
- [ ] `dns-resolution`: cache toggle changes the animation path (skips intermediate hops)
- [ ] `git-branching`: merge vs rebase show visually distinct operations
- [ ] ExplanationPanel auto-scrolls to correct section at each step
- [ ] Controls update stat cards in real-time (load factor changes as keys are inserted)
- [ ] All 3 challenges defined per simulation

---

## Key Notes
- These JSONs are hand-crafted — not AI-generated. They are the "gold standard" reference for what AI-generated scene JSONs should aspire to.
- Positions in scene JSONs use a coordinate system where canvas is ~1000×600 units (scaled to actual pixels by SceneRenderer)
- The `hash-tables` simulation is the most complex and is also featured in the landing page hero — get this one perfect first
- Use `showWhen` conditions in visuals to show/hide elements based on toggle state (e.g., show chaining visualization only when chaining toggle is active)
- Each challenge JSON should be fully self-contained (description + type + optional target state to verify against)
