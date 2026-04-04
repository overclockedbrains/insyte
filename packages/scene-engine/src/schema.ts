import { z } from 'zod'

// ─── Enums ────────────────────────────────────────────────────────────────────

const SceneTypeSchema = z.enum(['concept', 'dsa-trace', 'lld', 'hld'])
const LayoutTypeSchema = z.enum([
  'canvas-only',
  'code-left-canvas-right',
  'text-left-canvas-right',
])
const VisualTypeSchema = z.enum([
  'array',
  'hashmap',
  'linked-list',
  'tree',
  'graph',
  'stack',
  'queue',
  'dp-table',
  'recursion-tree',
  'system-diagram',
  'text-badge',
  'counter',
])
const CodeLanguageSchema = z.enum(['python', 'javascript'])

// ─── Visual Schemas ───────────────────────────────────────────────────────────

const PositionSchema = z.object({ x: z.number(), y: z.number() })

const HighlightDefaultSchema = z.enum(['default', 'active', 'found', 'comparing', 'done'])

const ArrayCellSchema = z.object({
  value: z.union([z.string(), z.number(), z.null()]),
  highlight: z
    .enum(['default', 'active', 'found', 'comparing', 'done'])
    .optional(),
})

const ArrayVisualSchema = z.object({
  id: z.string(),
  type: z.literal('array'),
  label: z.string().optional(),
  position: PositionSchema.optional(),
  cells: z.array(ArrayCellSchema),
  pointers: z
    .array(z.object({ index: z.number(), label: z.string() }))
    .optional(),
})

const HashMapEntrySchema = z.object({
  key: z.string(),
  value: z.union([z.string(), z.number()]),
  highlight: z
    .enum(['default', 'active', 'collision', 'found'])
    .optional(),
})

const HashMapVisualSchema = z.object({
  id: z.string(),
  type: z.literal('hashmap'),
  label: z.string().optional(),
  position: PositionSchema.optional(),
  buckets: z.array(z.array(HashMapEntrySchema)),
  capacity: z.number().optional(),
})

const LinkedListNodeSchema = z.object({
  id: z.string(),
  value: z.union([z.string(), z.number()]),
  highlight: z.enum(['default', 'active', 'found']).optional(),
})

const LinkedListVisualSchema = z.object({
  id: z.string(),
  type: z.literal('linked-list'),
  label: z.string().optional(),
  position: PositionSchema.optional(),
  nodes: z.array(LinkedListNodeSchema),
  headPointer: z.string().optional(),
})

const TreeNodeSchema = z.object({
  id: z.string(),
  value: z.union([z.string(), z.number()]),
  leftId: z.string().optional(),
  rightId: z.string().optional(),
  highlight: z.enum(['default', 'active', 'visited', 'found']).optional(),
})

const TreeVisualSchema = z.object({
  id: z.string(),
  type: z.literal('tree'),
  label: z.string().optional(),
  position: PositionSchema.optional(),
  nodes: z.array(TreeNodeSchema),
  rootId: z.string().optional(),
})

const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  highlight: z.enum(['default', 'active', 'visited', 'found']).optional(),
})

const GraphEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  weight: z.number().optional(),
  directed: z.boolean().optional(),
  highlight: z.enum(['default', 'active', 'traversed']).optional(),
})

const GraphVisualSchema = z.object({
  id: z.string(),
  type: z.literal('graph'),
  label: z.string().optional(),
  position: PositionSchema.optional(),
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  directed: z.boolean().optional(),
})

const StackItemSchema = z.object({
  value: z.union([z.string(), z.number()]),
  highlight: z.enum(['default', 'active', 'popped']).optional(),
})

const StackVisualSchema = z.object({
  id: z.string(),
  type: z.literal('stack'),
  label: z.string().optional(),
  position: PositionSchema.optional(),
  items: z.array(StackItemSchema),
})

const QueueItemSchema = z.object({
  value: z.union([z.string(), z.number()]),
  highlight: z.enum(['default', 'active', 'dequeued']).optional(),
})

const QueueVisualSchema = z.object({
  id: z.string(),
  type: z.literal('queue'),
  label: z.string().optional(),
  position: PositionSchema.optional(),
  items: z.array(QueueItemSchema),
})

const DPTableCellSchema = z.object({
  value: z.union([z.string(), z.number(), z.null()]),
  highlight: z
    .enum(['default', 'active', 'computed', 'used'])
    .optional(),
})

const DPTableVisualSchema = z.object({
  id: z.string(),
  type: z.literal('dp-table'),
  label: z.string().optional(),
  position: PositionSchema.optional(),
  rows: z.array(z.array(DPTableCellSchema)),
  rowLabels: z.array(z.string()).optional(),
  colLabels: z.array(z.string()).optional(),
})

const RecursionTreeNodeSchema = z.object({
  id: z.string(),
  call: z.string(),
  returnValue: z.union([z.string(), z.number()]).optional(),
  highlight: z
    .enum(['default', 'active', 'memoized', 'resolved'])
    .optional(),
  children: z.array(z.string()).optional(),
})

const RecursionTreeVisualSchema = z.object({
  id: z.string(),
  type: z.literal('recursion-tree'),
  label: z.string().optional(),
  position: PositionSchema.optional(),
  nodes: z.array(RecursionTreeNodeSchema),
  rootId: z.string().optional(),
})

