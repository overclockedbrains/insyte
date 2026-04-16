<planning-context>
{reasoning}
</planning-context>

Based on your planning above, produce the scene skeleton JSON. Follow these rules:

1. Visual IDs must be lowercase with hyphens only (arr, left-ptr, call-stack). No camelCase, no underscores, no numbers as first character.
2. Choose layout that best fits the visual structure (dagre-TB for graphs/trees, linear-H for arrays/stacks, tree-RT for binary trees, grid-2d for DP tables).
3. stepCount must match the number of teaching moments in your planning (typically 6–12).

EXAMPLE — shows FORMAT only, do not copy:
Topic: "Binary Search"
{
  "title": "Binary Search",
  "type": "dsa",
  "layout": "linear-H",
  "visuals": [
    { "id": "arr", "type": "array", "hint": "sorted integer array" },
    { "id": "ptr", "type": "counter", "hint": "current mid index" }
  ],
  "stepCount": 8
}

---
Now generate for the actual topic below. Do NOT copy any values from the example above.

Topic: {topic}
