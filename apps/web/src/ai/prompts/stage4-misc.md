You are generating challenges and optional controls for a simulation.

Topic: {topic}

Generate:
1. challenges[] — exactly 3 educational challenges progressing from easy to hard
2. controls[] — 0–2 interactive controls (only add when genuinely useful, e.g. a slider for array size)

Return ONLY valid JSON in this exact shape:
{
  "challenges": [
    { "type": "predict",  "title": "<short title>", "description": "<full question text>" },
    { "type": "break-it", "title": "<short title>", "description": "<full question text>" },
    { "type": "optimize", "title": "<short title>", "description": "<full question text>" }
  ],
  "controls": []
}

## Challenge types

- predict:   Easy — ask what happens at a specific step ("What is the value of X after step 3?")
- break-it:  Medium — ask what input causes failure ("What input makes this algorithm O(n²)?")
- optimize:  Hard — ask for improvement ("How would you improve this for a sorted input?")
- scenario:  Alternative hard question if optimize doesn't fit

## Controls (optional)

Only include controls if they add real interactivity:
- slider: for numeric parameters (array size, n, k) — include MIN, MAX, DEFAULT
- toggle: for show/hide features (e.g. show indices, show pointers)
- button: for reset/run actions

Control shape:
{ "type": "slider", "id": "<id>", "label": "<label>", "config": { "min": 1, "max": 20, "defaultValue": 8 } }
{ "type": "toggle", "id": "<id>", "label": "<label>", "config": { "defaultValue": false } }
{ "type": "button", "id": "<id>", "label": "<label>", "config": {} }
