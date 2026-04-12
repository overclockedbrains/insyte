import { describe, it, expect, vi } from 'vitest'
import { getAllStaticSlugs, loadStaticScene } from './scene-loader'

// Mock the parseScene function from scene-engine so we can unit test the loader logic
// without worrying about deep parsing failures.
vi.mock('@insyte/scene-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@insyte/scene-engine')>()
  return {
    ...actual,
    parseScene: vi.fn((data: unknown) => ({
      ...(data as object),
      __parsed: true
    }))
  }
})

describe('scene-loader', () => {
  describe('getAllStaticSlugs', () => {
    it('returns an array of registered slugs', () => {
      const slugs = getAllStaticSlugs()
      // We expect the registry to have multiple slugs, including 'test' and 'two-sum'
      expect(slugs.length).toBeGreaterThan(0)
      expect(slugs).toContain('test')
      expect(slugs).toContain('two-sum')
    })
  })

  describe('loadStaticScene', () => {
    it('returns null for an invalid/unregistered slug', async () => {
      const scene = await loadStaticScene('an-invalid-slug-123')
      expect(scene).toBeNull()
    })

    it('successfully loads and parses a registered slug', async () => {
      const scene = await loadStaticScene('test')
      expect(scene).not.toBeNull()
      // Because we mocked parseScene, the returned object should have our __parsed marker
      expect((scene as { __parsed?: boolean }).__parsed).toBe(true)
    })
  })
})
