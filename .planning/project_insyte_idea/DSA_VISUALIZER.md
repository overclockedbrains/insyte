# 💻 DSA Visualizer — Feature Spec

> **"Paste any DSA problem + its solution code → Get a beautiful, step-by-step animated execution trace."**

---

## The Problem It Solves

Every developer preparing for interviews does this:
1. Read a LeetCode problem
2. Read the solution code (or editorial)
3. Try to **mentally trace** the execution in their head
4. Fail, re-read, stare at it, still don't fully "get it"

**PythonTutor** exists but looks like it was built in 2005 — ugly, no interactivity, no explanations. **NeetCode / YouTube** explanations are video-only — can't pause, change input, or explore. **LeetCode editorials** are walls of text with maybe one static diagram.

**Our DSA Visualizer**: Paste problem + code → get a premium animated execution trace with interactive controls, popup annotations explaining the "WHY", and the ability to change inputs and see different behavior.

---

## User Flow

### Step 1: Paste Problem + Code

```
┌─────────────────────────────────────────────────────────┐
│  💻 DSA Visualizer                                       │
│                                                          │
│  Problem (optional but helps AI explain better):         │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Two Sum: Given an array of integers nums and an     ││
│  │ integer target, return indices of two numbers that   ││
│  │ add up to target.                                    ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  Solution Code:                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │ def twoSum(nums, target):                            ││
│  │     seen = {}                                        ││
│  │     for i, num in enumerate(nums):                   ││
│  │         complement = target - num                    ││
│  │         if complement in seen:                       ││
│  │             return [seen[complement], i]             ││
│  │         seen[num] = i                                ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  Language: [Python ▼]                                    │
│  Sample Input (optional): nums = [2,7,11,15], target = 9│
│                                                          │
│  [✨ Visualize →]                                        │
└─────────────────────────────────────────────────────────┘
```

### Step 2: AI Generates Scene JSON

What the AI does (it does NOT solve the problem — solution is already provided):

1. **Reads the code** — identifies data structures (array, hash map), algorithm pattern (hash lookup)
2. **Picks a sample input** — `nums = [2, 7, 11, 15], target = 9` (or uses user-provided input)
3. **Traces step by step** — walks through each line, recording state changes at every step
4. **Maps to visuals** — array → `<Table>` primitive, hash map → `<Table>` primitive, pointer → glowing dot
5. **Writes annotations** — explains the "WHY" behind each step, not just "this line ran"

### Step 3: Interactive Visualization

```
┌─ Code (line-by-line highlight) ──┬─ Visualization ─────────────────────────┐
│                                  │                                          │
│  def twoSum(nums, target):       │  nums:                                   │
│      seen = {}                   │  ┌───┬───┬────┬────┐                    │
│  →   for i, num in enumerate():  │  │ 2 │ 7 │ 11 │ 15 │                    │
│          complement = target-num │  └─▲─┴───┴────┴────┘                    │
│          if complement in seen:  │    │                                     │
│              return [...]        │    i=0, num=2                            │
│          seen[num] = i           │                                          │
│                                  │  complement = 9 - 2 = 7                 │
│                                  │                                          │
│                                  │  seen:                                   │
│                                  │  ┌─────────┐                            │
│                                  │  │ (empty)  │                            │
│                                  │  └─────────┘                            │
│                                  │                                          │
│                                  │  7 in seen? ❌ No                        │
│                                  │                                          │
│                                  │  → Add 2:0 to seen                      │
│                                  │                                          │
│  Step 1/4                        │  Input: [2,7,11,15] target: [9]         │
│  [◀ Back] [▶ Next] [▶▶ Play]    │  [🔄 Change Input]                      │
│                                  │                                          │
├──────────────────────────────────┴──────────────────────────────────────────┤
│ 📌 Popup annotation (attached to the hash map):                             │
│ "We store each number we've visited alongside its index. The question       │
│  becomes: 'Have I already seen the number I NEED?' This is the key insight │
│  that makes it O(n) instead of O(n²)."                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

Step 2 (user clicks [▶ Next]):
```
│  nums:                                   │
│  ┌───┬───┬────┬────┐                    │
│  │ 2 │ 7 │ 11 │ 15 │                    │
│  └───┴─▲─┴────┴────┘                    │
│        │                                 │
│        i=1, num=7                        │
│                                          │
│  complement = 9 - 7 = 2                 │
│                                          │
│  seen:                                   │
│  ┌─────────────┐                        │
│  │ { 2: 0 }    │ ← 2 IS here!          │
│  └─────────────┘                        │
│        ↓                                 │
│  2 in seen? ✅ YES → return [0, 1]      │
│                                          │
│  🎉 Found! nums[0]=2 + nums[1]=7 = 9   │
```

---

## What Makes It Better Than Everything Else

| Feature | PythonTutor | LeetCode Editorial | YouTube | **Ours** |
|---------|------------|-------------------|---------|---------|
| Visual trace | ✅ But ugly | ❌ Static images | ✅ But pre-recorded | ✅ Beautiful + animated |
| Change input | ❌ Re-paste | ❌ | ❌ | ✅ Live input swap |
| WHY explanations | ❌ Just values | ⚠️ Text only | ✅ But not interactive | ✅ Popup annotations |
| Compare approaches | ❌ | ⚠️ Text | ⚠️ Sequential | ✅ Side by side |
| Interactivity | ❌ Step only | ❌ | ❌ | ✅ Sliders, toggles, chat |
| Code highlighting | ✅ | ❌ | ⚠️ | ✅ Synced with animation |
| Beautiful | ❌ 2005 UI | ❌ Plain text | ⚠️ Depends | ✅ Premium dark theme |
| AI chat | ❌ | ❌ | ❌ | ✅ "Why does this work?" |

---

## Interactive Features Specific to DSA Mode

### 1. Change the Input
```
Default: nums = [2, 7, 11, 15], target = 9
User changes to: nums = [3, 3], target = 6
→ Entire trace re-runs with new input
→ Animation shows different execution path
→ Popup: "Edge case! Notice both 3's exist — 
   the hash map prevents using the same element twice."
