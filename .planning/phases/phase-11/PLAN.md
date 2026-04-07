# Phase 11 — Supabase Integration + User Accounts

**Goal:** Full Supabase backend live — scene caching, auth, user profiles, saved simulations, rate limiting, and OG images. Signed-in users get unlimited free-tier AI usage with BYOK.

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
CREATE TABLE query_hashes (
  hash             TEXT PRIMARY KEY,
  normalized_query TEXT NOT NULL,
  scene_slug       TEXT REFERENCES scenes(slug) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX query_hashes_slug_idx ON query_hashes(scene_slug);

-- User saved simulations
CREATE TABLE saved_scenes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scene_slug TEXT REFERENCES scenes(slug) ON DELETE CASCADE NOT NULL,
  saved_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, scene_slug)
);

CREATE INDEX saved_scenes_user_idx ON saved_scenes(user_id);

-- User generated history
CREATE TABLE user_generated_scenes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scene_slug TEXT REFERENCES scenes(slug) ON DELETE SET NULL,
  query      TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX user_generated_user_idx ON user_generated_scenes(user_id);
```

- [ ] Row Level Security: enable RLS on all tables
  - `scenes`: allow anon read, service role write
  - `topic_index`: allow anon read, service role write
  - `rate_limits`: service role only
  - `query_hashes`: allow anon read, service role write
  - `saved_scenes`: users can read/write their own rows only
  - `user_generated_scenes`: users can read their own rows, service role insert

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
- [ ] Signed-in users with BYOK key bypass rate limiting entirely

Update `/api/generate` and `/api/chat` routes:
- [ ] Extract client IP from `request.headers.get('x-forwarded-for')` or `request.ip`
- [ ] Call `checkRateLimit(ip, 'generate')` / `checkRateLimit(ip, 'chat')`
- [ ] If not allowed: return `429 Too Many Requests` with `Retry-After` header

### 11.7 — OG image generation
Create `apps/web/src/app/api/og/route.tsx`:
- [ ] Uses `@vercel/og` (Satori) to generate a 1200×630 image
- [ ] URL: `/api/og?slug=hash-tables`
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
Update `/api/generate/route.ts`:
- [ ] After `streamObject` completes, validate + `saveScene(scene, slug)` fire-and-forget
- [ ] If user is signed in: also insert into `user_generated_scenes`

### 11.9 — Hit count tracking
Update `apps/web/src/app/s/[slug]/page.tsx`:
- [ ] After scene loads (any source): fire `incrementHitCount(slug)` fire-and-forget

### 11.10 — Repeat-query deduplication
Add to `apps/web/src/lib/cache.ts`:
- [ ] `normalizeQuery(query: string): string` — lowercase, trim, collapse spaces, strip trailing punctuation
- [ ] `hashQuery(normalized: string): string` — SHA-256 via Web Crypto
- [ ] `getCachedSlugForQuery(query: string): Promise<string | null>`
- [ ] `saveQueryHash(query: string, slug: string): Promise<void>` — fire-and-forget

Update `/api/generate/route.ts`:
- [ ] Check `getCachedSlugForQuery(topic)` before generating — return redirect slug if found
- [ ] After generation: call `saveQueryHash` + `saveScene` both fire-and-forget

### 11.11 — Supabase Auth setup
- [ ] Enable Email + Google OAuth providers in Supabase Auth dashboard
- [ ] Configure redirect URLs: `https://insyte.dev/auth/callback`, `http://localhost:3000/auth/callback`
- [ ] Create `apps/web/src/app/auth/callback/route.ts` — handles OAuth code exchange
- [ ] Create `apps/web/src/lib/auth.ts`:
  - `getUser(): Promise<User | null>` — reads session from Supabase
  - `signInWithGoogle(): Promise<void>`
  - `signInWithEmail(email, password): Promise<void>`
  - `signUpWithEmail(email, password): Promise<void>`
  - `signOut(): Promise<void>`

