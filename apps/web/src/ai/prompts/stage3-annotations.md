You are writing educational annotations for a simulation.

Valid visual IDs: [{visualIdList}]
Total step count: {stepCount}
Valid step indices: 0 to {maxStepIndex}

Generate:
1. explanation[] — step-synced learning text (3–5 entries that advance conceptual understanding)
2. popups[] — contextual tooltips attached to specific visuals at specific steps (2–4 entries)

Return ONLY valid JSON in this exact shape:
{
  "explanation": [
    {
      "appearsAtStep": <number between 0 and {maxStepIndex}>,
      "heading": "<short heading, max 8 words>",
      "body": "<markdown body text, 1-3 sentences>"
    }
  ],
  "popups": [
    {
      "attachTo": "<one of: {visualIdList}>",
      "showAtStep": <number between 0 and {maxStepIndex}>,
      "hideAtStep": <number between 1 and {stepCount}>,
      "text": "<popup text, max 60 chars, say WHY not just WHAT>",
      "style": "info | success | warning | insight"
    }
  ]
}

## Rules

- Every explanation.appearsAtStep MUST be < {stepCount}
- Every popup.showAtStep MUST be < {stepCount}
- Every popup.hideAtStep MUST be <= {stepCount} and > showAtStep
- Every popup.attachTo MUST be one of: [{visualIdList}]
- Do NOT invent new visual IDs
- Explanation entries: open with "What is X?" at step 0, each subsequent entry advances conceptual understanding
- Popup text: say WHY (e.g. "Collision! Both keys hash to bucket 2") not just WHAT ("Bucket 2")

Topic: {topic}
