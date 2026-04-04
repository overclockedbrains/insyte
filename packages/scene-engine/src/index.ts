// Public API of @insyte/scene-engine
// Pure TypeScript + Zod — zero React dependency

// Types
export type {
  Scene,
  SceneType,
  LayoutType,
  VisualType,
  CodeLanguage,
  Visual,
  VisualBase,
  ArrayVisual,
  ArrayCell,
  HashMapVisual,
  HashMapEntry,
  LinkedListVisual,
  LinkedListNode,
  TreeVisual,
  TreeNode,
  GraphVisual,
  GraphNode,
  GraphEdge,
  StackVisual,
  QueueVisual,
  DPTableVisual,
  DPTableCell,
  RecursionTreeVisual,
  RecursionTreeNode,
  SystemDiagramVisual,
  SystemComponent,
  SystemFlow,
  TextBadgeVisual,
  CounterVisual,
  Step,
  VisualPatch,
  Control,
  SliderControl,
  ToggleControl,
  ButtonControl,
  SelectControl,
  ControlType,
  ExplanationSection,
  Popup,
  Challenge,
  ChallengeType,
  Condition,
  SceneCode,
} from './types'

// Zod Schemas
export {
  SceneSchema,
  VisualSchema,
  StepSchema,
  ControlSchema,
  ExplanationSectionSchema,
  PopupSchema,
  ChallengeSchema,
  ConditionSchema,
} from './schema'

// Parser
export { parseScene, tryParseScene, SceneParseError } from './parser'
