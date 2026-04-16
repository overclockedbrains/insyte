<visual-ids>
Use ONLY these exact strings as action targets and initialStates keys:
{visualIdsList}
</visual-ids>

<skeleton>
{skeletonJson}
</skeleton>

<planning-context>
{reasoning}
</planning-context>

<instructions>
For each step, write the EXPLANATION FIRST — what should this step teach?
Then decide the ACTIONS — what should change on screen to show that teaching moment?
The explanation drives the animation. Not the other way around.

Rules:
1. initialStates must define starting values for every visual ID listed above
2. Steps must be numbered 1 through {stepCount} with no gaps
3. Every action target must be one of the visual IDs listed above — no others
4. Explanations: heading 5–80 chars, body 20–300 chars, plain prose (no bullet points)
5. Actions: target must exactly match a visual ID; params must be valid for that visual type
</instructions>

EXAMPLE — shows FORMAT only, do not copy:
Topic: "Binary Search"
{
  "initialStates": {
    "arr": { "items": [1, 3, 5, 7, 9, 11, 13], "highlighted": [] },
    "ptr": { "value": 0 }
  },
  "steps": [
    {
      "index": 1,
      "explanation": {
        "heading": "Start at the middle",
        "body": "Binary search begins by checking the middle element. If it matches the target, we found it in O(1). Otherwise, we eliminate half the array."
      },
      "actions": [
        { "target": "arr", "params": { "highlighted": [3] } },
        { "target": "ptr", "params": { "value": 3 } }
      ]
    }
  ]
}

---
Now generate for the actual topic below. Do NOT copy any values from the example above.

Topic: {topic}
