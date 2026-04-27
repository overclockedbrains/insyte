<canvas-ids>
The following are the ONLY valid canvas visual IDs. Use these exact strings as both canvas update keys and initialStates keys:
{canvasIdsList}
</canvas-ids>

<prompt-guide>
{promptGuide}
</prompt-guide>

<skeleton>
{skeletonJson}
</skeleton>

<instructions>
INITIALSTATE SEMANTICS — read this before writing initialStates:
  Sequential (linear, map, grid, chart):
    initialState = the first frame of the animation. Provide real starting values.
    Steps re-emit the COMPLETE current state on every canvas update.
  Identity-based (graph, tree, system-diagram):
    initialState = complete topology declaration. Assign short stable IDs to EVERY
    node/edge/component/connection (e.g. "a","b","e0","c1"). This is the ONLY place
    topology fields appear. Steps reference these IDs via sparse overlay keys.

For each step, write the EXPLANATION FIRST — what should this step teach?
Then decide what changes on screen (canvas updates, activeText, hud) to show that teaching moment.
The explanation drives the animation. Not the other way around.

Rules:
1. `initialStates` must contain every canvas visual ID above as a top-level key. No other keys allowed.
2. Steps must be numbered 1 through {stepCount} with no gaps. Step 0 is always implicit (the initial state).
3. Every canvas update key must be one of the canvas visual IDs listed above — no others.
4a. Sequential primitives (linear, map, grid, chart): canvas updates are FULL STATE SNAPSHOTS — include every item/entry/cell/bar, not just changed ones. Every item and entry must include its `id` field.
4b. Identity-based primitives (graph, tree, system-diagram): canvas updates use SPARSE OVERLAY — write only nodeStates/edgeStates/componentStates/connectionStates for what changes THIS step. Never include topology keys (nodes/edges/components/connections) in steps.
5. `activeText` in a step: a short string describing the current operation (e.g. "i=0, num=2, need=7 → miss"). Omit if unchanged.
6. `hud` in a step: object keyed by hud item id with updated value. Omit if unchanged.
7. Explanations: heading up to 80 chars (active voice, present tense), body up to 500 chars (explain WHY this step matters), callout (optional) up to 200 chars (surprising insight or invariant).
8. ONE EVENT PER STEP — each step teaches exactly one discrete thing. Split cause and effect into separate steps.
9. EXPLANATION-CANVAS SYNC — if your explanation mentions a visual, that visual must have a canvas update in that step.
10. Every linear `items[]` entry and map `entries[]` entry must include a stable `id` string field in every step snapshot.
11. For identity-based types: every ID referenced in step canvas (nodeStates keys, newNodes ids, etc.) must be declared in initialStates topology. Never reference an undeclared ID.
</instructions>

⚠ VALIDATION CHECKLIST — your output WILL be rejected if any of these fail:
- `initialStates` must have a key for EVERY canvas visual ID listed above
- Every initialState value must be a real state object ({"items":[...]} not {})
- Identity-based initialState must have topology: graph → nodes[]+edges[], tree → nodes[]+rootId, system-diagram → components[]+connections[]
- graph/tree/system-diagram: step canvas must use nodeStates/edgeStates/componentStates/connectionStates — NEVER nodes/edges/components/connections in steps
- graph initialState: every node needs id+label; every edge needs id+from+to
- graph/weighted initialState: edges[].weight (number) REQUIRED on every edge in initialStates (not in steps)
- graph/weighted nodes[].distance: optional string in initialStates only ("∞" for unreached nodes)
- tree initialState: every node needs id+value+children (children:[] for leaves); rootId must match a node id
- Trie nodes use isEnd: true/false (boolean) to mark word boundaries; root node has value: ""
- system-diagram initialState: every component needs id+label+icon; every connection needs id+from+to
- system-diagram with layoutHint "ring" uses the same state format as all other system-diagrams
- Sequential canvas updates must use correct field names per the prompt-guide above
- Every visual mentioned in an explanation must appear in that step's canvas updates
- `activeText` must never be an empty string — omit it instead

<planning-context>
{reasoning}
</planning-context>

Before writing the JSON, list your {stepCount} teaching moments in order (one line each).
Then output the JSON.

