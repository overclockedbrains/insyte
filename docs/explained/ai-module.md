# How the AI Module Works

When a user types "How does binary search work?" and hits enter, the AI module's job is to turn that text prompt into a structured **Scene JSON** — the data that drives everything the user sees on screen (the animated array, the pointers, the step-by-step explanations, the quiz questions).

The key insight: **it does NOT ask the AI to produce one giant JSON blob.** That approach hallucinates badly. Instead, it breaks the work into 5 small, focused calls to the LLM — each one asking for a very specific piece, and each one validated before moving on.

---

## The 5 Stages — Like an Assembly Line

Think of it like a factory assembly line building a car:

### Stage 1 — The Blueprint (ISCL Script)

**"Hey AI, write me a script describing what this visualization should look like."**

The AI writes an ISCL script — a simple text format this project invented. It says things like:

- "I need an array visual and a text-badge visual"
- "Step 1: set the array to [1,3,5,7,9], set the badge to 'lo=0'"
- "Step 2: highlight index 2, badge says 'mid=2'"

**This is the most critical stage.** If this fails, everything stops — there's no recovering without a blueprint. The AI never specifies pixel coordinates here — just *what* to show and *when*. Positioning is computed later by the layout engine.

Before parsing, two "cleanup" functions run on the raw output because LLMs are sloppy:

- `stripCodeFences` — removes ` ```iscl ``` ` wrappers the model adds despite being told not to
- `joinStepContinuations` — fixes lines the model broke across multiple rows

### Stage 2a + 2b — The Parts (run in parallel)

Now the pipeline knows *what visuals exist* from Stage 1, so it asks two more questions **at the same time**:

**2a — "What's the starting state of each visual?"** → Things like: the array starts with `[1,3,5,7,9]`, the badge starts with label "lo=0 hi=4". If this fails, no big deal — defaults kick in.

**2b — "What are the detailed step parameters?"** → The exact action details for each step. If this fails, the pipeline stops — you can't animate nothing.

Both are just "give me JSON" calls that get validated against the Stage 1 blueprint (making sure they only reference visuals that actually exist).

### Stage 3 — Annotations

**"Write the explanations and popups for each step."**

This is the text that appears in the explanation panel on the left ("Binary search works by repeatedly halving the search space...") and the little callout bubbles that appear on specific visuals at specific steps.

Non-fatal — if it fails, you just get a visualization without explanations.

### Stage 4 — Extras

**"Give me quiz questions and interactive controls."**

The "What's the time complexity?" multiple choice quiz, playback speed toggles, etc. Lowest priority — gets only 1 retry attempt instead of 2 to save tokens.

Non-fatal — if it fails, no quizzes, no big deal.

### Stage 5 — Assembly (No AI involved)

**Pure code, zero LLM calls.** Takes all the pieces from stages 1-4 and stitches them together into one `Scene` JSON object. Runs it through Zod schema validation. If the final object is invalid, everything fails.

---

## How the Client Sees It

The whole pipeline is an **async generator** — it `yield`s events as each stage completes:

```
User types → plan event (title + skeleton) → content (visuals + steps) → annotations → misc → complete (full Scene)
```

The frontend (`useStreamScene`) receives these over SSE (Server-Sent Events) and progressively updates the UI — the user sees a skeleton appear immediately after Stage 1, then the visualization fills in as each subsequent stage lands.

---

## The Supporting Cast

- **`client.ts`** — Single function `callLLM(prompt, config)`. Wraps the Vercel AI SDK. All 5 stages go through this.
- **`registry.ts`** — The phone book of all providers (Gemini, OpenAI, Anthropic, Groq, Ollama, custom). Pure data, no logic — just model names, defaults, and configs.
- **`providers/`** — One file per provider. Each exports a factory that creates the right SDK client from an API key.
- **`validators/`** — One per stage (states, steps, annotations, misc). Each takes raw JSON + the Stage 1 blueprint and says "yes this is valid" or "no, here's why."
- **`assembly.ts`** — The Stage 5 stitcher. Pure function, deterministic.
- **`liveChat.ts`** — Completely separate system. Powers the chat sidebar. Streams a tutor response with minimal scene context (not the full JSON).
