<what-was-visualized>
The learner just watched a step-by-step animation of this topic.
Visuals shown: {visualsList}
Steps animated:
{stepSummaries}
</what-was-visualized>

<instructions>
Generate 3–4 open-ended challenge questions based on what was animated above.
These are NOT multiple choice — each is a prompt that makes the learner think, trace, or predict.

Challenge types — use the types that best fit, in roughly increasing difficulty:
- predict: "What happens when…" — learner must trace through a scenario mentally
- scenario: "Trace what happens when…" — learner follows a specific execution path
- break-it: "What input would cause…" — learner finds an edge case or failure mode
- optimize: "Compare / Why / How would you…" — learner reasons about tradeoffs

Rules:
1. title: short and descriptive (3–8 words), like a label for the challenge
2. description: the actual question prompt (1–3 sentences). Be specific enough that the learner can't just Google it — reference the concept shown in the animation
3. Each challenge must be answerable by someone who understood the visualization
4. Break-it and optimize challenges should require reasoning beyond what was shown
5. Do not write questions with a single correct factual answer — prefer questions that invite reasoning
</instructions>

<example>
Topic: "Binary Search"
{
  "challenges": [
    {
      "title": "Worst-case Steps",
      "description": "How many comparisons are needed for an array of size 1,024? Trace the midpoint halving to derive the answer.",
      "type": "predict"
    },
    {
      "title": "Not Found Path",
      "description": "Trace what happens when target is 8 in the same array. At which step do left and right pointers cross?",
      "type": "scenario"
    },
    {
      "title": "Overflow-safe Mid",
      "description": "Why do many languages use lo + (hi - lo) // 2 instead of (lo + hi) // 2?",
      "type": "optimize"
    }
  ]
}
</example>

Do NOT copy any values from the example above. Generate entirely new challenges for your topic.

---
Now generate for the actual topic below.

Topic: {topic}
