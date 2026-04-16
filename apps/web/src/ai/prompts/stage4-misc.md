Generate 3 challenges for a learner who just watched this visualization.

Challenge types — include all three types in this order:
1. predict: "What happens when…" — tests prediction before running
2. break-it: "What input would cause…" — tests edge case understanding
3. optimize: "How would you improve…" — tests deeper understanding

Rules:
1. 2–4 answer options per challenge; exactly one correct (0-indexed answer field)
2. No spoilers — don't reference the visualization's specific values
3. Increasing difficulty: predict → break-it → optimize

EXAMPLE — shows FORMAT only, do not copy:
Topic: "Binary Search"
{
  "challenges": [
    {
      "question": "If the target is larger than every element, how many comparisons does binary search make on a 16-element array?",
      "options": ["1", "4", "8", "16"],
      "answer": 1,
      "type": "predict"
    },
    {
      "question": "What input causes binary search to perform the maximum number of comparisons?",
      "options": ["An empty array", "A sorted array with the target at index 0", "A sorted array where the target is not present", "A reversed array"],
      "answer": 2,
      "type": "break-it"
    },
    {
      "question": "Binary search requires a sorted array. What technique allows you to binary search an almost-sorted array?",
      "options": ["Re-sort before each search", "Use a skip list instead", "Extend the search window by ±k positions", "Fall back to linear search"],
      "answer": 2,
      "type": "optimize"
    }
  ]
}

---
Now generate for the actual topic below. Do NOT copy any values from the example above.

Topic: {topic}
