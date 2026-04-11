# Phase 17 — Local & Custom LLM Support

**Goal:** Add Ollama (local) and custom OpenAI-compatible endpoint support with minimal changes — no pipeline changes, no streaming changes, no architecture changes. Plug new providers into the existing `resolveModel()` + `REGISTRY` system that already handles Gemini, OpenAI, Anthropic, and Groq.

**Status:** Planned as of April 12, 2026.

---

## Why It's Minimal

The existing provider system is already perfectly structured for this:

```
route.ts → resolveModel(provider, model, apiKey) → LanguageModel → generateScene()
```

`generateScene()` already takes any `LanguageModel` — it is completely unaware of where the model came from. Adding Ollama is just teaching `resolveModel()` about two new provider types. **Zero changes to `generateScene.ts`, zero changes to the streaming pipeline.**

---

## What Actually Changes

**7 files total. 5 edits to existing files, 2 new files.**

### 1. `src/ai/registry.ts` — Edit

Add `'ollama' | 'custom'` to the `Provider` union type.

Add two optional fields to `ProviderConfig` (backward-compatible — existing providers don't set them):
```typescript
defaultBaseURL?: string   // pre-filled for Ollama, empty for Custom
dynamicModels?: boolean   // true for Ollama (fetches /api/tags), false otherwise
```

Add two new entries to `REGISTRY`:
```typescript
ollama: {
  name: 'Ollama',
  shortName: 'Ollama',
  subtitle: 'Local models',
  color: 'text-teal-400',
  initials: 'O',
  keyPlaceholder: '',            // no API key
  badge: 'Local',
  serverDefault: false,
  defaultModel: '',              // populated dynamically
  defaultBaseURL: 'http://localhost:11434/v1',
  dynamicModels: true,
  models: [],
  providerOptions: {},
},

custom: {
  name: 'Custom Endpoint',
  shortName: 'Custom',
  subtitle: 'Any OpenAI-compatible API',
  color: 'text-purple-400',
  initials: '⚙',
  keyPlaceholder: 'optional',
  badge: 'Custom',
  serverDefault: false,
  defaultModel: '',              // user-supplied
  defaultBaseURL: undefined,
  dynamicModels: false,
  models: [],
  providerOptions: {},
},
```

---

### 2. `src/ai/providers/ollama.ts` — New file (~15 lines)

```typescript
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'

export function getOllamaProvider(
  baseURL: string,
  model: string,
  customFetch?: typeof fetch,
): LanguageModel {
  const client = createOpenAI({
    baseURL,
    apiKey: 'ollama',          // Ollama requires a non-empty key; value is ignored
    compatibility: 'compatible',
    fetch: customFetch,
  })
  return client(model)
}
```

`@ai-sdk/openai` is already installed — no new packages.

---

### 3. `src/ai/providers/index.ts` — Edit

Accept an optional `baseURL` parameter and add two cases to the switch:

```typescript
export function resolveModel(
  provider: string,
  model: string | null | undefined,
  apiKey: string | null | undefined,
  customFetch?: typeof fetch,
  baseURL?: string,              // ← new optional param
): LanguageModel {
  // ... existing logic ...

  if (apiKey || baseURL) {
    switch (resolvedProvider) {
      // ... existing cases (openai, anthropic, groq, gemini) ...
      case 'ollama':
        return getOllamaProvider(
          baseURL ?? 'http://localhost:11434/v1',
          resolvedModel,
          customFetch,
        )
      case 'custom':
        return getOllamaProvider(   // same factory — custom is just Ollama with a user URL
          baseURL ?? '',
          resolvedModel,
          customFetch,
        )
    }
  }

  // Core path: unchanged
  return getGeminiProvider(undefined, REGISTRY[SERVER_PROVIDER].defaultModel, customFetch)
}
```

---

### 4. `app/api/generate/route.ts` — Edit (2 lines)

Read the new `x-base-url` header and pass it to `resolveModel()`:

```typescript
// Add this with the existing BYOK header reads:
const byokBaseURL = req.headers.get('x-base-url')

// Change this one line:
const model = resolveModel(provider, byokModel, byokKey, longRunningFetch, byokBaseURL)
```

That's literally 2 lines added to the route. Everything else — rate limiting, deduplication, scene saving, streaming — is completely untouched.

**Rate limit note:** Ollama users have no `byokKey`, so the free-tier rate limit applies server-side. In practice this doesn't matter: on Vercel, calls to `localhost:11434` will time out (Vercel can't reach the user's machine), so local Ollama only works in local dev (`pnpm dev`) where rate limiting is irrelevant. For Ollama exposed at a public URL, the `byokKey` can be set to a dummy value in the client to bypass rate limiting — or we add `byokBaseURL` to the bypass condition.

---

### 5. `app/api/providers/ollama-models/route.ts` — New file (~25 lines)

Proxies Ollama's model list server-side (avoids CORS when calling from browser settings UI):

```typescript
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const base = searchParams.get('baseURL') ?? 'http://localhost:11434'

  try {
    const res = await fetch(`${base}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return NextResponse.json({ models: [] })
    const data = await res.json()
    const models = (data.models ?? []).map((m: { name: string }) => ({
      id: m.name,
      label: m.name,
    }))
    return NextResponse.json({ models })
  } catch {
    return NextResponse.json({ models: [], error: 'unreachable' })
  }
}
```

---

### 6. Settings store — Edit

Add four new fields alongside the existing BYOK fields:

```typescript
ollamaBaseURL: string        // default: 'http://localhost:11434/v1'
customBaseURL: string        // default: ''
customApiKey: string         // default: ''
customModelId: string        // default: ''
```

---

### 7. Settings UI — Edit

Add a "Local & Custom" section to the existing Settings page. For Ollama: base URL input, refresh button that calls `/api/providers/ollama-models`, model picker from results, health indicator dot. For Custom: base URL + API key + model ID inputs.

---

## What Is NOT Changed

| File | Status |
|---|---|
| `src/ai/generateScene.ts` | Untouched |
| `app/api/chat/route.ts` | Untouched (can add `x-base-url` support later if chat needs it) |
| `app/api/generate/route.ts` | 2 lines added |
| Streaming pipeline | Untouched |
| Scene engine / Zod schemas | Untouched |
| All existing providers (Gemini, OpenAI, Anthropic, Groq) | Untouched |

---

## Local Dev vs Production

| Scenario | Works? | Notes |
|---|---|---|
| `pnpm dev` + Ollama at `localhost:11434` | ✅ | Next.js server is on the user's machine |
| Production + Ollama at `localhost:11434` | ❌ | Vercel can't reach user's localhost |
| Production + Ollama on a public URL | ✅ | Enter as Custom with the public URL |
| Production + Ollama via ngrok/Cloudflare Tunnel | ✅ | Enter public tunnel URL as Custom |

The settings UI includes a note: "Local Ollama (localhost) only works when running Insyte on your own machine. For remote access, expose Ollama at a public URL and use Custom Endpoint."

---

## No New Dependencies

`@ai-sdk/openai` is already installed. `createOpenAI({ baseURL })` is its documented pattern for custom endpoints. No `npm install` needed.

---

## Deliverables

1. `Provider` type: `'gemini' | 'openai' | 'anthropic' | 'groq' | 'ollama' | 'custom'`
2. `src/ai/providers/ollama.ts` — new provider factory
3. `resolveModel()` — two new switch cases + `baseURL` param
4. `app/api/generate/route.ts` — 2 lines: read `x-base-url`, pass to `resolveModel()`
5. `app/api/providers/ollama-models/route.ts` — model discovery proxy
6. Settings store — 4 new fields
7. Settings UI — Local & Custom section
