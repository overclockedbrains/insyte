/**
 * Phase 19 migration script — run once from repo root:
 *   node scripts/migrate-scene-json.mjs
 *
 * Per-visual changes:
 *   - Remove `position: { x, y }` from every Visual object
 *   - Add `layoutHint` based on visual type (where applicable)
 *   - Add `slot: 'top-center'` to text-badge / counter visuals
 *   - Remove `x`/`y` from node/component arrays in initialState
 *
 * Per-action changes:
 *   - Remove the `action` field (migrate to universal { target, params } format)
 *   - Remove `x`/`y` from node/component arrays inside step action params
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Config ────────────────────────────────────────────────────────────────────

const SCENES_DIR = path.resolve(__dirname, '../apps/web/src/content/scenes')

const DEFAULT_LAYOUT_HINTS = {
  array: 'linear-H',
  'linked-list': 'linear-H',
  queue: 'linear-H',
  stack: 'linear-V',
  tree: 'tree-RT',
  'recursion-tree': 'tree-RT',
  graph: 'dagre-TB',
  'system-diagram': 'dagre-LR',
  'dp-table': 'grid-2d',
  grid: 'grid-2d',
  hashmap: 'hashmap-buckets',
}

// Default slot for info primitives — can be refined per-file manually
const DEFAULT_SLOTS = {
  'text-badge': 'top-center',
  counter: 'bottom-left',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Remove x/y keys from an array of node/component objects. */
function stripXY(arr) {
  if (!Array.isArray(arr)) return arr
  return arr.map((node) => {
    if (!node || typeof node !== 'object') return node
    const { x: _x, y: _y, ...rest } = node
    return rest
  })
}

/** Process a visual object: remove position, add layoutHint/slot, strip node xy. */
function migrateVisual(v) {
  // Remove position
  const { position: _pos, ...rest } = v

  // Add layoutHint if applicable
  const layoutHint = DEFAULT_LAYOUT_HINTS[rest.type]
  if (layoutHint && !rest.layoutHint) {
    rest.layoutHint = layoutHint
  }

  // Add slot for info primitives
  const slot = DEFAULT_SLOTS[rest.type]
  if (slot && !rest.slot) {
    rest.slot = slot
  }

  // Strip x/y from node/component arrays in initialState
  if (rest.initialState && typeof rest.initialState === 'object') {
    const state = { ...rest.initialState }
    for (const key of ['nodes', 'components']) {
      if (Array.isArray(state[key])) {
        state[key] = stripXY(state[key])
      }
    }
    rest.initialState = state
  }

  return rest
}

/** Process an action: remove `action` field, strip node xy from params. */
function migrateAction(a) {
  // Remove the discriminated `action` field
  const { action: _actionName, ...rest } = a

  // Strip x/y from node/component arrays inside params
  if (rest.params && typeof rest.params === 'object') {
    const params = { ...rest.params }
    for (const key of ['nodes', 'components']) {
      if (Array.isArray(params[key])) {
        params[key] = stripXY(params[key])
      }
    }
    rest.params = params
  }

  return rest
}

// ── Main ──────────────────────────────────────────────────────────────────────

function collectJsonFiles(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectJsonFiles(full))
    } else if (entry.name.endsWith('.json')) {
      files.push(full)
    }
  }
  return files
}

const files = collectJsonFiles(SCENES_DIR)
let migrated = 0

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf-8')
  const scene = JSON.parse(raw)

  // Migrate visuals
  if (Array.isArray(scene.visuals)) {
    scene.visuals = scene.visuals.map(migrateVisual)
  }

  // Migrate steps → actions
  if (Array.isArray(scene.steps)) {
    scene.steps = scene.steps.map((step) => ({
      ...step,
      actions: Array.isArray(step.actions)
        ? step.actions.map(migrateAction)
        : step.actions,
    }))
  }

  fs.writeFileSync(file, JSON.stringify(scene, null, 2) + '\n')
  console.log(`✓ ${path.relative(SCENES_DIR, file)}`)
  migrated++
}

console.log(`\nMigrated ${migrated} scene file(s).`)
