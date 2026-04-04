# 🏗️ insyte — Visualization Architecture

> How we actually turn DSA code, LLD designs, and HLD systems into interactive visual animations. Honest assessment of what works, what's hard, and what's out of scope.

---

## The Three Visualization Pipelines

insyte handles three fundamentally different types of content, each with its own pipeline:

| Pipeline | Input | Engine | Accuracy |
|----------|-------|--------|----------|
| **DSA Trace** | Problem + solution code | Sandbox execution + AI visualization | 100% real values |
| **LLD Simulation** | Design problem (e.g. LRU Cache) | Sandbox execution OR concept simulation | 100% or conceptual |
| **HLD Diagram** | System design topic | AI-generated interactive architecture | Conceptual (simplified) |

---

## Pipeline 1: DSA Code Trace (Sandbox + AI)

### The Approach: Hybrid (Approach C)

We use a **two-stage pipeline**: real code execution for accurate values, AI for beautiful visualization and explanations.

```
User pastes: Problem + Solution Code + (optional) Sample Input
                    │
                    ▼
        ┌───────────────────────┐
        │  Stage 1: AI          │
        │  Reads code           │
        │  Identifies:          │
        │   - Data structures   │
        │   - Algorithm pattern │
        │   - State variables   │
        │                       │
        │  Generates:           │
        │   → Instrumented code │
        │     (with trace calls)│
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Stage 2: Sandbox     │
        │  Executes instrumented│
        │  code in browser      │
        │                       │
        │  Python → Pyodide     │
        │  JavaScript → Worker  │
        │                       │
        │  Output:              │
        │   → Real state at     │
        │     every step        │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Stage 3: AI          │
        │  Takes real states    │
        │  Designs visualization│
        │  Writes explanations  │
        │  Generates popup text │
        │                       │
        │  Output:              │
        │   → Scene JSON        │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Stage 4: Renderer    │
        │  Scene JSON → Canvas  │
        │  Framer Motion anims  │
        │  Interactive controls │
        └───────────────────────┘
```

### Stage 1: AI Instrumentation — Concrete Example

**User pastes:**
```python
def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
```

**AI generates instrumented version:**
```python
_trace = []

def twoSum(nums, target):
    seen = {}
    _trace.append({
        "step": "init",
        "line": 2,
        "vars": {"seen": {}, "nums": list(nums), "target": target},
        "note": "Initialize empty hash map"
    })
    
    for i, num in enumerate(nums):
        complement = target - num
        found = complement in seen
        _trace.append({
            "step": "loop",
            "line": 4,
            "vars": {
                "i": i, "num": num,
                "complement": complement,
                "seen": dict(seen),
                "found": found
            },
            "highlight": {"array_index": i, "lookup_key": complement}
        })
        
        if found:
            result = [seen[complement], i]
            _trace.append({
                "step": "found",
                "line": 6,
                "vars": {"result": result},
                "highlight": {"array_indices": result}
            })
            return result
        
        seen[num] = i
        _trace.append({
            "step": "store",
            "line": 7,
            "vars": {"seen": dict(seen)},
            "highlight": {"hash_insert": {str(num): i}}
        })

# Execute with sample input
twoSum([2, 7, 11, 15], 9)
```

### Stage 2: Sandbox Execution — Real Trace Data

The instrumented code runs in **Pyodide** (Python in browser via WebAssembly) or a **Web Worker** (JavaScript).

**Output — real, accurate trace:**
```json
[
  {
    "step": "init", "line": 2,
    "vars": {"seen": {}, "nums": [2,7,11,15], "target": 9},
    "note": "Initialize empty hash map"
  },
  {
    "step": "loop", "line": 4,
    "vars": {"i": 0, "num": 2, "complement": 7, "seen": {}, "found": false},
    "highlight": {"array_index": 0, "lookup_key": 7}
  },
  {
    "step": "store", "line": 7,
    "vars": {"seen": {"2": 0}},
    "highlight": {"hash_insert": {"2": 0}}
  },
  {
    "step": "loop", "line": 4,
    "vars": {"i": 1, "num": 7, "complement": 2, "seen": {"2": 0}, "found": true},
    "highlight": {"array_index": 1, "lookup_key": 2}
  },
  {
    "step": "found", "line": 6,
    "vars": {"result": [0, 1]},
    "highlight": {"array_indices": [0, 1]}
  }
]
```

