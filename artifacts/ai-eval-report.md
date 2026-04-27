# AI Pipeline Evaluation Report
Date: 2026-04-27T19:35:41.050Z

## Summary
- Total Tests: 14
- Passed: 11
- Failed: 3

## Failures
### ❌ Binary Search Tree Insertion (tree)
```
Stage 1 failed: This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.
Cause: 
Raw: 
```

### ❌ 0/1 Knapsack Dynamic Programming (grid)
```
Stage 2 failed: [
  {
    "expected": "'server' | 'database' | 'mobile' | 'web' | 'compute' | 'cloud' | 'shield' | 'layers' | 'zap'",
    "received": "undefined",
    "code": "invalid_type",
    "path": [
      "initialStates",
      "knapsack-diagram",
      "components",
      1,
      "icon"
    ],
    "message": "Required"
  },
  {
    "code": "invalid_union",
    "unionErrors": [
      {
        "issues": [
          {
            "code": "invalid_type",
            "expected": "string",
            "received": "null",
            "path": [
              "steps",
              7,
              "hud",
              "hud-item-idx"
            ],
            "message": "Expected string, received null"
          }
        ],
        "name": "ZodError"
      },
      {
        "issues": [
          {
            "code": "invalid_type",
            "expected": "number",
            "received": "null",
            "path": [
              "steps",
              7,
              "hud",
              "hud-item-idx"
            ],
            "message": "Expected number, received null"
          }
        ],
        "name": "ZodError"
      }
    ],
    "path": [
      "steps",
      7,
      "hud",
      "hud-item-idx"
    ],
    "message": "Invalid input"
  },
  {
    "code": "invalid_union",
    "unionErrors": [
      {
        "issues": [
          {
            "code": "invalid_type",
            "expected": "string",
            "received": "null",
            "path": [
              "steps",
              7,
              "hud",
              "hud-capacity"
            ],
            "message": "Expected string, received null"
          }
        ],
        "name": "ZodError"
      },
      {
        "issues": [
          {
            "code": "invalid_type",
            "expected": "number",
            "received": "null",
            "path": [
              "steps",
              7,
              "hud",
              "hud-capacity"
            ],
            "message": "Expected number, received null"
          }
        ],
        "name": "ZodError"
      }
    ],
    "path": [
      "steps",
      7,
      "hud",
      "hud-capacity"
    ],
    "message": "Invalid input"
  }
]
Cause: 
Raw: 
```

### ❌ QuickSort Partitioning (chart)
```
Stage 2 failed: [
  {
    "code": "invalid_union",
    "unionErrors": [
      {
        "issues": [
          {
            "code": "invalid_type",
            "expected": "string",
            "received": "null",
            "path": [
              "steps",
              7,
              "hud",
              "hud-i"
            ],
            "message": "Expected string, received null"
          }
        ],
        "name": "ZodError"
      },
      {
        "issues": [
          {
            "code": "invalid_type",
            "expected": "number",
            "received": "null",
            "path": [
              "steps",
              7,
              "hud",
              "hud-i"
            ],
            "message": "Expected number, received null"
          }
        ],
        "name": "ZodError"
      }
    ],
    "path": [
      "steps",
      7,
      "hud",
      "hud-i"
    ],
    "message": "Invalid input"
  },
  {
    "code": "invalid_union",
    "unionErrors": [
      {
        "issues": [
          {
            "code": "invalid_type",
            "expected": "string",
            "received": "null",
            "path": [
              "steps",
              7,
              "hud",
              "hud-j"
            ],
            "message": "Expected string, received null"
          }
        ],
        "name": "ZodError"
      },
      {
        "issues": [
          {
            "code": "invalid_type",
            "expected": "number",
            "received": "null",
            "path": [
              "steps",
              7,
              "hud",
              "hud-j"
            ],
            "message": "Expected number, received null"
          }
        ],
        "name": "ZodError"
      }
    ],
    "path": [
      "steps",
      7,
      "hud",
      "hud-j"
    ],
    "message": "Invalid input"
  }
]
Cause: 
Raw: 
```

## Passed
- ✅ Stack Push and Pop operations (linear)
- ✅ Binary Search on a sorted array (linear)
- ✅ Two Sum using a Hash Map (map)
- ✅ LRU Cache Eviction Policy (map)
- ✅ Trie Word Search (tree)
- ✅ Dijkstra's Algorithm (graph)
- ✅ Breadth First Search Traversal (graph)
- ✅ Maze Pathfinding using DFS (grid)
- ✅ Character Frequency Distribution (chart)
- ✅ OAuth 2.0 Authorization Code Flow (system-diagram)
- ✅ Load Balancer Round Robin Routing (system-diagram)
