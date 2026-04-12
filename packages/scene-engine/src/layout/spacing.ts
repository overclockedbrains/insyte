// All spacing derived from 8px base unit — eliminates arbitrary SCALE_X/SCALE_Y constants
export const SPACING = {
  xs:  4,   // inner padding between elements
  sm:  8,   // standard gap
  md:  16,  // element gap
  lg:  24,  // section gap
  xl:  32,  // primitive separation
  xxl: 48,  // canvas padding around content
} as const

export const PRIMITIVE_SIZING = {
  array:         { cellWidth: 48, cellHeight: 48, gap: 8 },
  stack:         { itemWidth: 120, itemHeight: 40, gap: 8 },
  queue:         { itemWidth: 80,  itemHeight: 40, gap: 8 },
  linkedList:    { nodeWidth: 64,  nodeHeight: 40, gap: 32 },  // 32 for arrow room
  tree:          { nodeSize: [80, 60] as [number, number] },   // d3.tree().nodeSize
  recursionTree: { nodeSize: [72, 56] as [number, number] },
  graph:         { nodeWidth: 100, nodeHeight: 40, nodesep: 40, ranksep: 60 },
  systemDiagram: { nodeWidth: 120, nodeHeight: 48, nodesep: 60, ranksep: 80 },
  hashmap:       { bucketHeight: 40, keyWidth: 80, valueWidth: 80, rowGap: 4 },
  dpTable:       { cellWidth: 48, cellHeight: 48, gap: 2 },
  counter:       { width: 80,  height: 48 },
  textBadge:     { maxWidth: 200, padding: 12 },
} as const