**These values are 100% correct** — they come from real execution, not AI reasoning.

### Stage 3: AI Visualization Design

AI takes the trace data and produces a Scene JSON:

```json
{
  "title": "Two Sum — Hash Map Approach",
  "layout": "code-left-canvas-right",
  
  "code": {
    "language": "python",
    "source": "def twoSum(nums, target):\n    seen = {}...",
    "highlightByStep": [2, 4, 7, 4, 6]
  },
  
  "visuals": [
    {
      "id": "nums-array",
      "type": "array",
      "label": "nums",
      "values": [2, 7, 11, 15]
    },
    {
      "id": "seen-hashmap",
      "type": "hashmap",
      "label": "seen",
      "initialState": {}
    },
    {
      "id": "complement-label",
      "type": "text-badge",
      "label": "complement"
    }
  ],
  
  "steps": [
    {
      "traceIndex": 0,
      "actions": [
        {"target": "seen-hashmap", "action": "show", "state": {}},
        {"target": "nums-array", "action": "show", "values": [2,7,11,15]}
      ],
      "popup": {
        "attachTo": "seen-hashmap",
        "text": "We start with an empty hash map. For each number, we'll check: 'Have I seen the complement I need?'"
      },
      "explanation": "## Starting the Search\n\nWe need two numbers that add to 9. Instead of checking every pair (O(n²)), we'll use a hash map for O(1) lookups."
    },
    {
      "traceIndex": 1,
      "actions": [
        {"target": "nums-array", "action": "highlight-cell", "index": 0, "color": "purple"},
        {"target": "complement-label", "action": "set-text", "text": "complement = 9 - 2 = 7"},
        {"target": "seen-hashmap", "action": "lookup", "key": "7", "result": "miss"}
      ],
      "popup": {
        "attachTo": "complement-label",
        "text": "We need 7 to pair with 2. Is 7 in our hash map? Not yet — we haven't seen it."
      }
    },
    {
      "traceIndex": 3,
      "actions": [
        {"target": "nums-array", "action": "highlight-cell", "index": 1, "color": "purple"},
        {"target": "complement-label", "action": "set-text", "text": "complement = 9 - 7 = 2"},
        {"target": "seen-hashmap", "action": "lookup", "key": "2", "result": "hit", "glow": "green"}
      ],
      "popup": {
        "attachTo": "seen-hashmap",
        "text": "✅ Found it! 2 IS in the hash map (stored at index 0). So nums[0] + nums[1] = 2 + 7 = 9."
      }
    }
  ],
  
  "controls": [
    {"type": "input-array", "id": "custom-input", "label": "Custom Input", "default": "[2,7,11,15]"},
    {"type": "input-number", "id": "custom-target", "label": "Target", "default": 9},
    {"type": "button", "id": "re-run", "label": "Re-run with new input"}
  ]
}
```

### Sandbox Technology

| Language | Sandbox | Runs Where | Security | Limitations |
|----------|---------|-----------|----------|-------------|
| **Python** | **Pyodide** (CPython on WebAssembly) | Browser | ✅ Fully sandboxed | No file I/O, no networking, most stdlib works |
| **JavaScript** | **Web Worker** (isolated thread) | Browser | ✅ Fully sandboxed | No DOM access, but full JS |

- **Zero server cost** — everything runs in the user's browser
- **No security risk** — sandboxed environments can't access the filesystem or network
- **Pyodide** is battle-tested (powers JupyterLite, used by millions)

### Difficulty By Problem Type — Honest Rating

