# Phase 11 — Supabase Integration

**Goal:** Scene caching, topic index seeding, OG image generation, and IP-based rate limiting all live on Supabase.

**Entry criteria:** Phase 10 complete. All 24 simulations working. Supabase project created.

---

## Tasks

### 11.1 — Supabase project setup
- [ ] Create Supabase project at supabase.com (if not already done)
- [ ] Note: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- [ ] Add to `apps/web/.env.local`
- [ ] Install Supabase client: `pnpm add @supabase/supabase-js --filter web`

### 11.2 — Database schema
Run migrations in Supabase SQL editor:

```sql
-- Cached simulations (pre-built + AI-generated)
CREATE TABLE scenes (
  id           TEXT PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('concept', 'dsa-trace', 'lld', 'hld')),
  scene_json   JSONB NOT NULL,
  og_image_url TEXT,
  hit_count    INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX scenes_slug_idx ON scenes(slug);
CREATE INDEX scenes_type_idx ON scenes(type);

-- Searchable topic catalog
CREATE TABLE topic_index (
  slug         TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  category     TEXT NOT NULL,
  tags         TEXT[] DEFAULT '{}',
  type         TEXT NOT NULL CHECK (type IN ('concept', 'dsa-trace', 'lld', 'hld')),
  is_featured  BOOLEAN DEFAULT FALSE,
  is_prebuilt  BOOLEAN DEFAULT FALSE,
  og_image_url TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- IP-based rate limiting (no auth required)
CREATE TABLE rate_limits (
  ip_hash      TEXT NOT NULL,
  endpoint     TEXT NOT NULL,
  count        INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (ip_hash, endpoint)
);

CREATE INDEX rate_limits_window_idx ON rate_limits(window_start);

-- Repeat-query deduplication: maps normalized query hash → existing scene slug
-- Prevents duplicate AI generations for semantically identical queries
-- e.g., "how does dns work?" and "How does DNS work?" map to the same scene
CREATE TABLE query_hashes (
  hash             TEXT PRIMARY KEY,      -- SHA-256 of normalized query
  normalized_query TEXT NOT NULL,          -- the normalized form (for debugging)
  scene_slug       TEXT REFERENCES scenes(slug) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX query_hashes_slug_idx ON query_hashes(scene_slug);
```

- [ ] Row Level Security: enable RLS on all tables
  - `scenes`: allow anon read, service role write
  - `topic_index`: allow anon read, service role write
  - `rate_limits`: service role only (server-side rate limit checks)
  - `query_hashes`: allow anon read (slug lookup), service role write

### 11.3 — Supabase client
Create `apps/web/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

// Browser client (anon key — read-only operations)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Server client (service key — write operations, rate limiting)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}
```

### 11.4 — Scene cache functions
Create `apps/web/src/lib/cache.ts`:

- [ ] `getCachedScene(slug: string): Promise<Scene | null>`
  - Queries `scenes` table by slug
  - Parses scene_json with `safeParseScene()`
  - Returns null if not found or parse fails
  
- [ ] `saveScene(scene: Scene, slug: string): Promise<void>`
  - Upserts into `scenes` table (service key client)
  - Does NOT throw on failure (cache save is best-effort)
  
- [ ] `incrementHitCount(slug: string): Promise<void>`
  - SQL: `UPDATE scenes SET hit_count = hit_count + 1 WHERE slug = $1`
  - Fire-and-forget (no await needed)

- [ ] Updated scene load priority in `loadScene(slug)`:
  1. Check static file (`src/content/scenes/`)
  2. Check Supabase cache (`getCachedScene(slug)`)
  3. Return null (caller triggers AI generation)

### 11.5 — Topic index seeding
Create `apps/web/scripts/seed-topic-index.ts`:
- [ ] Imports `topicIndex` from `src/content/topic-index.ts`
- [ ] Upserts all 24 entries into Supabase `topic_index` table
- [ ] Run once: `pnpm run seed` — add to root `package.json` scripts

Update gallery `/explore/page.tsx`:
- [ ] Replace client-side `topicIndex` lookups with Supabase queries:
  - `supabase.from('topic_index').select('*').order('is_featured', { ascending: false })`
  - `getTopicsByCategory(category)` → Supabase query with `.eq('category', category)`
  - Cache in Next.js with `fetch` cache: `revalidate: 3600` (1 hour)
- [ ] Fallback: if Supabase query fails, use local `topicIndex` constant

### 11.6 — IP-based rate limiting
Create `apps/web/src/lib/rateLimit.ts`:

```typescript
const LIMIT = 15  // interactions per window
const WINDOW_MINUTES = 60 * 24  // 24 hours

export async function checkRateLimit(ip: string, endpoint: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}> {
  // 1. Hash the IP (sha256) for privacy
  // 2. Check rate_limits table for (ipHash, endpoint)
  // 3. If window expired: reset count
  // 4. If count >= LIMIT: return { allowed: false, remaining: 0, ... }
  // 5. Else: increment count, return { allowed: true, remaining: LIMIT - count - 1, ... }
}
```

- [ ] Hash IP with `crypto.createHash('sha256').update(ip).digest('hex')` (no raw IP storage)
- [ ] Window resets every 24 hours from first request in that window
- [ ] Rate limit header: `X-RateLimit-Remaining`, `X-RateLimit-Reset` in response

