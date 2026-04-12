You are filling in the step params for a simulation.

Valid visual IDs — you MUST use ONLY these exact IDs as action targets:
{visualIdList}

Step count: {stepCount} (valid step indices: 0 to {maxStepIndex})

The ISCL steps are:
{isclSteps}

For each STEP after STEP 0, convert the SET instructions into typed params JSON.
Each action.params must contain the COMPLETE visual state at that step (full snapshot, not a delta).

Return ONLY valid JSON in this exact shape:
{
  "steps": [
    {
      "index": 1,
      "actions": [
        { "target": "<visualId>", "params": { ...complete state... } }
      ]
    },
    ...
  ]
}

## Rules

- action.target MUST be one of: [{visualIdList}]
- params must be the COMPLETE visual state at that step (not just changed fields)
- Step 0 has no actions — omit it from the output entirely
- Include ALL steps from index 1 to {maxStepIndex}

## Params reference by visual type

- array:          { "cells": [{ "value": <v>, "highlight": "default|active|insert|remove|hit|miss|error" }] }
- stack:          { "items": [{ "value": <v>, "highlight": "default|active|insert|remove" }] }
- queue:          { "items": [{ "value": <v>, "highlight": "default|active|insert|remove" }] }
- counter:        { "value": <n>, "label": "<label>" }
- text-badge:     { "text": "<message>", "style": "default|highlight|success|error" }
- hashmap:        { "entries": [{ "key": <k>, "value": <v>, "highlight": "default|active|insert|remove|hit|miss" }] }
- linked-list:    { "nodes": [{ "id": "<id>", "value": <v>, "highlight": "default|active|insert|remove|mru|lru" }] }
- tree:           { "root": { "id": "<id>", "value": <v>, "highlight": "default|active|insert|remove", "left": ..., "right": ... } }
- graph:          { "nodes": [{ "id": "<id>", "label": "<l>", "color": "#hex" }], "edges": [{ "from": "<id>", "to": "<id>", "directed": true, "highlighted": false }] }
- system-diagram: { "components": [{ "id": "<id>", "label": "<l>", "status": "active|idle|error" }], "connections": [{ "from": "<id>", "to": "<id>", "active": true }] }