| Problem Type | Trace Difficulty | Visualization Difficulty | Example Problems | Milestone |
|-------------|-----------------|-------------------------|-----------------|-----------|
| **Array traversal** | 🟢 Easy | 🟢 Easy — row of cells, pointer arrow | Two Sum, Best Time to Buy Sell Stock | M1 |
| **Hash map** | 🟢 Easy | 🟢 Easy — key-value table | Group Anagrams, Valid Anagram | M1 |
| **Two pointers** | 🟢 Easy | 🟢 Easy — two colored arrows | Container With Most Water, 3Sum | M1 |
| **Sliding window** | 🟢 Easy | 🟢 Easy — highlighted rectangle | Longest Substring Without Repeat | M1 |
| **Stack** | 🟢 Easy | 🟢 Easy — vertical LIFO | Valid Parentheses, Min Stack | M1 |
| **Linked list** | 🟡 Medium | 🟡 Medium — pointer rewiring anims | Reverse List, Merge Two Lists | M1 |
| **Binary tree** | 🟡 Medium | 🟡 Medium — tree layout + path | Max Depth, LCA, Inorder Traversal | M1/M2 |
| **Graph BFS/DFS** | 🟡 Medium | 🟡 Medium — node coloring wave | Number of Islands, Course Schedule | M2 |
| **DP (1D)** | 🟡 Medium | 🟡 Medium — array filling with arrows | Climbing Stairs, House Robber | M2 |
| **DP (2D)** | 🔴 Hard | 🔴 Hard — large table, visual clutter | Edit Distance, LCS | M2/M3 |
| **Recursion tree** | 🔴 Hard | 🔴 Hard — tree can be very deep/wide | Permutations, Subsets | M2 |
| **Segment tree** | 🔴 Hard | 🔴 Hard — custom tree visualization | Range Sum Query | M3 |
| **Trie** | 🟡 Medium | 🟡 Medium — prefix tree | Implement Trie, Word Search | M2 |

**Milestone 1 covers the top ~30 most-asked interview problems** (mostly array, hash map, two pointer, sliding window, stack, linked list).

### The "Change Input" Feature

When user clicks "Re-run with new input":
1. New input is passed to the sandbox
2. Instrumented code re-executes with new values
3. New trace data is produced (real values, 100% accurate)
4. AI re-generates only the POPUP ANNOTATIONS and EXPLANATION TEXT (since the visual structure stays the same — same data structures, same code)
5. Canvas re-animates with new values

**Cost of re-run**: ~$0.001 (small AI call for new popup text) + zero sandbox cost (browser-local).

---

## Pipeline 2: LLD Simulation

LLD problems fall into three sub-categories, each with a different strategy.

### Sub-Category A: "Design a Data Structure" → Sandbox Execution

**Examples**: LRU Cache, LFU Cache, MinStack, Trie, HashMap from scratch

**Strategy**: Same as DSA — execute real code in sandbox, visualize the internal state.

**Example: LRU Cache**

The user provides (or AI generates) the implementation code.

**What the visualization shows:**

