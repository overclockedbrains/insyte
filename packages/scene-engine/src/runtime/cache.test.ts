import { describe, it, expect } from 'vitest'
import { LRUCache } from './cache'

describe('LRUCache', () => {
  it('stores and retrieves items', () => {
    const cache = new LRUCache<string, number>(10)
    cache.set('a', 1)
    expect(cache.get('a')).toBe(1)
    expect(cache.size).toBe(1)
  })

  it('evicts the least recently used item when capacity is exceeded', () => {
    const cache = new LRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    
    // Size is at capacity
    expect(cache.size).toBe(3)
    
    // Add one more, 'a' should be evicted because it was added first
    cache.set('d', 4)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
    expect(cache.get('d')).toBe(4)
  })

  it('updates MRU status when an item is retrieved', () => {
    const cache = new LRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    
    // Access 'a', making it the most recently used
    cache.get('a')
    
    // Add 'd' to exceed capacity.
    // 'b' is now the LRU because 'a' was accessed and 'c' was added after 'b'
    cache.set('d', 4)
    
    expect(cache.get('b')).toBeUndefined() // evicted
    expect(cache.get('a')).toBe(1)         // retained
    expect(cache.get('c')).toBe(3)         // retained
    expect(cache.get('d')).toBe(4)         // retained
  })

  it('updates MRU status when an existing item is overwritten', () => {
    const cache = new LRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    
    // Overwrite 'a', making it the MRU
    cache.set('a', 99)
    
    // Add 'd'. 'b' must be evicted.
    cache.set('d', 4)
    
    expect(cache.get('b')).toBeUndefined() // evicted
    expect(cache.get('a')).toBe(99)        // retained and updated
    expect(cache.get('c')).toBe(3)         // retained
    expect(cache.get('d')).toBe(4)         // retained
  })

  it('clears all entries', () => {
    const cache = new LRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    
    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.get('a')).toBeUndefined()
  })
})
