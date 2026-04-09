export interface TraceStep {
  step: string
  line: number
  vars: Record<string, unknown>
  note?: string
  highlight?: {
    array_index?: number
    array_indices?: number[]
    lookup_key?: string
    hash_insert?: Record<string, number>
    tree_node?: string
    [key: string]: unknown
  }
}

export interface TraceData {
  steps: TraceStep[]
  finalResult?: unknown
  error?: string
  truncated?: boolean
}

export type SandboxLanguage = 'python' | 'javascript'

export function isValidLanguage(value: string): value is SandboxLanguage {
  return value === 'python' || value === 'javascript'
}
