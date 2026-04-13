# AI Pipeline

The AI module (`apps/web/src/ai/`) runs a 5-stage async generator that converts a user topic into a validated `Scene` JSON object.

---

## GenerationEvent Protocol

The pipeline emits these events over SSE. Clients (`useStreamScene`) consume them in order:

| Event | Payload | When |
| --- | --- | --- |
| `plan` | `title, visualCount, stepCount, layout` | After Stage 1 — client shows skeleton |
| `content` | `states, steps` | After Stages 2a + 2b |
| `annotations` | `explanation, popups` | After Stage 3 |
| `misc` | `challenges, controls` | After Stage 4 |
| `complete` | `scene: Scene` | After Stage 5 assembly passes Zod |
| `error` | `stage, message, retryable` | On any fatal stage failure |

---

## Stage Map

```mermaid
flowchart TD
    INPUT[topic · mode · ModelConfig] --> S1

    subgraph S1_BOX["Stage 1 — ISCL Generation  FATAL"]
        S1[callLLM with stage1-iscl.md prompt]
        S1_CLEAN[stripCodeFences + joinStepContinuations]
        S1_PARSE[parseISCL → ISCLParsed]
        S1 --> S1_CLEAN --> S1_PARSE
    end

    S1_PARSE -->|emit plan| CLIENT_PLAN[Client shows skeleton]

    S1_PARSE --> S2A_BOX & S2B_BOX

    subgraph S2A_BOX["Stage 2a — Initial States  NON-FATAL"]
        S2A[callLLM → JSON → validateStates]
    end

    subgraph S2B_BOX["Stage 2b — Step Params  FATAL"]
        S2B[callLLM → JSON → validateSteps]
    end

    S2A_BOX & S2B_BOX --> S3_BOX

    subgraph S3_BOX["Stage 3 — Annotations  NON-FATAL"]
        S3[callLLM → JSON → validateAnnotations]
    end

    S3_BOX --> S4_BOX

    subgraph S4_BOX["Stage 4 — Misc  NON-FATAL 1 retry"]
        S4[callLLM → JSON → validateMisc]
    end

    S4_BOX --> S5_BOX

    subgraph S5_BOX["Stage 5 — Assembly  FATAL"]
        S5[assembleScene → safeParseScene Zod]
    end

    S5_BOX --> COMPLETE[emit complete]
```

**Fatal** = pipeline aborts on failure. **Non-fatal** = falls back to empty value, pipeline continues.

Stages 2a + 2b run in parallel (`Promise.all`). Default retry budget: 2 per stage (`PIPELINE_MAX_RETRIES` env var).

---

## ISCL Pre-Processors

Two fixes applied to raw LLM output before parsing (`iscl-preprocess.ts`):

| Fix | Problem | Solution |
| --- | --- | --- |
| `stripCodeFences` | Model wraps ISCL in ` ```iscl ``` ` | Strip leading/trailing fences |
| `joinStepContinuations` | Model splits `STEP` body across multiple lines | Rejoin bare `SET …` lines to previous STEP |

---

## Live Chat

`/api/chat` is separate from generation. `buildSceneContext(scene, currentStep)` extracts a minimal context block (title, type, current explanation, visual summary) to avoid dumping the full scene JSON. Uses `streamText` for progressive token delivery.

---

## Environment

| Variable | Default | Effect |
| --- | --- | --- |
| `PIPELINE_MAX_RETRIES` | `2` | Per-stage retry budget. `0` = fail fast for debugging. |
