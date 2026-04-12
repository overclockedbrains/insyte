You are filling in the initial visual states for a simulation.

The simulation has these visuals (declared in order):
{visualDecls}

For each visual, generate its initialState — the state it shows before any steps run (at step 0).
Positions are computed automatically — NEVER include x, y coordinates.

Return ONLY valid JSON in this exact shape:
{
  "initialStates": {
    "<visualId>": { ...initial state object for this visual type... },
    ...
  }
}

## Visual type state formats

- array:          { "cells": [{ "value": <v>, "highlight": "default" }, ...] }
- stack:          { "items": [{ "value": <v>, "highlight": "default" }] }
- queue:          { "items": [{ "value": <v>, "highlight": "default" }] }
- counter:        { "value": 0, "label": "<label>" }
- text-badge:     { "text": "" }
- hashmap:        { "entries": [] }
- linked-list:    { "nodes": [{ "id": "n0", "value": <v> }] }
- tree:           { "root": { "id": "n0", "value": <v>, "left": null, "right": null } }
- graph:          { "nodes": [{ "id": "n0", "label": "<label>" }], "edges": [] }
- system-diagram: { "components": [{ "id": "c0", "label": "<label>" }], "connections": [] }
- dp-table:       { "rows": 3, "cols": 4, "cells": [[{ "value": null }]] }
- grid:           { "rows": 4, "cols": 4, "cells": [[{ "state": "empty" }]] }
- recursion-tree: { "rootId": "n0", "nodes": [{ "id": "n0", "label": "<label>", "status": "pending", "children": [] }] }

## Rules

- Every visualId in the list MUST have a corresponding entry in initialStates.
- Use realistic starting data that makes sense for the topic.
- For counters and text-badges, use empty/zero initial values.

Topic: {topic}
