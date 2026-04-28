# AI Pipeline

The AI module (`apps/web/src/ai/`) runs a 6-stage async generator that converts a user topic into a validated `Scene` JSON v2 object. Stages 0–2 are sequential and fatal; Stages 3–4 run in parallel and are non-fatal; Stage 5 is deterministic assembly (no LLM call).

---

## GenerationEvent Protocol

The pipeline emits these events over SSE. Clients (`useStreamScene`) consume them in order:

| Event | Payload | When |
| --- | --- | --- |
| `reasoning` | streamed text chunks | During Stage 0 — free reasoning |
| `plan` | `SceneSkeletonParsed` | After Stage 1 — client shows skeleton |
| `content` | `StepsParsed` | After Stage 2 — steps + initial states |
| `annotations` | `PopupsParsed` | After Stage 3 (non-fatal) |
| `misc` | `MiscParsed` | After Stage 4 (non-fatal) |
| `complete` | `scene: Scene` | After Stage 5 assembly passes `safeParseScene()` |
| `error` | `stage, message, retryable` | On any fatal stage failure |

---

## Stage Map

```mermaid
flowchart TD
    INPUT[topic · mode · ModelConfig] --> S0

    subgraph S0_BOX["Stage 0 — Free Reasoning  FATAL"]
        S0[streamText — no schema, no examples\nReasoning chunks stream to client live]
    end

    S0 -->|emit reasoning chunks| S1_BOX

    subgraph S1_BOX["Stage 1 — Scene Skeleton  FATAL"]
        S1[generateObject → SceneSkeletonSchema Zod\ncanvas IDs · visual types · initial states · metadata]
    end

    S1_BOX -->|emit plan| CLIENT_PLAN[Client shows skeleton]

    S1_BOX --> S2_BOX

    subgraph S2_BOX["Stage 2 — Steps + Initial States  FATAL"]
        S2[generateJson → buildStepsSchema + validateSteps\nstep mutations · activeText · hud · explanations]
    end

    S2_BOX -->|emit content| S34

    S34["Stages 3 + 4 — run in parallel"]

    subgraph S3_BOX["Stage 3 — Popups  NON-FATAL"]
        S3[generateObject → buildPopupsSchema + validatePopups\nattachTo enum-constrained to canvas IDs]
    end

    subgraph S4_BOX["Stage 4 — Misc  NON-FATAL"]
        S4[generateObject → MiscSchema\nchallenges · controls · extras]
    end

    S34 --> S3_BOX & S4_BOX

    S3_BOX & S4_BOX --> S5_BOX

    subgraph S5_BOX["Stage 5 — Assembly  FATAL  no LLM"]
        S5[assembleScene → safeParseScene Zod + superRefine\ncross-field semantic validation]
    end

    S5_BOX --> COMPLETE[emit complete]
```

**Fatal** = pipeline aborts on failure (with retry budget). **Non-fatal** = falls back to empty value, pipeline continues.

Stage 2 is the heaviest — it co-generates steps AND validates all canvas key references against Stage 1 IDs. Default retry budget: 2 per stage (`PIPELINE_MAX_RETRIES` env var).

---

## Schema Flow

| Stage | Schema used | Anti-hallucination |
| --- | --- | --- |
| 0 (reasoning) | none — `streamText` free form | — |
| 1 (skeleton) | `SceneSkeletonSchema` | canvas IDs constrained to regex |
| 2 (steps) | `buildStepsSchema()` + `validateSteps()` | canvas/hud keys checked against skeleton IDs |
| 3 (popups) | `buildPopupsSchema(canvasIds)` | `attachTo` enum-constrained to canvas IDs |
| 4 (misc) | `MiscSchema` | static schema |
| 5 (assembly) | `safeParseScene()` = `buildSceneSchema()` + `.superRefine()` | cross-field: popup.attachTo + step.canvas keys vs canvas[] |

---

## Model Routing

`model-routing.ts` selects which model/provider to use per stage:

- **Free-tier path:** Gemini Flash (server-side `GEMINI_API_KEY`)
- **BYOK path:** user's selected provider + model, forwarded via `x-provider` / `x-model` / `x-api-key` headers
- Stage 4 gets 1 retry (instead of 2) to conserve tokens on low-priority extras

---

## Live Chat

`/api/chat` is a separate system from generation. `buildChatContextBlock(ctx)` extracts a minimal context block (title, type, current explanation, visual summary). Patches use Scene v2 step format (`canvas`, `activeText`, `hud`). Uses `streamText` for progressive token delivery.

---

## Environment

| Variable | Default | Effect |
| --- | --- | --- |
| `PIPELINE_MAX_RETRIES` | `2` | Per-stage retry budget. `0` = fail fast for debugging. |
| `GEMINI_API_KEY` | — | Server-side fallback key for free-tier generation. |
