import React from 'react'

import { ArrayViz } from './ArrayViz'
import { HashMapViz } from './HashMapViz'
import { LinkedListViz } from './LinkedListViz'
import { TreeViz } from './TreeViz'
import { GraphViz } from './GraphViz'
import { StackViz } from './StackViz'
import { QueueViz } from './QueueViz'
import { DPTableViz } from './DPTableViz'
import { RecursionTreeViz } from './RecursionTreeViz'
import { SystemDiagramViz } from './SystemDiagramViz'
import { TextBadgeViz } from './TextBadgeViz'
import { CounterViz } from './CounterViz'
import { GridViz } from './GridViz'

export interface PrimitiveProps {
  id: string
  state: unknown
  step: number
  onHover?: (id: string) => void
}

export const PrimitiveRegistry: Record<string, React.ComponentType<PrimitiveProps>> = {
  'array': ArrayViz,
  'hashmap': HashMapViz,
  'linked-list': LinkedListViz,
  'tree': TreeViz,
  'graph': GraphViz,
  'stack': StackViz,
  'queue': QueueViz,
  'dp-table': DPTableViz,
  'recursion-tree': RecursionTreeViz,
  'system-diagram': SystemDiagramViz,
  'text-badge': TextBadgeViz,
  'counter': CounterViz,
  'grid': GridViz,
}