Update `/api/generate` and `/api/chat` routes:
- [ ] Extract client IP from `request.headers.get('x-forwarded-for')` or `request.ip`
- [ ] Call `checkRateLimit(ip, 'generate')` / `checkRateLimit(ip, 'chat')`
- [ ] If not allowed: return `429 Too Many Requests` with `Retry-After` header

### 11.7 — OG image generation
Create `apps/web/src/app/api/og/route.tsx`:
- [ ] Uses `@vercel/og` (Satori) to generate a 1200×630 image
- [ ] URL: `/api/og?slug=hash-tables` (or called internally)
- [ ] Design: dark `#0e0e13` background + glow blobs (SVG) + simulation title (Manrope) + type badge + "insyte" logo + tagline
- [ ] Generates PNG, returns with `Content-Type: image/png` headers
- [ ] Download font files (Manrope + Inter) for Satori (can't use Google Fonts CDN)

Create `apps/web/scripts/generate-og-images.ts`:
- [ ] For each of 24 pre-built simulations:
  - Fetch `/api/og?slug=[slug]`
  - Upload PNG to Supabase Storage bucket `og-images`
  - Update `scenes.og_image_url` and `topic_index.og_image_url` with public URL
- [ ] Run once during deployment: `pnpm run generate-og`

Update `TopicCard.tsx`:
- [ ] Use `og_image_url` from topic index as card thumbnail (replace placeholder)
- [ ] `next/image` with `fill` mode and `object-cover`

### 11.8 — Update AI generation to save to Supabase
Update `/api/generate/route.ts` (from Phase 7 stub):
- [ ] After `streamObject` completes:
  - Get the final accumulated Scene JSON
  - Validate with `safeParseScene()`
  - If valid: call `saveScene(scene, slug)`
- [ ] `saveScene` runs in background (no `await` blocking response)

### 11.9 — Hit count tracking
Update `apps/web/src/app/s/[slug]/page.tsx`:
- [ ] After scene loads (any source): fire `incrementHitCount(slug)` 
- [ ] Fire-and-forget: `void incrementHitCount(slug)` (no blocking)

### 11.10 — Repeat-query deduplication (query_hashes)
Add query deduplication to `apps/web/src/lib/cache.ts` and update `/api/generate`:

**Problem:** `nanoid` slugs mean `"how does consistent hashing work?"` and `"How Does Consistent Hashing Work?"` both trigger separate AI generations, doubling cost and polluting the `scenes` table.

**Fix:** Hash the normalized query and check `query_hashes` before generating.

- [ ] `normalizeQuery(query: string): string`
  ```typescript
  // lowercase, trim, collapse multiple spaces, strip trailing punctuation
  query.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[?.!]+$/, '')
  ```
- [ ] `hashQuery(normalized: string): string`
  ```typescript
  // SHA-256 via Web Crypto (works in Edge runtime and Node)
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized))
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  ```
- [ ] `getCachedSlugForQuery(query: string): Promise<string | null>`
  - Normalizes + hashes the query
  - Queries `query_hashes` table: `.eq('hash', hash).select('scene_slug').single()`
  - Returns the slug if found, null if not
- [ ] `saveQueryHash(query: string, slug: string): Promise<void>`
  - Normalizes + hashes the query
  - Upserts `{ hash, normalized_query, scene_slug }` into `query_hashes`
  - Fire-and-forget (no await)

Update `/api/generate/route.ts`:
- [ ] Before calling `generateScene()`:
  1. Call `getCachedSlugForQuery(topic)` — if found, return `{ redirect: existingSlug }` (HTTP 200, not 307)
  2. Client-side: on receiving `{ redirect }`, navigate to `/s/[existingSlug]` instead of generating
- [ ] After `generateScene()` completes: call `saveQueryHash(topic, newSlug)` + `saveScene(scene, newSlug)` both fire-and-forget

---

## Exit Criteria
- [ ] `pnpm run seed` populates all 24 topics in Supabase `topic_index` table
- [ ] AI-generated scene is saved to Supabase after generation
- [ ] Second user visiting the same AI-generated slug loads from Supabase (no AI cost)
- [ ] Rate limit returns 429 after 15 API calls from same IP within 24 hours
- [ ] OG image generated for `hash-tables` is available at Supabase Storage URL
- [ ] `TopicCard` shows real OG image thumbnails (not placeholders)
- [ ] `hit_count` increments on every simulation page load
- [ ] Typing "how does dns work?" and "How Does DNS Work?" both navigate to the same slug (query deduplication working)
- [ ] Gallery page loads topics from Supabase (verify in Network tab)

---

## Key Notes
- **Never store raw IPs** — always hash before storing in rate_limits table
- Supabase RLS is important — anon key must not be able to write to scenes or topic_index (only service key can write)
- OG image generation with Satori has a 5MB edge function memory limit — keep the React component simple, don't load complex fonts
- The `og-images` Supabase Storage bucket should be public (no auth required to read images)
- Phase 11 can be done in parallel with Phase 12 if desired — they have no shared dependencies
- After seeding, the gallery's `searchTopics()` can be enhanced to use Supabase full-text search (`tsquery`) instead of client-side filtering