const SystemComponentSchema = z.object({
  id: z.string(),
  label: z.string(),
  sublabel: z.string().optional(),
  x: z.number(),
  y: z.number(),
  highlight: z
    .enum(['default', 'active', 'error', 'processing'])
    .optional(),
})

const SystemFlowSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  highlight: z.enum(['default', 'active', 'error']).optional(),
})

const SystemDiagramVisualSchema = z.object({
  id: z.string(),
  type: z.literal('system-diagram'),
  label: z.string().optional(),
  position: PositionSchema.optional(),
  components: z.array(SystemComponentSchema),
  flows: z.array(SystemFlowSchema),
})

const TextBadgeVisualSchema = z.object({
  id: z.string(),
  type: z.literal('text-badge'),
  label: z.string().optional(),
  position: PositionSchema.optional(),
  text: z.string(),
  color: z
    .enum(['default', 'primary', 'secondary', 'tertiary', 'error'])
    .optional(),
})

const CounterVisualSchema = z.object({
  id: z.string(),
  type: z.literal('counter'),
  label: z.string().optional(),
  position: PositionSchema.optional(),
  value: z.number(),
  color: z
    .enum(['default', 'primary', 'secondary', 'tertiary', 'error'])
    .optional(),
})

export const VisualSchema = z.discriminatedUnion('type', [
  ArrayVisualSchema,
  HashMapVisualSchema,
  LinkedListVisualSchema,
  TreeVisualSchema,
  GraphVisualSchema,
  StackVisualSchema,
  QueueVisualSchema,
  DPTableVisualSchema,
  RecursionTreeVisualSchema,
  SystemDiagramVisualSchema,
  TextBadgeVisualSchema,
  CounterVisualSchema,
])

// ─── Step Schema ──────────────────────────────────────────────────────────────

export const VisualPatchSchema = z.object({
  visualId: z.string(),
  patch: z.record(z.unknown()),
})

export const StepSchema = z.object({
  index: z.number().int().nonnegative(),
  label: z.string(),
  description: z.string().optional(),
  patches: z.array(VisualPatchSchema),
  explanationId: z.string().optional(),
  codeLine: z.number().int().nonnegative().optional(),
})

// ─── Control Schemas ──────────────────────────────────────────────────────────

export const SliderControlSchema = z.object({
  id: z.string(),
  type: z.literal('slider'),
  label: z.string(),
  min: z.number(),
  max: z.number(),
  step: z.number(),
  defaultValue: z.number(),
})

export const ToggleControlSchema = z.object({
  id: z.string(),
  type: z.literal('toggle'),
  label: z.string(),
  defaultValue: z.boolean(),
})

export const ButtonControlSchema = z.object({
  id: z.string(),
  type: z.literal('button'),
  label: z.string(),
  action: z.string(),
})

export const SelectControlSchema = z.object({
  id: z.string(),
  type: z.literal('select'),
  label: z.string(),
  options: z.array(z.object({ value: z.string(), label: z.string() })),
  defaultValue: z.string(),
})

export const ControlSchema = z.discriminatedUnion('type', [
  SliderControlSchema,
  ToggleControlSchema,
  ButtonControlSchema,
  SelectControlSchema,
])

// ─── Explanation Schema ───────────────────────────────────────────────────────

export const ExplanationSectionSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  body: z.string(),
  stepRange: z.tuple([z.number(), z.number()]).optional(),
})

// ─── Popup Schema ─────────────────────────────────────────────────────────────

export const PopupSchema = z.object({
  id: z.string(),
  targetVisualId: z.string(),
  text: z.string(),
  stepRange: z.tuple([z.number(), z.number()]),
  position: z.enum(['top', 'bottom', 'left', 'right']).optional(),
})

// ─── Condition Schema ─────────────────────────────────────────────────────────

export const ConditionSchema = z.object({
  id: z.string(),
  expression: z.string(),
  trueLabel: z.string(),
  falseLabel: z.string(),
})

// ─── Challenge Schema ─────────────────────────────────────────────────────────

export const ChallengeSchema = z.object({
  id: z.string(),
  type: z.enum(['trace', 'predict', 'modify', 'quiz']),
  question: z.string(),
  hint: z.string().optional(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.union([z.string(), z.number()]).optional(),
})

// ─── Code Schema ─────────────────────────────────────────────────────────────

export const SceneCodeSchema = z.object({
  language: CodeLanguageSchema,
  source: z.string(),
  highlightByStep: z.array(z.number()),
})

// ─── Scene Schema (root) ──────────────────────────────────────────────────────

export const SceneSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: SceneTypeSchema,
  layout: LayoutTypeSchema,
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  code: SceneCodeSchema.optional(),
  visuals: z.array(VisualSchema),
  steps: z.array(StepSchema),
  controls: z.array(ControlSchema),
  explanation: z.array(ExplanationSectionSchema),
  popups: z.array(PopupSchema),
  challenges: z.array(ChallengeSchema).optional(),
  conditions: z.array(ConditionSchema).optional(),
  complexity: z
    .object({ time: z.string().optional(), space: z.string().optional() })
    .optional(),
})

export type SceneSchemaType = z.infer<typeof SceneSchema>
