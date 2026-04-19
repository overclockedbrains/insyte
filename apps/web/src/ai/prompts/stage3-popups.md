<visual-ids>
Attach popups ONLY to these visual IDs:
{visualIdsList}
</visual-ids>

<step-summaries>
Here is what each animation step teaches and which visuals it updates.
Use [updates: ...] to determine when each visual first has meaningful content —
only attach a popup to a visual at or after the step where it first gets updated.
{stepSummaries}
</step-summaries>

<instructions>
Add 2–5 popup callouts for the visualization. Each popup appears for a range of steps.
Step range: 1 to {stepCount}.

Rules:
1. attachTo must be one of the visual IDs listed above
2. showAtStep must be >= the first step where attachTo appears in [updates: ...] — a popup on a visual before it has content is invisible and wrong
3. showAtStep must be <= hideAtStep
4. text: say WHY (insight or warning), not WHAT (the animation already shows what)
5. style: info (fact/context) · warning (common mistake) · success (key takeaway) · insight (pivot moment)
6. Each popup must be grounded in a specific step or step range — not a generic observation about the topic
</instructions>

EXAMPLE — shows FORMAT only, do not copy:
Topic: "Binary Search"
{
  "popups": [
    {
      "attachTo": "arr",
      "showAtStep": 2,
      "hideAtStep": 4,
      "text": "Each comparison eliminates half the remaining elements — that's O(log n)",
      "style": "info"
    },
    {
      "attachTo": "mid-ptr",
      "showAtStep": 5,
      "hideAtStep": 6,
      "text": "When left exceeds right, the target is confirmed absent — this is the termination invariant",
      "style": "warning"
    }
  ]
}

---
Now generate for the actual topic below. Do NOT copy any values from the example above.

Topic: {topic}
