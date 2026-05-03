// ─── Public barrel for apps/web/src/ai/ ──────────────────────────────────────
//
// All consumers outside src/ai/ must import from this barrel, not from
// individual files. This enforces a clean module boundary.

export { generateScene } from './pipeline'
export { streamChatResponse, buildSceneContext } from './liveChat'
export { streamTraceToScene } from './traceToScene'
export { generatePreGen } from './pre-gen'

// Types
export type { GenerationEvent, GenerationConfig } from './pipeline'
export type { ModelConfig } from './client'
export type { ChatStreamResult, ChatRequestBody } from './liveChat'
export type { PreGenResult } from './pre-gen'
