/**
 * LRU cache with a fixed capacity.
 * On access, the entry is moved to the "most recently used" end.
 * When capacity is exceeded, the least recently used entry is evicted.
 *
 * Uses a single Map — Map maintains insertion order, so the first entry
 * is always the LRU entry.
 */
export class LRUCache<K, V> {
  private readonly capacity: number
  private readonly map: Map<K, V>

  constructor(capacity: number) {
    this.capacity = capacity
    this.map = new Map()
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined
    // Move to end: delete then re-insert
    const value = this.map.get(key)!
    this.map.delete(key)
    this.map.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      // Update existing — move to end
      this.map.delete(key)
    } else if (this.map.size >= this.capacity) {
      // Evict LRU (first entry)
      const lruKey = this.map.keys().next().value as K
      this.map.delete(lruKey)
    }
    this.map.set(key, value)
  }

  has(key: K): boolean {
    return this.map.has(key)
  }

  clear(): void {
    this.map.clear()
  }

  get size(): number {
    return this.map.size
  }
}