```
┌─ Operations Panel ───────────────────────────────────────────────┐
│                                                                   │
│  Capacity: [3]                                                    │
│  Operations: [put(1,"A"), put(2,"B"), put(3,"C"), get(1), put(4,"D")]
│              [+ Add Operation]                                    │
│                                                                   │
│  Currently Executing: get(1)  [Step 3/5]                         │
│  [◀ Prev] [▶ Next] [▶▶ Play All]                                │
│                                                                   │
├─ Visualization ──────────────────────────────────────────────────┤
│                                                                   │
│  Doubly Linked List (most recent → least recent):                │
│                                                                   │
│  HEAD ←→ [3:"C"] ←→ [1:"A"] ←→ [2:"B"] ←→ TAIL                │
│                        ↑                                         │
│                     moving to front (accessed via get)            │
│                                                                   │
│  After get(1):                                                   │
│                                                                   │
│  HEAD ←→ [1:"A"] ←→ [3:"C"] ←→ [2:"B"] ←→ TAIL                │
│           ✅ now most recent                                     │
│                                                                   │
│  Hash Map:                                                       │
│  ┌─────┬──────────────┐                                         │
│  │ Key │ Node Pointer  │                                         │
│  ├─────┼──────────────┤                                         │
│  │  1  │ → node[1:"A"]│ ← O(1) lookup                          │
│  │  2  │ → node[2:"B"]│                                         │
│  │  3  │ → node[3:"C"]│                                         │
│  └─────┴──────────────┘                                         │
│                                                                   │
├─ Popup ──────────────────────────────────────────────────────────┤
│                                                                   │
│  "Why a doubly-linked list and not an array?                     │
│  Because we need O(1) deletion from any position.                │
│  An array deletion is O(n) — shifting elements.                  │
│  A doubly-linked list just rewires 2 pointers."                  │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

**Animations specific to data structure LLD:**
- **Node insertion**: New node slides in, arrows connect with spring animation
- **Node deletion**: Node fades out, neighboring arrows reconnect (satisfying "snap" animation)
- **Node move-to-front**: Node glows, smoothly transitions to new position, arrows re-wire
- **Eviction**: LRU node at tail turns red, shrinks, and disappears with a 💀 icon
- **Hash map update**: Row in the table flashes on insert/delete

**How we build it:**
- Same sandbox approach as DSA (Pyodide for Python, Worker for JS)
- AI instruments the class methods to capture state after each operation
- Trace captures: linked list order, hash map contents, capacity, what was evicted
- AI maps to visuals: nodes as cards, arrows as bezier curves, hash map as table

### Sub-Category B: "Design a System Component" → Concept Simulation

**Examples**: Rate Limiter, Connection Pool, Thread Pool, Circuit Breaker, Pub/Sub

**Strategy**: These are NOT code traces. They're **behavior simulations** with interactive controls — identical to Concept Explorer mode.

**Example: Rate Limiter (Token Bucket)**

```
┌─ Token Bucket Simulation ────────────────────────────────────────┐
│                                                                   │
│  Bucket:  [●●●●●●●○○○]  7/10 tokens                             │
│                                                                   │
│  Incoming Requests:                                               │
│  ●  ●  ●  ●  ●  ●  →  ⚖️ Rate Limiter  →  ✅ 200 OK            │
│  ●  ●  ●  ●  ●  ●  →                    →  ❌ 429 Too Many      │
│                                                                   │
│  Allowed: 7   |   Rejected: 5   |   Total: 12                   │
│                                                                   │
│  Controls:                                                        │
│  Request Rate:  ────────●────  15 req/s                          │
│  Bucket Size:   ───●─────────  10 tokens                         │
│  Refill Rate:   ────●────────  10 tokens/sec                     │
│  Algorithm:     [● Token Bucket] [○ Sliding Window] [○ Fixed Window]
│                                                                   │
│  [▶ Play]  [🔄 Reset]                                            │
│                                                                   │
├─ Explanation ────────────────────────────────────────────────────┤
│                                                                   │
│  ## Token Bucket Algorithm                                       │
│                                                                   │
│  Tokens refill at a steady rate. Each request consumes one       │
│  token. When the bucket is empty, requests are rejected.         │
│                                                                   │
│  ▸ Try this: Set request rate to 20/s with refill rate 10/s.    │
│  Watch the bucket drain, then see burst-then-throttle behavior.  │
│                                                                   │
│  Popup: "Token Bucket allows short BURSTS (up to bucket size)   │
│  followed by steady-state throttling. This is why APIs use it." │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

**No sandbox needed** — these run as pure client-side simulations with parameters. The AI generates:
- The component entities (bucket, requests, responses)
- Step-by-step behavior rules
- Interactive controls (sliders, toggles)
- Comparison variants (token bucket vs sliding window vs fixed window)

### Sub-Category C: "Design a Class Hierarchy" → Runtime Simulation

**Examples**: Parking Lot, Elevator System, File System, Library Management

**Honest assessment**: This is our weakest area because class diagrams are inherently static and boring.

**Strategy**: Skip the UML diagram. Show the **runtime behavior** instead.

