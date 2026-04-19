import type { NextRequest } from 'next/server'
import type { Provider } from '@/src/ai/registry'

// ─── Client-side AI headers ──────────────────────────────────────────────────���

export interface AIHeaderSettings {
  provider: string
  model: string
  apiKeys: Record<string, string | null>
  ollamaBaseURL?: string
  customBaseURL?: string
  customApiKey?: string
  userId?: string | null
}

/**
 * Builds BYOK request headers from the current settings state.
 * Single source of truth — covers all provider variants (standard, Ollama, Custom).
 */
export function buildAIHeaders(settings: AIHeaderSettings): Record<string, string> {
  const { provider, model, apiKeys, ollamaBaseURL, customBaseURL, customApiKey, userId } = settings
  const key = apiKeys[provider]
  const headers: Record<string, string> = {}

  if (provider === 'ollama') {
    headers['x-provider'] = 'ollama'
    if (model) headers['x-model'] = model
    headers['x-base-url'] = ollamaBaseURL || 'http://localhost:11434/v1'
  } else if (provider === 'custom') {
    headers['x-provider'] = 'custom'
    if (model) headers['x-model'] = model
    if (customBaseURL) headers['x-base-url'] = customBaseURL
    if (customApiKey) headers['x-api-key'] = customApiKey
  } else if (key) {
    headers['x-api-key'] = key
    headers['x-provider'] = provider
    headers['x-model'] = model
  }

  if (userId) headers['x-user-id'] = userId

  return headers
}

// ─── Server-side BYOK header extraction ──────────────────────────────────────

export interface ByokHeaders {
  byokKey: string | null
  byokProvider: Provider | null
  byokModel: string | null
  byokBaseURL: string | null
  userId: string | null
}

/**
 * Extracts all BYOK-related headers from an API request in one place.
 * Routes use only the fields they need — unused fields are null.
 */
export function extractByokHeaders(req: NextRequest): ByokHeaders {
  return {
    byokKey: req.headers.get('x-api-key'),
    byokProvider: req.headers.get('x-provider') as Provider | null,
    byokModel: req.headers.get('x-model'),
    byokBaseURL: req.headers.get('x-base-url'),
    userId: req.headers.get('x-user-id'),
  }
}
