// ─── AI Provider Registry ─────────────────────────────────────────────────────
//
// Single source of truth for every provider/model constant in the app.
// Both client (UI components, state) and server (API routes) import from here.
// No SDK imports — pure data only.

// ─── Types ────────────────────────────────────────────────────────────────────

export type Provider = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'ollama' | 'custom'

export interface ModelOption {
  id: string
  label: string
  badge?: string
}

export interface ProviderConfig {
  /** Display name, e.g. "Google Gemini" */
  name: string
  /** Short name used in UI labels, e.g. "Gemini" */
  shortName: string
  /** Subtitle shown in provider picker, e.g. "Google" */
  subtitle: string
  /** Tailwind text-color class for the avatar, e.g. "text-blue-400" */
  color: string
  /** Single character shown in the avatar badge */
  initials: string
  /** API key placeholder shown in the input field */
  keyPlaceholder: string
  /** Optional badge shown on the provider card (e.g. "Default · Free") */
  badge?: string
  /**
   * When true this provider is used as the server-side fallback when the
   * user has no BYOK key configured. Exactly one provider should be true.
   */
  serverDefault: boolean
  /** Default model selected when the user switches to this provider */
  defaultModel: string
  /** Pre-filled base URL (Ollama: localhost, Custom: empty) */
  defaultBaseURL?: string
  /** When true, models are fetched dynamically (e.g. Ollama /api/tags) */
  dynamicModels?: boolean
  /** Models shown in the model selector UI */
  models: ModelOption[]
  /**
   * Provider-specific options forwarded to the Vercel AI SDK's providerOptions
   * field in streamText / generateText calls.
   * Keyed by the provider name as the AI SDK expects it.
   */
  providerOptions: Record<string, unknown>
  /**
   * When true, insyte applies provider-aware tier routing when the user's
   * BYOK key is active for this provider. The model selector is hidden in
   * Settings — routing picks the right model per stage automatically.
   * When false (Ollama, Custom), the user's configured model is used for all stages.
   */
  supportsRouting: boolean
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const REGISTRY: Record<Provider, ProviderConfig> = {
  gemini: {
    name: 'Google Gemini',
    shortName: 'Gemini',
    subtitle: 'Google',
    color: 'text-blue-400',
    initials: 'G',
    keyPlaceholder: 'AIza...',
    badge: 'Default · Free',
    serverDefault: true,
    defaultModel: 'gemini-2.5-flash',
    supportsRouting: true,
    models: [
      { id: 'gemini-2.5-flash', label: 'Flash 2.5', badge: 'fast' },
      { id: 'gemini-2.5-pro', label: 'Pro 2.5' },
      { id: 'gemini-2.5-flash-lite', label: 'Flash 2.5 Lite', badge: 'cheapest' },
      { id: 'gemini-3-flash-preview', label: 'Flash 3.0', badge: 'new' },
      { id: 'gemini-3.1-pro-preview', label: 'Pro 3.1', badge: 'new' },
    ],
    providerOptions: {
      google: {
        thinkingConfig: { thinkingBudget: 2048 },
      },
    },
  },

  openai: {
    name: 'OpenAI',
    shortName: 'OpenAI',
    subtitle: 'GPT models',
    color: 'text-emerald-400',
    initials: '⊕',
    keyPlaceholder: 'sk-...',
    serverDefault: false,
    defaultModel: 'gpt-4o',
    supportsRouting: true,
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini', badge: 'fast' },
      { id: 'gpt-5.4', label: 'GPT-5.4', badge: 'new' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'o3-mini', label: 'o3-mini' },
      { id: 'o1', label: 'o1' },
    ],
    providerOptions: {},
  },

  anthropic: {
    name: 'Anthropic',
    shortName: 'Anthropic',
    subtitle: 'Claude models',
    color: 'text-orange-400',
    initials: 'A',
    keyPlaceholder: 'sk-ant-...',
    serverDefault: false,
    defaultModel: 'claude-sonnet-4-6',
    supportsRouting: true,
    models: [
      { id: 'claude-opus-4-6', label: 'Opus 4.6', badge: 'new' },
      { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
      { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5', badge: 'fast' },
    ],
    providerOptions: {},
  },

  groq: {
    name: 'Groq',
    shortName: 'Groq',
    subtitle: 'Llama / Mixtral',
    color: 'text-rose-400',
    initials: 'Q',
    keyPlaceholder: 'gsk_...',
    serverDefault: false,
    defaultModel: 'llama-3.3-70b-versatile',
    supportsRouting: true,
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 8B', badge: 'fast' },
      { id: 'openai/gpt-oss-120b', label: 'GPT OSS 120B', badge: 'new' },
    ],
    providerOptions: {},
  },

  ollama: {
    name: 'Ollama',
    shortName: 'Ollama',
    subtitle: 'Local models',
    color: 'text-teal-400',
    initials: 'O',
    keyPlaceholder: '',
    badge: 'Local',
    serverDefault: false,
    defaultModel: '',
    supportsRouting: false,
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
    defaultModel: '',
    supportsRouting: false,
    dynamicModels: false,
    models: [],
    providerOptions: {},
  },
}

// ─── Derived helpers ──────────────────────────────────────────────────────────

/** Default model per provider — consumed by settings-slice and API routes. */
export const DEFAULT_MODELS = Object.fromEntries(
  Object.entries(REGISTRY).map(([p, c]) => [p, c.defaultModel]),
) as Record<Provider, string>

/** The provider used server-side when the user has no BYOK key. */
export const SERVER_PROVIDER = (
  Object.entries(REGISTRY).find(([, c]) => c.serverDefault)?.[0] ?? 'gemini'
) as Provider

/** Ordered list for the provider selector UI. */
export const PROVIDER_LIST = Object.entries(REGISTRY).map(([id, config]) => ({
  id: id as Provider,
  ...config,
}))
