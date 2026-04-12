import { describe, it, expect, vi } from 'vitest'
import { generateSlug, isGeneratedSlug, extractTopicFromSlug } from './slug'

// Mock nanoid so that generateSlug output is deterministic
vi.mock('nanoid', () => ({
  nanoid: () => 'xxxxxx'
}))

describe('slug utility', () => {
  describe('generateSlug', () => {
    it('generates a slug from a basic topic string', () => {
      const slug = generateSlug('How does a hash table work?')
      expect(slug).toBe('how-does-a-hash-table-work--xxxxxx')
    })

    it('strips punctuation and collapses spaces', () => {
      const slug = generateSlug('  What is   O(1)?  ')
      expect(slug).toBe('what-is-o1--xxxxxx')
    })

    it('truncates the slug base to 60 characters', () => {
      const longTopic = 'a'.repeat(100)
      const slug = generateSlug(longTopic)
      expect(slug.length).toBe(60 + 8) // 60 for base + 2 for hyphen + 6 for nanoid
    })
  })

  describe('isGeneratedSlug', () => {
    it('identifies AI-generated slugs', () => {
      expect(isGeneratedSlug('hash-tables--a1b2c3')).toBe(true)
      expect(isGeneratedSlug('how-does-a-b-tree-work--x7k2p1')).toBe(true)
    })

    it('identifies pre-built non-generated slugs', () => {
      expect(isGeneratedSlug('hash-tables')).toBe(false)
      expect(isGeneratedSlug('dns-resolution')).toBe(false)
      expect(isGeneratedSlug('two-sum')).toBe(false)
    })
  })

  describe('extractTopicFromSlug', () => {
    it('extracts readable topic from generated slug', () => {
      expect(extractTopicFromSlug('how-does-a-b-tree-work--x7k2p1')).toBe('How does a b tree work')
      expect(extractTopicFromSlug('binary-search--foo123')).toBe('Binary search')
    })

    it('extracts readable topic from pre-built slug (fallback)', () => {
      expect(extractTopicFromSlug('hash-tables')).toBe('Hash tables')
      expect(extractTopicFromSlug('dns-resolution')).toBe('Dns resolution')
    })
  })
})
