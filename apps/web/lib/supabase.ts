import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import type { Scene } from '@insyte/scene-engine'
import type { Database, Json } from './database.types'

// ─── Database schema types ────────────────────────────────────────────────────

export interface DatabaseSchemaSnapshot {
  public: {
    Views: Record<string, never>
    Functions: Record<string, never>
    Tables: {
      scenes: {
        Row: {
          id: string
          slug: string
          title: string
          type: string
          scene_json: unknown
          hit_count: number
          created_at: string
        }
        Insert: {
          id: string
          slug: string
          title: string
          type: string
          scene_json: unknown
          hit_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          type?: string
          scene_json?: unknown
          hit_count?: number
          created_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          ip: string
          window_start: string
          count: number
        }
        Insert: {
          ip: string
          window_start: string
          count?: number
        }
        Update: {
          ip?: string
          window_start?: string
          count?: number
        }
        Relationships: []
      }
      topic_index: {
        Row: {
          slug: string
          title: string
          description: string | null
          category: string
          tags: string[] | null
          type: string
          is_featured: boolean
          is_prebuilt: boolean
          created_at: string
        }
        Insert: {
          slug: string
          title: string
          description?: string | null
          category: string
          tags?: string[] | null
          type: string
          is_featured?: boolean
          is_prebuilt?: boolean
          created_at?: string
        }
        Update: {
          slug?: string
          title?: string
          description?: string | null
          category?: string
          tags?: string[] | null
          type?: string
          is_featured?: boolean
          is_prebuilt?: boolean
          created_at?: string
        }
        Relationships: []
      }
      query_hashes: {
        Row: {
          hash: string
          normalized_query: string
          scene_slug: string | null
          created_at: string
        }
        Insert: {
          hash: string
          normalized_query: string
          scene_slug?: string | null
          created_at?: string
        }
        Update: {
          hash?: string
          normalized_query?: string
          scene_slug?: string | null
          created_at?: string
        }
        Relationships: []
      }
      saved_scenes: {
        Row: {
          id: string
          user_id: string
          scene_slug: string
          saved_at: string
        }
        Insert: {
          id?: string
          user_id: string
          scene_slug: string
          saved_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          scene_slug?: string
          saved_at?: string
        }
        Relationships: []
      }
      user_generated_scenes: {
        Row: {
          id: string
          user_id: string
          scene_slug: string | null
          query: string | null
          generated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          scene_slug?: string | null
          query?: string | null
          generated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          scene_slug?: string | null
          query?: string | null
          generated_at?: string
        }
        Relationships: []
      }
    }
  }
}

// ─── Server client (service role — write operations) ──────────────────────────

function buildServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient<Database>(url, key, { auth: { persistSession: false } })
}

let _serverClient: ReturnType<typeof buildServerClient> | undefined = undefined

export function getServerSupabase() {
  if (_serverClient !== undefined) return _serverClient
  _serverClient = buildServerClient()
  return _serverClient
}

// ─── Browser client (anon key — auth + read) ─────────────────────────────────
// Exported as a singleton for client components.

let _browserClient: ReturnType<typeof createClient<Database>> | undefined = undefined

export function getBrowserSupabase() {
  if (_browserClient) return _browserClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  _browserClient = createClient<Database>(url, key)
  return _browserClient
}

// ─── IP privacy ───────────────────────────────────────────────────────────────
// Never store raw IPs. Always hash before persisting.

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex')
}

// ─── Query normalization + deduplication ─────────────────────────────────────

export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[?.!,;:]+$/, '')
}

export function hashQuery(normalized: string): string {
  return createHash('sha256').update(normalized).digest('hex')
}

/**
 * Checks if a query was already generated before.
 * Returns the existing scene slug if found, null otherwise.
 */
export async function getCachedSlugForQuery(query: string): Promise<string | null> {
  const supabase = getServerSupabase()
  if (!supabase) return null

  try {
    const normalized = normalizeQuery(query)
    const hash = hashQuery(normalized)

    const { data, error } = await supabase
      .from('query_hashes')
      .select('scene_slug')
      .eq('hash', hash)
      .maybeSingle()

    if (error || !data?.scene_slug) return null
    return data.scene_slug
  } catch {
    return null
  }
}

/**
 * Persists a query → slug mapping for future deduplication.
 * Fire-and-forget — does not throw.
 */
export function saveQueryHash(query: string, slug: string): void {
  const supabase = getServerSupabase()
  if (!supabase) return

  const normalized = normalizeQuery(query)
  const hash = hashQuery(normalized)

  void supabase.from('query_hashes').upsert({ hash, normalized_query: normalized, scene_slug: slug })
}

// ─── Scene caching ────────────────────────────────────────────────────────────

/**
 * Checks Supabase for a cached scene by slug.
 * Returns the Scene JSON if found, null otherwise.
 */
