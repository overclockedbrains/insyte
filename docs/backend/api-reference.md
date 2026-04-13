# API Reference

Reference for all server routes in `apps/web/app/api/`.
Updated April 2026 (R2 / Phase 27).

---

## Common Request Headers

| Header | Optional | Meaning |
| --- | --- | --- |
| `x-provider` | Yes | Provider ID: `gemini`, `openai`, `anthropic`, `groq`, `ollama`, `custom` |
| `x-model` | Yes | Provider model ID (e.g. `gemini-2.5-flash`, `gpt-4o`) |
| `x-api-key` | Yes | BYOK API key (never logged server-side) |
| `x-base-url` | Yes | Required for `ollama` and `custom` providers |
| `x-user-id` | Yes | Signed-in user ID, passed to `/api/generate` for history tracking |

If no BYOK key is provided, the server-side default path uses Gemini Flash (free tier).

---

## `POST /api/generate`

Runs the 5-stage AI pipeline for concept / LLD / HLD scene generation. Response is an **SSE stream of `GenerationEvent` objects**.

### Request body

```json
{
  "topic": "How does a hash table work?",
  "mode": "concept",
  "slug": "optional-custom-slug"
}
```

- `mode` — optional `SceneType` hint. If omitted the AI picks the type in Stage 1.
- `slug` — optional. If omitted, a slug is derived from the topic.

### Response stream

Each event is a JSON line prefixed `data: ` (SSE format):

```
data: {"type":"plan","title":"How Hash Tables Work","visualCount":2,"stepCount":8,"layout":"text-left-canvas-right"}
data: {"type":"content","states":{...},"steps":[...]}
data: {"type":"annotations","explanation":[...],"popups":[...]}
data: {"type":"misc","challenges":[...],"controls":[...]}
data: {"type":"complete","scene":{...}}
```

Or on failure:

```
data: {"type":"error","stage":1,"message":"...","retryable":true}
```

### Behavior

- **Free-tier path:** checks query dedupe via `query_hashes` + per-IP rate limit via `rate_limits`.
- **BYOK path:** skips dedupe/rate-limit. Uses user's key + selected provider.
- On `complete` event, scene and query hash are asynchronously persisted to Supabase.

### Status codes

| Code | Meaning |
| --- | --- |
| `200` | SSE stream started |
| `400` | Missing topic / topic too long / invalid JSON |
| `429` | Free-tier limit exceeded |
| `500` | Pipeline failed on all retries |

---

## `POST /api/instrument`

AI-assisted code instrumentation for DSA trace mode.

### Request body

```json
{
  "code": "def two_sum(nums, target): ...",
  "language": "python",
  "problemStatement": "Two Sum"
}
```

### Response

```json
{
  "instrumentedCode": "def two_sum(nums, target):\n  __trace__ = []\n  ..."
}
```

Status codes: `200`, `400`, `500`.

---

## `POST /api/visualize-trace`

Converts a sandbox execution trace into a streaming `Scene` JSON.

### Request body

```json
{
  "trace": { "steps": [...] },
  "originalCode": "...",
  "language": "python",
  "problemStatement": "Two Sum"
}
```

Response: streamed text scene payload (same SSE format as `/api/generate`).

Status codes: `200`, `400`, `500`.

---

## `POST /api/chat`

Scene-context tutor chat stream. Uses `streamText` with a 1 024-token output budget.

### Request body

```json
{
  "message": "Why did this step use collision chaining?",
  "sceneContext": {
    "title": "How Hash Tables Work",
    "type": "concept",
    "currentStep": 3,
    "currentExplanation": "Collision resolved by chaining...",
    "visualSummary": [{ "id": "table", "type": "hashmap", "label": "Hash Table" }]
  },
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

Response: streamed assistant text.

Status codes: `200`, `400`, `500`.

---

## `GET /api/rate-limit-status`

Read-only free-tier quota check for the requester's hashed IP.

### Response

```json
{
  "remaining": 7,
  "resetAt": "2026-04-13T11:00:00.000Z"
}
```

---

## `GET /api/providers/ollama-models`

Server-side proxy for `GET {ollamaBaseURL}/api/tags`. Avoids CORS when the UI fetches local Ollama model names.

### Query params

| Param | Required | Description |
| --- | --- | --- |
| `baseUrl` | Yes | Ollama server base URL (default `http://localhost:11434`) |

### Response

```json
{
  "models": [
    { "id": "llama3.2:latest", "label": "llama3.2:latest" }
  ]
}
```

---

## `GET /auth/callback`

Supabase OAuth code exchange.

- Accepts `?code=...&next=/target`
- Exchanges code with Supabase anon client
- Redirects to `next` on success, or `/?auth_error=1` on failure
