# Technical Architecture

This file contains four dedicated views:

## High-Level Tech Architecture (Very Simple)

```mermaid
flowchart LR
    U[User UI] --> API[Next.js API]
    API --> AI[AI Model Provider]
    AI --> SE[scene-engine JSON schema]
    SE --> STORE[State Store]
    STORE --> R[Renderer]
    R --> V[Interactive Visualization]
    API --> DB[Supabase]
    DB --> STORE
```

1. High-level tech architecture (very simple)
2. Full platform technical architecture
3. Concept prompt to visualization technical architecture
4. Scene JSON to UI visualization rendering architecture

## Full Platform Technical Architecture (Dedicated)

```mermaid
flowchart LR
    UI[Next.js UI and App Router]
    STORE[Zustand store]
    HOOKS[AI SDK hooks: useObject and useChat]
    API[API routes: generate, chat, instrument, visualize-trace]
    AI[AI orchestration: prompts, providers, scene builders]
    SCHEMA[Scene engine schemas and parser]
    RENDER[Simulation engine: layouts, renderer, primitives]
    SUPA[Supabase: scenes, query_hashes, rate_limits, user tables]
    STATIC[Static scene loader from JSON content]
    DSA[DSA pipeline hook and flow]
    SANDBOX[Sandbox manager]
    PY[Pyodide runner for Python]
    JS[Web Worker runner for JavaScript]
    LLM[LLM providers via Vercel AI SDK]

    UI --> STORE
    UI --> HOOKS
    UI --> STATIC
    STATIC --> SCHEMA
    HOOKS --> API
    API --> AI
    API --> SUPA
    AI --> SCHEMA
    STORE --> RENDER
    RENDER --> SCHEMA

    UI --> DSA
    DSA --> API
    DSA --> SANDBOX
    SANDBOX --> PY
    SANDBOX --> JS
    DSA --> RENDER

    AI --> LLM
```

## Concept Prompt to Visualization (Dedicated)

```mermaid
flowchart TB
    U[User enters concept prompt in UI] --> R[Route push to scene URL with topic]
    R --> P[Next.js App Router page loader]
    P --> C{Static or cached scene exists}

    C -->|Yes| L[Load scene JSON from static files or Supabase]
    C -->|No| S[StreamingView starts useObject stream]

    subgraph SERVER[Server Generation Path]
        G[POST /api/generate]
        RL[Supabase checks: rate limit and query dedupe]
        M[resolveModel from provider registry]
        A[generateScene via Vercel AI SDK streamText]
        Z[SceneSchema structured JSON stream]
        G --> RL --> M --> A --> Z
    end

    subgraph CLIENT[Client Assembly and Rendering]
        V[Validate and promote partial scene]
        F[Set final scene in Zustand store]
        X[SimulationLayout and SceneRenderer]
        Y[Interactive visualization with controls and playback]
        V --> F --> X --> Y
    end

    S --> G
    Z --> V
    L --> X

    A --> O[LLM provider]
    O --> O1[Gemini or BYOK OpenAI/Anthropic/Groq]

    G --> DB[Supabase persistence]
    DB --> DB1[scenes table]
    DB --> DB2[query_hashes table]
```

## Scene JSON to UI Visualization (Dedicated)

```mermaid
flowchart TB
    J[Scene JSON source: static file, Supabase cache, or AI stream] --> P[scene-engine parseScene or safeParseScene]
    P --> N[scene-engine normalizeScene and schema defaults]
    N --> S[Zustand scene slice: setScene or setDraftScene]

    S --> L[SimulationLayout chooses layout]
    L --> R[SceneRenderer Canvas area]
    R --> V[Iterate scene.visuals]
    V --> CS[computeVisualStateAtStep for currentStep]
    CS --> PR[PrimitiveRegistry resolves visual.type component]
    PR --> UI[Primitive components render visual state]

    S --> PB[Playback slice: currentStep, play pause, seek]
    PB --> CS

    S --> A[Annotations and metadata from scene JSON]
    A --> EX[ExplanationPanel and CodePanel]
    A --> PP[StepPopup and challenges]

    UI --> OUT[Final interactive visualization UI]
    EX --> OUT
    PP --> OUT
```
