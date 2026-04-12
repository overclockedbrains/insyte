import type { SceneType, SceneLayout, VisualType, LayoutHint, SlotPosition } from '../types'

export interface ISCLParseResult {
  ok: boolean
  error?: { line: number; col?: number; message: string }

  // Only present when ok === true
  parsed?: ISCLParsed
}

export interface ISCLParsed {
  // Top-level scene metadata
  title: string
  type: SceneType
  layout: SceneLayout

  // Ground truth for all downstream stages
  visualIds: Set<string>
  visualDecls: ISCLVisualDecl[]

  // Step count — injected into Stage 2b and Stage 3 prompts as hard constraint
  stepCount: number

  // Raw step data (initialState filled in by Stage 2a)
  steps: ISCLStep[]

  // Annotation data (validated against visualIds + stepCount at parse time)
  explanation: ISCLExplanationEntry[]
  popups: ISCLPopup[]
  challenges: ISCLChallenge[]
  controls: ISCLControl[]
}

export interface ISCLVisualDecl {
  id: string
  type: VisualType
  layoutHint?: LayoutHint
  slot?: SlotPosition
}

export interface ISCLStep {
  index: number
  isInit: boolean
  sets: ISCLSet[]
}

export interface ISCLSet {
  visualId: string     // validated against visualIds
  field: string
  rawValue: string     // unparsed — Stage 2b will parse into typed params
}

export interface ISCLExplanationEntry {
  stepIndex: number    // validated: < stepCount
  heading: string
  body: string
}

export interface ISCLPopup {
  attachId: string     // validated: in visualIds
  showAt: number       // validated: < stepCount
  hideAt?: number      // validated: <= stepCount
  text: string
  style: 'info' | 'success' | 'warning' | 'insight'
}

export interface ISCLChallenge {
  type: 'predict' | 'break-it' | 'optimize' | 'scenario'
  text: string
}

export interface ISCLControl {
  controlType: 'slider' | 'toggle' | 'button'
  id: string
  label: string
  config: Record<string, unknown>
}