<example>
EXAMPLE 1 — Sequential primitives (linear + map full-snapshot pattern)
Topic: "Two Sum"
Canvas visuals: arr (linear, variant: array), seen-map (map)
HUD: hud-i (label: "i")

Teaching moments:
1. Scan first element, check complement, store in seen
2. Hit — complement found, return the pair

{
  "initialStates": {
    "arr": { "items": [{"id":"i0","value":2},{"id":"i1","value":7},{"id":"i2","value":11},{"id":"i3","value":15}] },
    "seen-map": { "entries": [] }
  },
  "initialActiveText": "Start scan from left",
  "initialHud": { "hud-i": 0 },
  "steps": [
    {
      "index": 1,
      "explanation": {
        "heading": "Lookup Before Insert",
        "body": "For each number, check if its complement is in seen before inserting. Lookup-first avoids reusing the same element.",
        "callout": "O(1) lookup per step → O(n) total."
      },
      "activeText": "i=0, num=2, need=7 → miss, store 2:0",
      "hud": { "hud-i": 0 },
      "canvas": {
        "arr": { "items": [{"id":"i0","value":2,"highlight":"active"},{"id":"i1","value":7},{"id":"i2","value":11},{"id":"i3","value":15}] },
        "seen-map": { "entries": [{"id":"e0","key":"2","value":"0","highlight":"insert"}] }
      }
    },
    {
      "index": 2,
      "explanation": {
        "heading": "Hit Means Answer",
        "body": "At i=1, complement 2 is present in seen — return the pair immediately."
      },
      "activeText": "i=1, num=7, need=2 → HIT in seen",
      "hud": { "hud-i": 1 },
      "canvas": {
        "arr": { "items": [{"id":"i0","value":2,"highlight":"hit"},{"id":"i1","value":7,"highlight":"active"},{"id":"i2","value":11},{"id":"i3","value":15}] },
        "seen-map": { "entries": [{"id":"e0","key":"2","value":"0","highlight":"hit"}] }
      }
    }
  ]
}
</example>

<example>
EXAMPLE 2 — Identity-based primitive (graph sparse overlay pattern)
Topic: "Graph BFS"
Canvas visuals: g (graph, no variant)

Key rules demonstrated:
- initialState declares ALL nodes and edges with stable IDs — never repeated in steps
- Step canvas uses nodeStates/edgeStates (NOT nodes/edges)
- Unlisted nodes/edges reset to highlight:"default" each step
- Only nodes/edges with non-default state appear in nodeStates/edgeStates

Teaching moments:
1. Enqueue start node A, mark its neighbours
2. Visit B — dequeue next, A is fully done

{
  "initialStates": {
    "g": {
      "nodes": [
        {"id": "a", "label": "A"},
        {"id": "b", "label": "B"},
        {"id": "c", "label": "C"}
      ],
      "edges": [
        {"id": "e0", "from": "a", "to": "b", "directed": true},
        {"id": "e1", "from": "a", "to": "c", "directed": true}
      ]
    }
  },
  "steps": [
    {
      "index": 1,
      "explanation": {
        "heading": "Enqueue Start",
        "body": "Visit A and enqueue its neighbours B and C.",
        "callout": "BFS explores all neighbours before going deeper."
      },
      "activeText": "queue=[A] → visit A, enqueue B C",
      "canvas": {
        "g": {
          "nodeStates": {
            "a": {"highlight": "active"},
            "b": {"highlight": "queued"},
            "c": {"highlight": "queued"}
          },
          "edgeStates": {
            "e0": {"highlight": "active"},
            "e1": {"highlight": "active"}
          }
        }
      }
    },
    {
      "index": 2,
      "explanation": {
        "heading": "Visit B",
        "body": "Dequeue B — mark it visited. A is already done. edgeStates omitted → edges reset to default highlight."
      },
      "activeText": "queue=[C] → visit B",
      "canvas": {
        "g": {
          "nodeStates": {
            "a": {"highlight": "visited"},
            "b": {"highlight": "active"},
            "c": {"highlight": "queued"}
          }
        }
      }
    }
  ]
}
</example>

Do NOT copy any values from the examples above. Generate entirely new values for your topic.

---
Now generate for the actual topic below.

Topic: {topic}
