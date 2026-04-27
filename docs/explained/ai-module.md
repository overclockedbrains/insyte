# How the AI Module Works

> **Note (Phase 34 / April 2026):** The pipeline was rewritten to generate Scene JSON v2 directly (3-stage JSON pipeline) instead of ISCL. The stage names below are updated, but the overall assembly-line analogy still holds.

When a user types "How does binary search work?" and hits enter, the AI module's job is to turn that text prompt into a structured **Scene JSON** — the data that drives everything the user sees on screen (the animated array, the pointers, the step-by-step explanations, the quiz questions).

The key insight: **it does NOT ask the AI to produce one giant JSON blob.** That approach hallucinates badly. Instead, it breaks the work into focused calls to the LLM — each one asking for a very specific piece, validated before moving on.

---

## The Stages — Like an Assembly Line

Think of it like a factory assembly line building a car:

### Stage 1 — The Skeleton

**"Hey AI, produce the scene skeleton: canvas visuals, initial states, code block, and scene metadata."**

The AI outputs a partial Scene JSON with `canvas[]`, `activeText`, `hud[]`, and `code` — but no steps yet. The canvas layout and visual types are decided here.

**This is the most critical stage.** If this fails, everything stops. The AI never specifies pixel coordinates — just *what* to show. Positioning is computed later by the layout engine.

### Stage 2 — Steps

**"Given the skeleton, fill in steps[] with state updates at each step."**

The AI produces `steps[]` with `canvas`, `activeText`, `hud`, and `explanation` updates per step. Validated against the canvas visual IDs from Stage 1.

If this fails, the pipeline stops — there's no visualization without steps.

### Stage 3 — Popups + Challenges

**"Add popups and quiz challenges."**

Popups are the little callout bubbles that appear on specific visuals at specific steps. Challenges are the quiz questions.

Non-fatal — if it fails, you just get a visualization without callouts or quizzes.

### Stage 4 — Extras

**"Give me interactive controls."**

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
