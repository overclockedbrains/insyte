'use client'

import type { SceneGroup, SceneNode } from '@insyte/scene-engine'
import type { SceneRendererProps } from '../types'

export function TextRenderer({ sceneGraph, resolvedPopups }: SceneRendererProps) {
  const canvasGroups = [...sceneGraph.groups.values()].filter((group) => !group.isHud)

  return (
    <div className="relative h-full w-full overflow-auto p-4">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-3 rounded-xl border border-outline-variant/20 bg-surface/80 p-4 font-mono text-sm text-on-surface shadow-sm">
        {canvasGroups.length === 0 ? (
          <p className="text-on-surface-variant italic">No visuals defined in this scene.</p>
        ) : (
          canvasGroups.map((group) => (
            <GroupBlock key={group.id} group={group} nodes={group.nodeIds.map((nodeId) => sceneGraph.nodes.get(nodeId)).filter(Boolean) as SceneNode[]} />
          ))
        )}

        {resolvedPopups.length > 0 && (
          <section className="rounded-lg border border-outline-variant/15 bg-surface-container/60 px-3 py-2">
            <p className="mb-2 text-xs text-on-surface-variant">Popups</p>
            <div className="space-y-1">
              {resolvedPopups.map((popup) => (
                <p key={popup.id}>{popup.text}</p>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function GroupBlock({ group, nodes }: { group: SceneGroup; nodes: SceneNode[] }) {
  return (
    <section className="rounded-lg border border-outline-variant/15 bg-surface-container/60 px-3 py-2">
      <p className="text-xs text-on-surface-variant">
        {group.label ?? group.id}
      </p>

      {nodes.length > 0 ? (
        <div className="mt-2 space-y-1">
          {nodes.map((node) => (
            <p key={node.id}>{formatNode(node)}</p>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-on-surface-variant italic">No visible items.</p>
      )}
    </section>
  )
}

function formatNode(node: SceneNode) {
  const state = node.state
  const value = pickTextValue(state)

  if (value) return value
  if (node.highlight) return `${node.id} (${node.highlight})`
  return node.id
}

function pickTextValue(state: Record<string, unknown>) {
  const candidates = ['text', 'label', 'value', 'name', 'title', 'sublabel']

  for (const key of candidates) {
    const value = state[key]
    if (typeof value === 'string' && value.trim().length > 0) return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  }

  if (Array.isArray(state.items)) {
    const texts = state.items
      .map((item) => {
        if (item == null || typeof item !== 'object') return null
        const record = item as Record<string, unknown>
        const value = record.value ?? record.label ?? record.text
        return value == null ? null : String(value)
      })
      .filter((value): value is string => Boolean(value))

    if (texts.length > 0) return texts.join('  ')
  }

  return null
}
