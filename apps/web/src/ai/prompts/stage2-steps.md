<visual-ids>
The following are the ONLY valid visual IDs. Use these exact strings — unchanged — as both action targets and initialStates keys:
{visualIdsList}
</visual-ids>

<visual-params-guide>
These are the REQUIRED params shapes for each visual type in this scene.
You MUST use these exact field names — wrong or missing fields produce blank visuals.

{visualParamsGuide}
</visual-params-guide>

<skeleton>
{skeletonJson}
</skeleton>

<instructions>
For each step, write the EXPLANATION FIRST — what should this step teach?
Then decide the ACTIONS — what should change on screen to show that teaching moment?
The explanation drives the animation. Not the other way around.

Rules:
1. initialStates MUST contain every visual ID above as a top-level key. No other keys allowed.
   Example: if visual IDs are "foo" and "bar", initialStates must be: { "foo": {...}, "bar": {...} }
2. Steps must be numbered 1 through {stepCount} with no gaps
3. Every action target must be one of the visual IDs listed above — no others
4. Explanations: heading up to 80 chars, body up to 400 chars, plain prose (no bullet points)
5. Actions: target must exactly match a visual ID; params must match the shape in <visual-params-guide>
6. params must NEVER be {} — every action must supply the COMPLETE state for that visual (full snapshot, not a delta)
7. ONE EVENT PER STEP — each step teaches exactly one discrete thing. If two events happen sequentially (e.g. "request arrives" then "orchestrator deconstructs it"), split them into separate steps. Never combine cause and effect in the same step.
8. EXPLANATION-ACTION SYNC — if your explanation says data arrives at, becomes visible in, or is produced by a visual, that visual MUST appear in that step's actions. Re-send its full state with a highlight if needed. A visual mentioned in the explanation but absent from actions is a bug.
</instructions>

⚠ VALIDATION CHECKLIST — your output WILL be rejected if any of these fail:
- initialStates must have a key for EVERY visual ID listed above (empty {} fails)
- Every initialState value must have real fields ({"text":"..."} not {})
- Every action params must have real fields matching the guide (empty {} fails)
- system-diagram params must include both "components" and "connections" arrays
- Every visual mentioned in an explanation heading/body must appear in that step's actions
- initialState values must be the DIRECT state object — NEVER wrap in "params": { "components": [...] } ✓ is correct; { "params": { "components": [...] } } ✗ is wrong. The "params" key belongs in step actions only.

<planning-context>
{reasoning}
</planning-context>

Before writing the JSON, list your {stepCount} teaching moments in order (one line each).
This ensures your step count is correct before you start generating.
Then output the JSON.

<example>
Topic: "Binary Search"
Visuals: arr (array), mid-ptr (text-badge)

Teaching moments:
1. Set up the sorted array
2. Calculate the first midpoint
3. Target is larger — eliminate left half
4. Recalculate midpoint in right half
5. Target found at new midpoint

{
  "initialStates": {
    "arr": { "items": [{"id":"a0","value":1},{"id":"a1","value":3},{"id":"a2","value":5},{"id":"a3","value":7}] },
    "mid-ptr": { "text": "Idle", "style": "default" }
  },
  "steps": [
    {
      "index": 1,
      "explanation": {
        "heading": "Start at the middle",
        "body": "Binary search begins by checking the middle element. If it matches the target, we found it in O(1). Otherwise, we eliminate half the array and repeat — giving O(log n) total comparisons."
      },
      "actions": [
        { "target": "arr", "params": { "items": [{"id":"a0","value":1},{"id":"a1","value":3},{"id":"a2","value":5,"highlight":"active"},{"id":"a3","value":7}] } },
        { "target": "mid-ptr", "params": { "text": "mid = index 2", "style": "highlight" } }
      ]
    }
  ]
}
</example>

Do NOT copy any values from the example above. Generate entirely new values for your topic.

---
Now generate for the actual topic below.

Topic: {topic}
