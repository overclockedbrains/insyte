# Phase 12 — Settings + BYOK

**Goal:** `/settings` page fully functional. Users can add API keys for 4 providers, select models, and all AI calls use their key instead of the server default.

**Entry criteria:** Phase 11 complete. AI generation and chat working with server Gemini key.

---

## Tasks

### 12.1 — Settings page layout
Create `apps/web/src/app/settings/page.tsx`:
- [ ] Page title: "Settings" (`font-headline`)
- [ ] Subtitle: "Customize your AI experience"
- [ ] Layout: single column, max-w-2xl centered
- [ ] Sections (glass-panel cards):
  1. **AI Provider** — provider selection + model selection
  2. **API Keys** — one input per provider
  3. **Preferences** — animation speed default (future use)
  4. **About** — version, GitHub link, open source note
- [ ] `metadata`: title "Settings — insyte"

### 12.2 — Provider + model selector UI
Create `apps/web/src/components/settings/ProviderSelector.tsx`:
- [ ] 4 provider cards in a 2×2 grid:
  - Gemini (Google) — with Google logo
  - OpenAI — with OpenAI logo
  - Anthropic — with Anthropic logo
  - Groq — with Groq logo
- [ ] Active provider: `border-primary/60 bg-surface-container-high`
- [ ] Inactive: `border-outline-variant/20 bg-surface-container-low`
- [ ] "Default (Free)" badge on Gemini card
- [ ] Click: `settings-store.setProvider(provider)`

Create `apps/web/src/components/settings/ModelSelector.tsx`:
- [ ] Shows available models for the currently selected provider
- [ ] Model options per provider:
  - Gemini: `gemini-2.0-flash` (free), `gemini-1.5-pro`
  - OpenAI: `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`
  - Anthropic: `claude-3-5-haiku-20241022`, `claude-3-5-sonnet-20241022`, `claude-opus-4-6`
  - Groq: `llama-3.1-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768`
- [ ] Pill button group: active = `bg-secondary text-on-secondary`
- [ ] `settings-store.setModel(model)` on select

### 12.3 — API key inputs
Create `apps/web/src/components/settings/ApiKeyInput.tsx`:
- [ ] Props: `provider: Provider`, `hasKey: boolean`
- [ ] Password input (`type="password"`) for key entry
- [ ] Show/hide toggle button (eye icon)
- [ ] Placeholder: `"sk-..." | "AIza..." | "claude-..." | "gsk_..."`
- [ ] If `hasKey: true`: show "✓ Key saved" badge + "Clear" button instead of input
- [ ] Save button: `settings-store.setApiKey(provider, key)`
- [ ] Clear button: `settings-store.clearApiKey(provider)` + clears input
- [ ] Validation: minimum length check before saving (e.g. 20+ chars)
- [ ] Security note: `"Your key is stored locally in your browser. It is never sent to our servers."`

### 12.4 — Active provider indicator
Create `apps/web/src/components/settings/ActiveProviderStatus.tsx`:
- [ ] Shows which provider is currently active
- [ ] If BYOK key set for selected provider: "Using your [Provider] key · Unlimited requests"
- [ ] If no BYOK key, using Gemini default: "Using insyte's Gemini key · [N] requests remaining today"
  - Fetches remaining count from a simple `/api/rate-limit-status` endpoint (returns remaining count for current IP)
- [ ] Live green dot when active, grey dot when no key configured

### 12.5 — `/api/rate-limit-status` endpoint
Create `apps/web/src/app/api/rate-limit-status/route.ts`:
- [ ] GET handler
- [ ] Returns `{ remaining: number, resetAt: string }` for current IP
- [ ] Uses same `checkRateLimit` logic (read-only, no increment)

### 12.6 — Wire BYOK into AI client
Update `apps/web/src/ai/providers/index.ts`:
- [ ] `getAIProvider(settings: SettingsState): { model: LanguageModel }`
- [ ] Logic:
  ```typescript
  const { provider, model, apiKeys } = settings
  const key = apiKeys[provider]
  
  if (provider === 'gemini') {
    // BYOK key or server key (server key only available server-side)
    return getGeminiProvider(key || undefined)
  }
  if (provider === 'openai' && key) return getOpenAIProvider(key)
  if (provider === 'anthropic' && key) return getAnthropicProvider(key)
  if (provider === 'groq' && key) return getGroqProvider(key)
  
  // Fallback: Gemini Flash server default
  return getGeminiProvider()
  ```

**BYOK flow (browser-direct for non-Gemini):**
- [ ] When user has BYOK key for OpenAI/Anthropic/Groq:
  - AI generation runs **client-side** directly (no server route)
  - `streamObject` called from browser with user's key
  - Scene JSON generated client-side, then `saveScene()` called to cache it
- [ ] For Gemini: can use server route (key stays server-side) or browser-direct with user's key

### 12.7 — "Clear all keys" button
In settings page:
- [ ] `"Clear All Keys"` button at bottom of API Keys section
- [ ] Confirmation dialog: "Are you sure? This will remove all saved API keys."
- [ ] On confirm: `settings-store.clearAllKeys()` (call `clearApiKey` for each provider)

### 12.8 — Navbar indicator for active provider
In `Navbar.tsx`:
- [ ] Small indicator dot next to Settings icon: 
  - Green = BYOK key active
  - Grey = using default free tier
- [ ] Tooltip on hover: "Using [provider] key" or "Using free tier"

---

## Exit Criteria
- [ ] `/settings` page renders with all 4 provider cards, model selector, and API key inputs
- [ ] Pasting an OpenAI key → "✓ Key saved" badge appears
- [ ] Selecting OpenAI provider + saved key → AI generation uses that key (verify in Network tab: no server call for key usage)
- [ ] Clear button removes key from localStorage and resets to server default
- [ ] `settings-store` persists across page refreshes (localStorage)
- [ ] Active provider status shows correct remaining count when using free tier
- [ ] Rate limit status endpoint returns correct remaining count
- [ ] BYOK user: no rate limit messages (unlimited)

---

## Key Notes
- **Keys are NEVER logged** — the key input should have `autocomplete="off"`. Server routes that receive an `X-API-Key` header should never log headers.
- The `show/hide toggle` on API key input is important UX — developers are used to password managers autofilling API keys
- For the BYOK client-direct approach: Vercel AI SDK works client-side when the key is passed directly. No special server setup needed.
- The "Security note" about local storage is important for user trust — make it prominent
- Test that clearing a key actually removes it from localStorage (not just from React state)
