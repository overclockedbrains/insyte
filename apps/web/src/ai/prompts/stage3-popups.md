<visual-ids>
Attach popups ONLY to these visual IDs:
{visualIdsList}
</visual-ids>

Add 2–5 popup callouts for the visualization. Each popup appears for a range of steps.
Step range: 1 to {stepCount}.

Rules:
1. attachTo must be one of the visual IDs listed above
2. showAtStep must be <= hideAtStep
3. text: say WHY (insight or warning), not WHAT (the animation already shows what)
4. style: info (fact/context) · warning (common mistake) · success (key takeaway) · insight (pivot moment)

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
    }
  ]
}

---
Now generate for the actual topic below. Do NOT copy any values from the example above.

Topic: {topic}
