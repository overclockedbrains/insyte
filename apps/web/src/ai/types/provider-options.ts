type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue }

/** Shape the Vercel AI SDK expects for providerOptions — matches SharedV3ProviderOptions. */
export type ProviderOptions = Record<string, Record<string, JSONValue>>

export interface AnthropicProviderOptions {
  anthropic?: {
    thinking?: { type: 'enabled'; budget_tokens: number }
  }
}

export interface GoogleProviderOptions {
  google?: {
    thinkingConfig?: { thinkingBudget: number }
  }
}

export interface OpenAIProviderOptions {
  openai?: {
    reasoningEffort?: 'low' | 'medium' | 'high'
  }
}
