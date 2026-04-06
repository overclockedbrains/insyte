import { nanoid } from 'nanoid'

// ─── Slug generation ──────────────────────────────────────────────────────────

/**
 * Converts a topic string to a URL-safe slug and appends a 6-char nanoid.
 * "How does a hash table work?" → "how-does-a-hash-table-work-x7k2p1"
 *
 * Pre-built slugs are clean (no suffix): "hash-tables"
 * AI-generated slugs always have the nanoid suffix for cache uniqueness.
 */
export function generateSlug(topic: string): string {
  const base = topic
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // strip punctuation
    .replace(/\s+/g, '-')           // spaces → dashes
    .replace(/-+/g, '-')            // collapse multiple dashes
    .replace(/^-|-$/g, '')          // trim leading/trailing dashes
    .slice(0, 60)                   // max 60 chars before suffix

  return `${base}-${nanoid(6)}`
}

// ─── Slug classification ──────────────────────────────────────────────────────

/**
 * Returns true if the slug appears to be AI-generated (has a nanoid suffix).
 * AI-generated: "how-does-a-b-tree-work-x7k2p1"
 * Pre-built: "hash-tables", "dns-resolution"
 */
export function isGeneratedSlug(slug: string): boolean {
  return /^.+-[a-zA-Z0-9]{6}$/.test(slug)
}

/**
 * Extracts a human-readable topic from a generated slug.
 * "how-does-a-b-tree-work-x7k2p1" → "How does a b tree work"
 * Falls back to the full slug if it doesn't look AI-generated.
 */
export function extractTopicFromSlug(slug: string): string {
  let base = slug

  // Strip the 6-char nanoid suffix if present
  if (isGeneratedSlug(slug)) {
    base = slug.slice(0, slug.length - 7) // remove trailing "-xxxxxx"
  }

  // Dashes → spaces, capitalise first letter
  const readable = base.replace(/-/g, ' ')
  return readable.charAt(0).toUpperCase() + readable.slice(1)
}
