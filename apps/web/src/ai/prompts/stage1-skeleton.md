<planning-context>
{reasoning}
</planning-context>

Based on your planning above, produce the scene skeleton JSON. Follow these rules:

1. Visual IDs must be lowercase with hyphens only (arr, seen-map, call-stack). No camelCase, no underscores, no numbers as first character.
2. `canvas[]` lists the data-structure visuals on screen. Each entry needs id, type, layoutHint, and — where required — variant.
3. Allowed types and their required/optional variants:
   - `linear` → variant required: "array" | "stack" | "queue" | "linked-list"
   - `map` → no variant
   - `tree` → variant optional: "binary" (default), "trie" for prefix trees, "recursion" for call trees
   - `graph` → variant optional: "weighted" for Dijkstra/MST algorithms
   - `grid` → variant required: "pathfinding" | "dp"
   - `system-diagram` → no variant
   - `chart` → variant required: "bar"
4. Choose layoutHint that best fits: dagre-TB/LR for graphs/trees, linear-H for array/queue/linked-list, linear-V for stacks, tree-RT for binary trees, grid-2d for grids, hashmap-buckets for maps, chart-bar for bar charts, ring for circular system-diagrams (consistent hashing etc).
5. `activeText: true` if you want a live operation-label overlay at the top of the canvas (recommended for DSA traces).
6. `hud[]` is for 0–2 short numeric counters or status values shown top-right (e.g. `i`, `comparisons`). Omit if not needed.
7. stepCount must match the number of teaching moments in your planning (typically 6–12).

EXAMPLE — shows FORMAT only, do not copy:
Topic: "Two Sum"
{
  "title": "Two Sum",
  "type": "dsa-trace",
  "description": "Trace the complement-lookup strategy.",
  "category": "Data Structures & Algorithms",
  "canvas": [
    { "id": "arr", "type": "linear", "variant": "array", "layoutHint": "linear-H" },
    { "id": "seen-map", "type": "map", "layoutHint": "hashmap-buckets" }
  ],
  "activeText": true,
  "hud": [
    { "id": "hud-i", "label": "i" }
  ],
  "stepCount": 8
}

---
Now generate for the actual topic below. Do NOT copy any values from the example above.

Topic: {topic}
