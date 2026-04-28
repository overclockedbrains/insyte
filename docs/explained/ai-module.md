# How the AI Module Works

When a user types "How does binary search work?" and hits enter, the AI module's job is to turn that text prompt into a structured **Scene JSON v2** — the data that drives everything the user sees on screen (the animated array, the pointers, the step-by-step explanations, the quiz questions).

The key insight: **it does NOT ask the AI to produce one giant JSON blob.** That approach hallucinates badly. Instead, it breaks the work into focused, sequential calls to the LLM — each asking for a specific piece, validated before moving on.

---

## The Stages — Like an Assembly Line

Think of it like a factory assembly line building a car. There are 6 stages (Stage 0 through Stage 5).

### Stage 0 — Free Reasoning

**"Think out loud first."**

Before touching any schema, the AI is given the prompt and asked to reason freely — no output constraints, no structure. It thinks through what the best visualization would look like, what visual types to use, how many steps make sense.

The reasoning streams back to the client in real time as visible text. This stage primes the model's attention for the structured stages that follow.

This stage is **fatal** — if it fails, the pipeline stops.

### Stage 1 — Scene Skeleton

**"Now produce the canvas layout: visual types, IDs, initial states."**

The AI outputs the scene skeleton: `canvas[]` (the visual data structures to display), `activeText` (narration badge), `hud[]` (stat counters), `code` block, and scene metadata (title, type, layout). No steps yet.

**This is the most critical schema-bound stage.** Canvas IDs are constrained to a regex. The AI never specifies pixel coordinates — just *what* to show and *what type* it is. The layout engine handles positioning.

Output is validated against `SceneSkeletonSchema` (Zod). Fatal.

### Stage 2 — Steps + Initial States

**"Given the skeleton, produce the step-by-step mutations."**

The AI fills in `steps[]` — each step has canvas state updates (`canvas`), narration updates (`activeText`, `hud`), and an explanation (`heading`, `body`, `callout`). Validated against a dynamically-built schema that constrains all canvas references to the IDs from Stage 1.

This is the heaviest stage — it co-generates steps AND validates referential integrity (every step key must be a real canvas ID). Default retry budget: 2. Fatal.

### Stage 3 — Popups

**"Add callout bubbles to specific visuals at specific steps."**

Popups are the little annotation cards that appear on visuals at particular steps (e.g., "pivot chosen here" on an array element at step 3). Validated against a schema that constrains `attachTo` to valid canvas IDs.

**Non-fatal** — if this fails, you just get a visualization without callout bubbles.

### Stage 4 — Misc

**"Add challenges and interactive controls."**

Multiple-choice quiz questions, playback speed toggles, and other extras. Gets 1 retry attempt (instead of 2) to save tokens.

**Non-fatal** — if this fails, no quizzes, no big deal.

Stages 3 and 4 run **in parallel** after Stage 2 completes.

### Stage 5 — Assembly (No AI Involved)

**Pure deterministic code, zero LLM calls.**

Takes all pieces from Stages 1–4 and stitches them into one `Scene` JSON object. Runs full Zod validation (`safeParseScene`) including cross-field semantic checks (popup `attachTo` vs canvas IDs, step canvas keys vs canvas IDs). If the final object is invalid, the pipeline fails. Fatal.

---

## How the Client Sees It

The whole pipeline is an **async generator** — it `yield`s `GenerationEvent` objects as each stage completes:

```
User types prompt
  → reasoning (Stage 0 chunks stream live)
  → plan event (title + skeleton, Stage 1)
  → content event (steps + states, Stage 2)
  → annotations event (popups, Stage 3)
  → misc event (challenges + controls, Stage 4)
  → complete event (full validated Scene JSON, Stage 5)
```

The frontend (`useStreamScene`) consumes these over SSE and progressively updates the UI — the user sees the skeleton appear immediately after Stage 1, then the full visualization fills in as each subsequent stage lands.

---

## The Supporting Cast

- **`pipeline.ts`** — the main async generator. Orchestrates all stages, manages retry budgets, emits events.
- **`client.ts`** — `callLLM(prompt, config)`. Single wrapper around the Vercel AI SDK. All stages call this.
- **`model-routing.ts`** — decides which model/provider to use per stage. Free-tier path uses Gemini Flash; BYOK path uses the user's selected model.
- **`registry.ts`** — the phone book of all providers (Gemini, OpenAI, Anthropic, Groq, Ollama, custom). Pure data — model names, defaults, configs.
- **`providers/`** — one file per provider. Each exports a factory that creates the right SDK client from an API key.
- **`prompts/builders.ts`** — builds stage-specific prompts. Stage 0 gets a reasoning-only prompt; later stages get the skeleton/steps output from prior stages injected as context.
- **`schemas.ts`** — Zod schemas for each stage. Stages 2 and 3 use dynamic builders (`buildStepsSchema`, `buildPopupsSchema`) that embed the actual canvas IDs from Stage 1 as enum constraints.
- **`validators/`** — one per stage. Semantic checks beyond what Zod can express (e.g., every step canvas key references a real canvas ID).
- **`assembly.ts`** — Stage 5 stitcher. Pure function, deterministic merge of all stage outputs.
- **`liveChat.ts`** — a completely separate system for the chat sidebar. Streams a tutor response using a minimal scene context block (not the full JSON). Powered by `streamText`.
