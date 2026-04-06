import { createClient } from '@supabase/supabase-js'
import type { Scene } from '@insyte/scene-engine'

// ─── Database schema types ────────────────────────────────────────────────────
// These mirror the Supabase tables defined in DECISIONS.md.

export interface Database {
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
          og_image_url: string | null
          hit_count: number
          created_at: string
        }
        Insert: {
          id: string
          slug: string
          title: string
          type: string
          scene_json: unknown
          og_image_url?: string | null
          hit_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          type?: string
          scene_json?: unknown
          og_image_url?: string | null
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
          og_image_url: string | null
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
          og_image_url?: string | null
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
          og_image_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
  }
}

// ─── Client ───────────────────────────────────────────────────────────────────

function buildClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient<Database>(url, key, { auth: { persistSession: false } })
}

let _client: ReturnType<typeof buildClient> | undefined = undefined

export function getServerSupabase() {
  if (_client !== undefined) return _client
  _client = buildClient()
  return _client
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
      .select('scene_json, hit_count')
      .eq('slug', slug)
      .single()

    if (error || !data) return null

    // Increment hit count async (fire-and-forget)
    void supabase
      .from('scenes')
      .update({ hit_count: data.hit_count + 1 })
      .eq('slug', slug)
      .then(() => {})

    return data.scene_json as Scene
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
      scene_json: scene as unknown,
      og_image_url: null,
      hit_count: 0,
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    console.warn('[supabase] saveScene failed:', err)
  }
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

const RATE_LIMIT_MAX = 15
const RATE_LIMIT_WINDOW_SECS = 3600 // 1 hour

/**
 * Checks and increments the rate-limit counter for an IP.
 * Returns true if the request is allowed, false if rate-limited.
 * Falls back to allowed=true when Supabase is not configured.
 *
 * Required table:
 *   CREATE TABLE rate_limits (
 *     ip TEXT,
 *     window_start TIMESTAMPTZ,
 *     count INTEGER DEFAULT 0,
 *     PRIMARY KEY (ip, window_start)
 *   );
 */
export async function checkAndIncrementRateLimit(ip: string): Promise<boolean> {
  const supabase = getServerSupabase()
  if (!supabase) return true

  const windowStart = new Date(
    Math.floor(Date.now() / (RATE_LIMIT_WINDOW_SECS * 1000)) *
      RATE_LIMIT_WINDOW_SECS *
      1000,
  ).toISOString()

  try {
    const { data } = await supabase
      .from('rate_limits')
      .select('count')
      .eq('ip', ip)
      .eq('window_start', windowStart)
      .single()

    const currentCount = data?.count ?? 0

    if (currentCount >= RATE_LIMIT_MAX) return false

    await supabase.from('rate_limits').upsert({
      ip,
      window_start: windowStart,
      count: currentCount + 1,
    })

    return true
  } catch {
    // Table not created yet — allow request
    return true
  }
}