**Example: Parking Lot**

```
┌─ Parking Lot Simulation ─────────────────────────────────────────┐
│                                                                   │
│  Floor 1:  [🚗][🚗][  ][🚙][  ][🏍️][  ][  ]                   │
│             A1   A2       A4       A6                             │
│  Floor 2:  [  ][🚗][  ][  ][  ][  ][  ][  ]                    │
│                  B2                                               │
│                                                                   │
│  Available: 11/16 spots                                          │
│  Compact: 8/8  |  Regular: 2/6  |  Large: 1/2                   │
│                                                                   │
│  [🚗 Park a Car]  [🚙 Park an SUV]  [🏍️ Park a Motorcycle]     │
│  [Remove from spot: [____] [Remove]]                              │
│                                                                   │
│  Operations Log:                                                  │
│  12:01 > park(Car) → Spot A1, Floor 1 ✅                         │
│  12:02 > park(Car) → Spot A2, Floor 1 ✅                         │
│  12:03 > park(Truck) → No large spot available ❌                │
│  12:04 > remove(A1) → Freed ✅                                   │
│                                                                   │
├─ Popup ──────────────────────────────────────────────────────────┤
│  "The system chose A1 (Floor 1, nearest entrance) because       │
│  our allocation strategy is 'closest available spot of the      │
│  correct size.' This is the Strategy pattern in action."         │
└───────────────────────────────────────────────────────────────────┘
```

**What works**: Users can park/remove vehicles, see the system assign spots, observe capacity management, and see design patterns (Strategy, Observer) in action.

**What doesn't work**: Showing WHY we chose specific classes or inheritance. That's a static design decision, not something you animate.

**Milestone strategy**: Deprioritize class hierarchy LLD to M2. Focus on data structure LLD (Category A) and system component LLD (Category B) for M1.

---

## Pipeline 3: HLD (System Design) Visualization

### The Honest Truth

We cannot simulate a real distributed system in a browser. What we CAN do: **animated architecture diagrams where requests flow through components and design tradeoffs are togglable.**

### What An HLD Visualization Looks Like

**Example: "Design Twitter"**