### 11.12 — Auth store
Create `apps/web/src/stores/slices/auth-slice.ts`:
- [ ] State: `user: User | null`, `session: Session | null`, `loading: boolean`
- [ ] Actions: `setUser`, `setSession`, `setLoading`
- [ ] `initAuth()`: calls `supabase.auth.getSession()` on app mount, subscribes to `onAuthStateChange`
- [ ] Wire into `useBoundStore`

### 11.13 — Sign-in / sign-up modal
Create `apps/web/src/components/auth/AuthModal.tsx`:
- [ ] Glass morphism modal (Dialog component)
- [ ] Two tabs: "Sign In" / "Sign Up"
- [ ] Email + password fields
- [ ] "Continue with Google" button (OAuth)
- [ ] Error message display (invalid credentials, email taken, etc.)
- [ ] Loading spinner during auth
- [ ] Auto-close on successful auth
- [ ] Trigger: `auth-store.openAuthModal()` — usable from any component

### 11.14 — Navbar auth UI
Update `Navbar.tsx`:
- [ ] If signed out: "Sign In" text button → opens AuthModal
- [ ] If signed in: avatar circle (initials or Google profile photo) with dropdown:
  - "Profile" → `/profile`
  - "Sign Out" → calls `signOut()`

### 11.15 — User profile page
Create `apps/web/src/app/profile/page.tsx`:
- [ ] Protected route — redirect to `/` with AuthModal open if not signed in
- [ ] Sections:
  1. **Profile header**: avatar (initials circle), display name, email, joined date
  2. **Saved Simulations**: grid of `TopicCard` (compact) for bookmarked scenes — fetched from `saved_scenes`
  3. **Generated History**: list of last 20 AI-generated scenes from `user_generated_scenes` — title, date, link

### 11.16 — Bookmark button on simulation pages
Update `apps/web/src/app/s/[slug]/page.tsx` (or `SimulationNav`):
- [ ] Bookmark icon button (heart or bookmark icon) in simulation nav
- [ ] If not signed in: clicking opens AuthModal
- [ ] If signed in: toggles save state — upserts/deletes from `saved_scenes`
- [ ] Optimistic UI: immediately toggles icon, reverts on error
- [ ] Framer Motion scale animation on toggle

---

## Exit Criteria
- [ ] `pnpm run seed` populates all 24 topics in Supabase `topic_index` table
- [ ] AI-generated scene is saved to Supabase after generation
- [ ] Second user visiting the same AI-generated slug loads from Supabase (no AI cost)
- [ ] Rate limit returns 429 after 15 API calls from same IP within 24 hours
- [ ] OG image generated for `hash-tables` is available at Supabase Storage URL
- [ ] `TopicCard` shows real OG image thumbnails
- [ ] `hit_count` increments on every simulation page load
- [ ] Typing "how does dns work?" and "How Does DNS Work?" both navigate to the same slug
- [ ] Explore page loads topics from Supabase (verify in Network tab)
- [ ] Google OAuth sign-in flow completes and user appears in navbar
- [ ] Email sign-up creates user in Supabase Auth dashboard
- [ ] `/profile` redirects to `/` with auth modal when not signed in
- [ ] Saving a simulation appears in `/profile` Saved section
- [ ] Generated history shows last 20 AI-generated scenes for the user

---

## Key Notes
- **Never store raw IPs** — always hash before storing in rate_limits table
- Supabase RLS is important — anon key must not be able to write to scenes or topic_index (only service key can write)
- OG image generation with Satori has a 5MB edge function memory limit — keep the component simple, don't load complex fonts
- The `og-images` Supabase Storage bucket should be public (no auth required to read images)
- Auth modal should be reusable and triggerable from anywhere — don't hardcode it to specific pages
- Signed-in users with BYOK bypass rate limiting — check session in `/api/generate` and `/api/chat` before the rate limit check
