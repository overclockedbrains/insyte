import { parseScene } from '@insyte/scene-engine'
import type { Scene } from '@insyte/scene-engine'

// ─── Static scene registry ────────────────────────────────────────────────────
// Each entry is a lazy import so Next.js can code-split and tree-shake.
// Phase 5 scenes live under concepts/. DSA/LLD/HLD scenes added in later phases.

const SCENE_MODULES: Record<string, () => Promise<{ default: unknown }>> = {
  // Test
  test: () => import('@/src/content/scenes/test/minimal.json'),

  // Phase 5 — Concept simulations
  'hash-tables': () => import('@/src/content/scenes/concepts/hash-tables.json'),
  'js-event-loop': () => import('@/src/content/scenes/concepts/js-event-loop.json'),
  'load-balancer': () => import('@/src/content/scenes/concepts/load-balancer.json'),
  'dns-resolution': () => import('@/src/content/scenes/concepts/dns-resolution.json'),
  'git-branching': () => import('@/src/content/scenes/concepts/git-branching.json'),
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns all slugs that have a static scene JSON.
 * Used by generateStaticParams in /s/[slug]/page.tsx.
 */
export function getAllStaticSlugs(): string[] {
  return Object.keys(SCENE_MODULES)
}

/**
 * Loads and validates a scene by slug.
 * Returns null if the slug is unknown or the JSON fails validation.
 */
export async function loadStaticScene(slug: string): Promise<Scene | null> {
  const loader = SCENE_MODULES[slug]
  if (!loader) return null
  try {
    const mod = await loader()
    return parseScene(mod.default)
  } catch {
    return null
  }
}
