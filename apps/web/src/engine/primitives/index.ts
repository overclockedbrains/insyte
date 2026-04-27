import React from 'react'
import type { CanvasVisual } from '@insyte/scene-engine'

import { LinearViz } from './LinearViz'
import { MapViz } from './MapViz'
import { TreeViz } from './TreeViz'
import { GraphViz } from './GraphViz'
import { GridViz } from './GridViz'
import { SystemDiagramViz } from './SystemDiagramViz'
import { ChartViz } from './ChartViz'

export interface PrimitiveProps {
  id: string
  state: unknown
  step: number
  label?: string
  visual?: CanvasVisual
  onHover?: (id: string) => void
}

// Registry maps canvas visual types → rendering components.
// 7 types match VisualTypeSchema exactly.
// LinearViz dispatches to ArrayViz/StackViz/QueueViz/LinkedListViz by variant.
// TreeViz dispatches to BinaryTreeViz/TrieViz/RecursionTreeViz by variant.
// GraphViz dispatches to WeightedGraphViz or unweighted path by variant.
// GridViz dispatches to PathfindingGridViz/DPTableViz by variant.
// ChartViz dispatches to BarChartViz by variant.
export const PrimitiveRegistry: Record<string, React.ComponentType<PrimitiveProps>> = {
  'linear':         LinearViz,
  'map':            MapViz,
  'tree':           TreeViz,
  'graph':          GraphViz,
  'grid':           GridViz,
  'system-diagram': SystemDiagramViz,
  'chart':          ChartViz,
}
