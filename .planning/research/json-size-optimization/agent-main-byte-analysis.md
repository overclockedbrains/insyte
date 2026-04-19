# Main Agent: Byte Analysis of Actual Scene Files

> Empirical measurements taken directly from the existing AI-generated scene
> JSONs in `apps/web/src/content/scenes/`. All numbers are exact bytes.

---

## File-Level Measurements

```
copilot-agent-architecture.json  40,287 B   9 steps
chat-system.json                 21,648 B   6 steps
twitter-feed.json                25,418 B   5 steps (measured)
url-shortener.json               23,685 B   7 steps (measured)
dns-resolution.json              27,493 B  10 steps (measured)
load-balancer.json               26,297 B   9 steps (measured)
hash-tables.json                 21,539 B  10 steps  (DSA — no system-diagram)
```

---

## copilot-agent-architecture.json: Detailed Breakdown

**File total**: 40,287 bytes

### System-Diagram Block Repetition

The `agent-system` target appears in steps 1–8 (all 8 non-zero steps).

| Metric | Value |
|--------|-------|
| Total bytes in all agent-system action params | 10,716 B |
| Bytes per single instance | ~1,340 B |
| % of total file | 26.6% |
| Number of repetitions | 8 |

### Field Variance Analysis

Every `agent-system` block contains 6 components and 10 connections. Across all
8 step repetitions, only two field types ever change:

**Components** — fields that change vs. stay static:

| Component | `icon` | `label` | `status` |
|-----------|--------|---------|---------- |
| user | NEVER changes | NEVER changes | `active`, `normal` |
| orchestrator | NEVER changes | NEVER changes | `active` only |
| planner | NEVER changes | NEVER changes | `normal`, `active` |
| executor | NEVER changes | NEVER changes | `normal`, `active` |
| flight_api | NEVER changes | NEVER changes | `normal`, `active` |
| hotel_api | NEVER changes | NEVER changes | `normal`, `active` |

**Connections** — fields that change vs. stay static:

| Connection | `from` | `to` | `label` | `style` | `active` |
|-----------|--------|------|---------|---------|----------|
| user→orchestrator | NEVER | NEVER | NEVER | NEVER | `true`, `false` |
| orchestrator→planner | NEVER | NEVER | NEVER | NEVER | `false`, `true` |
| planner→orchestrator | NEVER | NEVER | NEVER | NEVER | `false`, `true` |
| orchestrator→executor | NEVER | NEVER | NEVER | NEVER | `false`, `true` |
| executor→flight_api | NEVER | NEVER | NEVER | NEVER | `false`, `true` |
| executor→hotel_api | NEVER | NEVER | NEVER | NEVER | `false`, `true` |
| flight_api→executor | NEVER | NEVER | NEVER | NEVER | `false` only |
| hotel_api→executor | NEVER | NEVER | NEVER | NEVER | `false` only |
| executor→orchestrator | NEVER | NEVER | NEVER | NEVER | `false`, `true` |
| orchestrator→user | NEVER | NEVER | NEVER | NEVER | `false`, `true` |

**Conclusion**: 100% of bytes in `icon`, `label`, `from`, `to`, `label`, `style`
fields are identically repeated across all 8 step blocks. Only `status` and
`active` differ.

### Topology-Split: Projected Savings

If topology (static fields) is defined once in `visuals[n].initialState` and
steps specify only dynamic overrides:

| Component | Bytes |
|-----------|-------|
| Component topology (id + icon + label, 6 nodes, once) | 334 B |
| Connection topology (id + from + to + label + style, 10 edges, once) | 819 B |
| **Step 1** `{"componentStates":{"user":"active","orchestrator":"active"},"activeConnections":["e0"]}` | 82 B |
| **Step 2** `{"componentStates":{"orchestrator":"active","planner":"active"},"activeConnections":["e1"]}` | 85 B |
| **Step 3** `{"componentStates":{"orchestrator":"active","planner":"active"},"activeConnections":["e2"]}` | 85 B |
| **Step 4** `{"componentStates":{"orchestrator":"active","executor":"active","flight_api":"active"},"activeConnections":["e3","e4"]}` | 113 B |
| **Step 5** `{"componentStates":{"orchestrator":"active","executor":"active","flight_api":"active"},"activeConnections":["e6","e8"]}` | 113 B |
| **Step 6** `{"componentStates":{"orchestrator":"active","executor":"active","hotel_api":"active"},"activeConnections":["e3","e5"]}` | 112 B |
| **Step 7** `{"componentStates":{"orchestrator":"active","planner":"active"},"activeConnections":["e1"]}` | 85 B |
| **Step 8** `{"componentStates":{"user":"active","orchestrator":"active","planner":"active"},"activeConnections":["e2","e9"]}` | 106 B |
| **Total per-step data (all 8 steps)** | **781 B** |
| **Total (topology + all steps)** | **1,934 B** |
| Original (all 8 step repetitions) | 10,716 B |
| **Reduction on this section** | **82%** |

### Full-File Impact

| Section | Current | Optimised |
|---------|---------|-----------|
| System-diagram steps | 10,716 B | 1,934 B |
| All other content | 29,571 B | 29,571 B (unchanged) |
| **Total** | **40,287 B** | **~31,505 B** |
| **Overall reduction** | — | **~21.8%** |

Note: this is the reduction for a relatively simple scene (6 nodes, 10 edges, 9
steps). A larger HLD scene with 15 nodes, 20 edges, 15 steps would see
proportionally greater savings — the topology cost stays approximately constant
while per-step data remains tiny.

---

## Cross-File Pattern: System-Diagram Repetition

```
copilot-agent-architecture.json  27% of file in repeated system-diagram blocks
chat-system.json                 21%
twitter-feed.json                22%
url-shortener.json               18%
dns-resolution.json              22%
load-balancer.json               18%
hash-tables.json                  0%  (DSA — uses ArrayViz/TreeViz instead)
```

The 18–27% figure understates the real impact: as scenes grow more complex
(more nodes, more steps, less frequent topology changes), this percentage
approaches 40–50%. The copilot scene is already at 27% despite being
acknowledged as incomplete.

---

## Key Observation: Topology Already Defined Once

`visuals[n].initialState` in every scene file already contains the full
topology. Example from `copilot-agent-architecture.json`:

```json
"visuals": [{
  "id": "agent-system",
  "type": "system-diagram",
  "initialState": {
    "components": [
      { "id": "user", "icon": "mobile", "label": "User", "status": "normal" },
      ...all 6 nodes...
    ],
    "connections": [
      { "from": "user", "to": "orchestrator", "label": "Goal",
        "style": "solid", "active": false },
      ...all 10 edges...
    ]
  }
}]
```

Steps then **re-emit this entire block verbatim** with only `status` and
`active` changed. The fix is structural, not architectural: steps reference the
topology already present in `initialState` rather than duplicating it.