```

### 2. Compare Two Approaches Side by Side
```
User: "I also have a brute force, compare them"

Pastes brute force O(n²) code alongside

┌─── Brute Force O(n²) ─────────┬─── Hash Map O(n) ────────────┐
│  for i in range(n):            │  seen = {}                    │
│    for j in range(i+1, n):     │    for num in nums:           │
│      if nums[i]+nums[j]==t:    │      if target-num in seen:   │
│                                │                               │
│  Steps taken: 10               │  Steps taken: 2               │
│  ██████████████████████████    │  ████░░░░░░░░░░░░░░░░░░░░    │
│                                │                               │
│  Time: O(n²)                   │  Time: O(n)                   │
│  Space: O(1)                   │  Space: O(n)                  │
└────────────────────────────────┴───────────────────────────────┘
```

### 3. Popup Annotations Explain the WHY
Not just "this line executes" but the INSIGHT:
```
Popup on "complement = target - num":
  "Instead of asking 'does any pair sum to target?'
   (which needs O(n²) pairs), we flip the question:
   'have I already seen the NUMBER I NEED?'
   This is the key insight — one lookup instead of one loop."
```

### 4. Live AI Chat
```
User: "Why do we use a hash map and not a sorted array?"
AI: "Great question! A sorted array approach:
     1. Sort the array: O(n log n)
     2. Use two pointers: O(n)
     Total: O(n log n)
     
     Hash map approach:
     1. Single pass: O(n)
     
     Hash map wins! But if memory is constrained,
     the two-pointer approach uses O(1) extra space.
     
     Want me to show both side by side?"
     
User: "Yes"
AI: → generates comparison visualization
```

### 5. Recursion Tree (for recursive solutions)
```
Problem: Fibonacci / Merge Sort / Permutations

fib(5)
├── fib(4)
│   ├── fib(3)
│   │   ├── fib(2) → 1
│   │   └── fib(1) → 1
│   └── fib(2) → 1
└── fib(3)
    ├── fib(2) → 1
    └── fib(1) → 1

Popup: "Notice fib(3) is computed TWICE!
This is why memoization matters.
Toggle [🟢 Memoization ON] to see the difference."

With memo ON: highlighted nodes show cache hits,
half the tree disappears (pruned).
```

---

## Visual Primitive Templates for DSA

| DSA Pattern | Visual | What It Shows |
|------------|--------|---------------|
| **Array traversal** | Row of cells, pointer arrow sliding across | Current index, visited vs unvisited |
| **Two Pointers** | Two colored arrows moving inward/outward | Left/right pointer convergence |
| **Sliding Window** | Highlighted rectangle sliding over array | Window boundaries, sum/count |
| **Hash Map** | Key-value table building up row by row | Insertions, lookups (hit/miss) |
| **Linked List** | Nodes connected by arrows | Pointer rewiring during reversal/merge |
| **Binary Tree** | Tree with highlighted traversal path | DFS/BFS order, recursive calls |
| **Graph** | Nodes + edges with colored traversal wave | BFS layers, DFS backtracking |
| **Stack** | Vertical LIFO with push/pop animations | Call stack, monotonic stack |
| **Queue** | Horizontal FIFO with enter/exit | BFS frontier, sliding window max |
| **DP Table** | 2D grid filling cell by cell | Subproblem dependencies, fill order |
| **Recursion Tree** | Expanding tree of function calls | Call depth, memoization pruning |
| **Matrix/Grid** | 2D grid with cell coloring | Island counting, path finding, rotation |

**~12 visual templates cover 90%+ of LeetCode problems.**

---

## How DSA Mode Fits Into The Product

It's not a separate app — it's a mode within the platform:

```
┌────────────────────────────────────────────────┐
│  🔬 [platform name]                             │
│                                                  │
│  [🌐 Concepts]  [💻 DSA Visualizer]  [📚 Paths]│
│                                                  │
│  Concepts:  "How does DNS work?" → visual sim    │
│  DSA:       Paste code → execution trace         │
│  Paths:     Connected learning journeys          │
│                                                  │
│  SAME engine. SAME primitives. SAME AI chat.    │
│  Different input, same beautiful output.         │
└────────────────────────────────────────────────┘
```

Both modes produce scene JSON. Both use the same rendering engine. Both support live AI chat. We just add a "paste code" input form.

---

## Milestone 1 Scope for DSA Mode

### In Scope
- ✅ Paste problem + solution code
- ✅ Python and JavaScript code support
- ✅ Array, Hash Map, Two Pointers, Sliding Window, Stack primitives
- ✅ Step-by-step execution trace with line highlighting
- ✅ Change input values and re-run
- ✅ Popup "why" annotations per step
- ✅ Play/Pause/Step/Speed controls
- ✅ Live AI chat for follow-up questions

### Out of Scope (v1.1+)
- ❌ AI solving the problem (no code provided)
- ❌ All programming languages (start with Python + JS)
- ❌ Complex graph algorithms, advanced DP table visualization
- ❌ Side-by-side approach comparison
- ❌ Full code editor (just a paste box)
- ❌ LeetCode integration / auto-import
- ❌ Complexity analysis overlay

---

*This is the feature that makes interview prep candidates think "I NEED this." Every LeetCode grinder will share this.*
