import type { PrimitiveProps } from '.'
import { ArrayViz } from './ArrayViz'
import { StackViz } from './StackViz'
import { QueueViz } from './QueueViz'
import { LinkedListViz } from './LinkedListViz'

// ─── LinearViz ─────────────────────────────────────────────────────────────────
//
// Thin dispatcher for the `linear` canvas type. Routes to the appropriate
// sub-renderer based on visual.variant.

export function LinearViz(props: PrimitiveProps) {
  switch (props.visual?.variant) {
    case 'stack':        return <StackViz {...props} />
    case 'queue':        return <QueueViz {...props} />
    case 'linked-list':  return <LinkedListViz {...props} />
    default:             return <ArrayViz {...props} />   // 'array' + fallback
  }
}