```
┌─ System Architecture (Interactive) ──────────────────────────────┐
│                                                                   │
│  📱 Client                                                        │
│    │                                                              │
│    │  POST /tweet                                                 │
│    ▼                                                              │
│  ┌──────────────┐                                                │
│  │ API Gateway  │ ─── auth check ───→ [Auth Service]             │
│  └──────┬───────┘                                                │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────┐     ┌──────────────┐                           │
│  │Tweet Service │────→│  Database    │                           │
│  └──────┬───────┘     └──────────────┘                           │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────────────────────────────┐                        │
│  │        Fanout Service                │                        │
│  │  (Push tweet to follower feeds)      │                        │
│  └──┬──────────┬──────────┬─────────────┘                        │
│     │          │          │                                       │
│     ▼          ▼          ▼                                       │
│  [Feed:A]  [Feed:B]  [Feed:C]  ← per-user feed caches           │
│                                                                   │
│  Animated dots flow along the arrows showing the request path.   │
│                                                                   │
├─ Controls ───────────────────────────────────────────────────────┤
│                                                                   │
│  Write Strategy: [● Fanout-on-Write] [○ Fanout-on-Read]         │
│  Follower Count: ──────────────●──── 10,000                     │
│  Celebrity Mode: [OFF] ← toggle to see thundering herd          │
│  Cache Layer:    [ON]                                             │
│  Database:       [● SQL] [○ NoSQL]                               │
│                                                                   │
│  [▶ Animate Write Path]  [▶ Animate Read Path]                  │
│  [💥 Kill a Server]  [📈 10x Traffic Spike]                     │
│                                                                   │
├─ Explanation ────────────────────────────────────────────────────┤
│                                                                   │
│  ## Fanout-on-Write                                              │
│                                                                   │
│  When a user posts a tweet, the Fanout Service immediately      │
│  pushes it to every follower's pre-computed feed cache.          │
│                                                                   │
│  ▸ Pro: Read is instant (feed is pre-built)                     │
│  ▸ Con: Writes are expensive for popular users                  │
│                                                                   │
│  ▸ Try this: Set follower count to 1,000,000.                   │
│  Watch the fanout service struggle to push to 1M feeds.          │
│  This is why Twitter uses a hybrid approach for celebrities.     │
│                                                                   │
│  Popup on Fanout Service:                                        │
│  "With 10K followers, fanout takes ~100ms. At 10M followers,    │
│  it takes ~100 SECONDS. That's why celebrities use               │
│  fanout-on-read instead."                                        │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### HLD Scene JSON Structure

HLD scenes use a DIFFERENT schema than DSA traces — they describe components and flows, not code execution:

```json
{
  "type": "system-design",
  "title": "Design Twitter",
  
  "components": [
    {
      "id": "client", "type": "component",
      "label": "Client", "icon": "📱",
      "position": {"x": 100, "y": 50}
    },
    {
      "id": "gateway", "type": "component",
      "label": "API Gateway", "icon": "🚪",
      "position": {"x": 100, "y": 150}
    },
    {
      "id": "tweet-svc", "type": "component",
      "label": "Tweet Service", "icon": "✍️",
      "position": {"x": 100, "y": 250}
    },
    {
      "id": "cache", "type": "component",
      "label": "Cache (Redis)", "icon": "⚡",
      "position": {"x": 300, "y": 250},
      "showWhen": {"control": "cache-toggle", "equals": true}
    }
  ],
  
  "connections": [
    {"from": "client", "to": "gateway", "label": "HTTPS", "style": "solid"},
    {"from": "gateway", "to": "tweet-svc", "label": "gRPC", "style": "solid"},
    {"from": "tweet-svc", "to": "cache", "label": "GET/SET", "style": "dashed",
     "showWhen": {"control": "cache-toggle", "equals": true}}
  ],
  
  "flows": [
    {
      "name": "Write Path (Fanout-on-Write)",
      "showWhen": {"control": "fanout-strategy", "equals": "write"},
      "steps": [
        {"from": "client", "to": "gateway", "label": "POST /tweet", "duration": 200},
        {"from": "gateway", "to": "tweet-svc", "label": "createTweet()", "duration": 100},
        {"from": "tweet-svc", "to": "db", "label": "INSERT tweet", "duration": 50},
        {"from": "tweet-svc", "to": "fanout", "label": "fanout event", "duration": 100},
        {"from": "fanout", "to": "feeds", "label": "push to N feeds",
         "duration": {"formula": "followers * 0.01"},
         "annotation": "Cost scales with follower count!"}
      ]
    },
    {
      "name": "Write Path (Fanout-on-Read)",
      "showWhen": {"control": "fanout-strategy", "equals": "read"},
      "steps": [
        {"from": "client", "to": "gateway", "label": "POST /tweet", "duration": 200},
        {"from": "gateway", "to": "tweet-svc", "label": "createTweet()", "duration": 100},
        {"from": "tweet-svc", "to": "db", "label": "INSERT tweet", "duration": 50}
      ]
    }
  ],
  
  "controls": [
    {"type": "toggle-group", "id": "fanout-strategy",
     "options": ["write", "read"], "labels": ["Fanout-on-Write", "Fanout-on-Read"]},
    {"type": "slider", "id": "followers",
     "label": "Follower Count", "min": 10, "max": 10000000, "default": 10000},
    {"type": "toggle", "id": "cache-toggle", "label": "Enable Cache Layer", "default": true},
    {"type": "button", "id": "kill-server", "label": "💥 Kill a Server"},
    {"type": "button", "id": "traffic-spike", "label": "📈 10x Traffic"}
  ]
}
```

### What's Actually Useful About HLD Visualization

The value isn't in simulating the system — it's in **making tradeoffs visible**:

| Tradeoff | How We Show It |
|----------|---------------|
| Fanout-on-Write vs Read | Toggle switch → watch the animation path change completely |
| SQL vs NoSQL | Toggle → see schema-based writes vs document writes |
| Add cache layer | Toggle → new node appears, some requests bypass the DB (green = cache hit) |
| Add more shards | Slider → database splits into multiple nodes, requests get routed |
| Kill a server | Button → node turns red, load balancer redistributs (or doesn't) |
| Traffic spike | Button → 10x more animated dots flood the system |
| Celebrity problem | Slider followers to 10M → fanout-on-write node turns red/overloaded |

This turns abstract interview knowledge ("explain the tradeoffs of fanout-on-write") into something you can SEE and FEEL.

### HLD Topics We Can Cover

| Topic | Components | Key Tradeoffs to Visualize |
|-------|-----------|---------------------------|
| **URL Shortener** | Client → API → DB + Cache | Read-heavy vs write-heavy, cache hit rate |
| **Twitter/Feed** | Client → API → Write/Read paths → Fanout → Cache | Fanout strategy, celebrity problem |
| **Chat System** | Client → WebSocket → Message Queue → DB | Polling vs WebSocket vs SSE |
| **Notification** | Event → Queue → Processing → Push/Email/SMS | At-most-once vs at-least-once delivery |
| **Rate Limiter** | Client → Rate Limiter → API | Token bucket vs sliding window |
| **Consistent Hashing** | Client → Hash Ring → Server nodes | Adding/removing nodes, virtual nodes |
| **CDN** | Client → Edge → Origin | Cache invalidation, geographic routing |
| **Search** | Client → API → Index → Ranking | Inverted index, relevance scoring |

### Honest Limitations of HLD Mode

| What Works | What Doesn't |
|-----------|-------------|
| ✅ Animated request paths through components | ❌ Real network latency simulation |
| ✅ Toggle design tradeoffs (A vs B) | ❌ Actual distributed system behavior |
| ✅ "What if" scenarios (kill server, spike traffic) | ❌ Real failure modes (split brain, etc.) |
| ✅ Zoom into components (click Cache → see LRU sim) | ❌ Concurrent request handling |
| ✅ Understanding the WHY behind design decisions | ❌ Quantitative capacity estimation |
| ✅ Interactive architecture diagrams | ❌ Code-level implementation details |

**The positioning**: "An interactive whiteboard for system design interviews." Better than static diagrams, better than YouTube screencasts, but NOT a real distributed system simulator.

---

## Summary: What's Realistic Per Mode & Milestone

| Mode | What We Visualize | Accuracy | Milestone |
|------|------------------|----------|-----------|
| **DSA: Array/Hash/Pointer** | Real code trace via sandbox + AI visuals | 100% accurate | **M1** |
| **DSA: Trees/Graphs** | Real code trace + tree/graph layout | 100% accurate | **M1-M2** |
| **DSA: DP/Recursion** | Real trace + table/tree visualization | 100% but visually complex | **M2-M3** |
| **LLD: Data Structures** (LRU, Trie) | Real code trace of operations | 100% accurate | **M1** |
| **LLD: System Components** (Rate Limiter) | Behavior simulation with controls | Conceptual | **M1** |
| **LLD: Class Design** (Parking Lot) | Runtime simulation, not class diagrams | Partial | **M2** |
| **HLD** (Design Twitter) | Animated architecture, tradeoff toggles | Conceptual | **M2** |

### Milestone 1 Focus

Build the engine. Prove the wow. Ship:
- ✅ DSA trace for array/hash/pointer/stack/linked-list problems
- ✅ LLD data structure simulation (LRU Cache)
- ✅ 1-2 concept simulations (Rate Limiter, Load Balancer)
- ✅ Interactive controls, popup annotations, live AI chat
- ✅ Change input and re-run

Everything else builds on the same engine — we just add new primitives and scene types.

---

*Written: April 4, 2026*
*Honest assessment: DSA with sandbox is nearly foolproof. LLD data structures are excellent. HLD is "animated whiteboard" level — good but not magical.*
