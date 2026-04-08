# API Reference

Reference for `apps/web/app/api/*` and auth callback routes.

## Common Request Headers

| Header | Optional | Meaning |
| --- | --- | --- |
| `x-api-key` | Yes | BYOK API key passed from client settings |
| `x-provider` | Yes | `gemini`, `openai`, `anthropic`, or `groq` |
| `x-model` | Yes | Provider model id |
| `x-user-id` | Yes (`/api/generate`) | Signed-in user id for generation history |

If no BYOK key is provided, server default generation path uses Gemini.

## `POST /api/generate`

Generate a full scene from prompt text (streaming).

Request body:

```json
{
  "topic": "How does a hash table work?",
  "slug": "optional-custom-slug"
}
```

Behavior:

- Free-tier path:
  - checks query dedupe via `query_hashes`
  - enforces per-IP rate limit
- BYOK path:
  - skips free-tier dedupe/rate-limit checks
- streams scene object text response (`toTextStreamResponse`)
- on completion, validates output and persists scene/query mapping asynchronously

Common status codes:

- `200` stream response or `{ "cached": true, "slug": "..." }`
- `400` invalid JSON / missing topic / topic too long
- `429` free-tier limit exceeded
- `500` generation failure

## `POST /api/instrument`

Generate instrumented code for DSA tracing.

Request body:

```json
{
  "code": "function twoSum(...) { ... }",
  "language": "javascript",
  "problemStatement": "Two Sum"
}
```

Response:

```json
{
  "instrumentedCode": "..."
}
```

Status codes: `200`, `400`, `500`.

## `POST /api/visualize-trace`

Generate scene JSON from execution trace (streaming).

Request body:

```json
{
  "trace": { "steps": [] },
  "originalCode": "...",
  "language": "python",
  "problemStatement": "Two Sum"
}
```

Response: streamed text scene payload (`toTextStreamResponse`).

Status codes: `200`, `400`, `500`.

## `POST /api/chat`

Scene-context tutor chat stream with optional patch block.

Request body:

```json
{
  "message": "Why did this step use collision chaining?",
  "sceneContext": {
    "title": "How Hash Tables Work",
    "type": "concept",
    "currentStep": 3,
    "visualSummary": []
  },
  "history": []
}
```

Response: streamed assistant text (`toTextStreamResponse`).

Status codes: `200`, `400`, `500`.

## `GET /api/rate-limit-status`

Read-only free-tier quota check for current requester IP.

Response:

```json
{
  "remaining": 12,
  "resetAt": "2026-04-08T10:00:00.000Z"
}
```

## `GET /auth/callback`

Supabase OAuth code exchange endpoint.

- accepts `?code=...&next=/target`
- exchanges code with Supabase anon client
- redirects to `next` on success, or `/?auth_error=1` on failure