export async function getCachedScene(slug: string): Promise<Scene | null> {
  const supabase = getServerSupabase()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('scenes')
      .select('scene_json')
      .eq('slug', slug)
      .maybeSingle()

    if (error || !data) return null
    return data.scene_json as unknown as Scene
  } catch {
    return null
  }
}

/**
 * Saves a generated scene to Supabase.
 * Upserts by slug so re-generation overwrites stale data.
 */
export async function saveScene(slug: string, scene: Scene): Promise<void> {
  const supabase = getServerSupabase()
  if (!supabase) return

  try {
    await supabase.from('scenes').upsert({
      id: scene.id,
      slug,
      title: scene.title,
      type: scene.type,
      scene_json: scene as unknown as Json,
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    console.warn('[supabase] saveScene failed:', err)
  }
}

/**
 * Increments the hit counter for a scene slug.
 * Fire-and-forget — does not await.
 */
export function incrementHitCount(slug: string): void {
  const supabase = getServerSupabase()
  if (!supabase) return

  void (async () => {
    const { data } = await supabase
      .from('scenes')
      .select('hit_count')
      .eq('slug', slug)
      .single()
    if (data == null) return
    await supabase
      .from('scenes')
      .update({ hit_count: (data.hit_count ?? 0) + 1 })
      .eq('slug', slug)
  })()
}

// ─── User history ─────────────────────────────────────────────────────────────

/**
 * Records a user-generated scene in user_generated_scenes.
 * Fire-and-forget — service role can write regardless of RLS.
 */
export function recordUserGeneration(userId: string, query: string, slug: string): void {
  const supabase = getServerSupabase()
  if (!supabase) return

  void supabase.from('user_generated_scenes')
    .insert({ user_id: userId, scene_slug: slug, query })
    .then(({ error }) => { if (error) console.error('[supabase] recordUserGeneration failed:', error) })
}

// ─── Saved scenes (bookmarks) ─────────────────────────────────────────────────

export async function getSavedSlugs(userId: string): Promise<string[]> {
  const supabase = getServerSupabase()
  if (!supabase) return []

  try {
    const { data } = await supabase
      .from('saved_scenes')
      .select('scene_slug')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false })

    return (data ?? []).map((r) => r.scene_slug)
  } catch {
    return []
  }
}

export async function isSceneSaved(userId: string, slug: string): Promise<boolean> {
  const supabase = getServerSupabase()
  if (!supabase) return false

  try {
    const { data } = await supabase
      .from('saved_scenes')
      .select('id')
      .eq('user_id', userId)
      .eq('scene_slug', slug)
      .maybeSingle()  // null when not saved, no 406
    return !!data
  } catch {
    return false
  }
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

export const RATE_LIMIT_MAX = 15
const RATE_LIMIT_WINDOW_SECS = 3600 // 1 hour

function getCurrentWindowStart(now = Date.now()): string {
  const windowMs = RATE_LIMIT_WINDOW_SECS * 1000
  const windowStartMs = Math.floor(now / windowMs) * windowMs
  return new Date(windowStartMs).toISOString()
}

/**
 * Read-only rate-limit status for a given IP.
 * Does NOT increment the counter.
 */
export async function getRateLimitStatus(
  ip: string,
): Promise<{ remaining: number; resetAt: string }> {
  const windowMs = RATE_LIMIT_WINDOW_SECS * 1000
  const windowStart = getCurrentWindowStart()
  const windowStartMs = Date.parse(windowStart)
  const resetAt = new Date(windowStartMs + windowMs).toISOString()

  const supabase = getServerSupabase()
  if (!supabase) return { remaining: RATE_LIMIT_MAX, resetAt }

  const ipHash = hashIp(ip)

  try {
    const { data } = await supabase
      .from('rate_limits')
      .select('count')
      .eq('ip', ipHash)
      .eq('window_start', windowStart)
      .maybeSingle()

    const used = data?.count ?? 0
    return { remaining: Math.max(0, RATE_LIMIT_MAX - used), resetAt }
  } catch {
    return { remaining: RATE_LIMIT_MAX, resetAt }
  }
}

export async function checkAndIncrementRateLimit(ip: string): Promise<boolean> {
  const supabase = getServerSupabase()
  if (!supabase) return true

  const ipHash = hashIp(ip)
  const windowStart = getCurrentWindowStart()

  try {
    const { data } = await supabase
      .from('rate_limits')
      .select('count')
      .eq('ip', ipHash)
      .eq('window_start', windowStart)
      .maybeSingle()

    const currentCount = data?.count ?? 0

    if (currentCount >= RATE_LIMIT_MAX) return false

    await supabase.from('rate_limits').upsert({
      ip: ipHash,
      window_start: windowStart,
      count: currentCount + 1,
    })

    return true
  } catch {
    // Table not created yet — allow request
    return true
  }
}
