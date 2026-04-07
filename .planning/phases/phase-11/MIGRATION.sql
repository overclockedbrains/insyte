-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 11 — Supabase Migration
-- Run in Supabase SQL Editor (Settings → SQL Editor)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. New tables ─────────────────────────────────────────────────────────────

-- Repeat-query deduplication: maps normalized query hash → existing scene slug
CREATE TABLE IF NOT EXISTS query_hashes (
  hash             TEXT PRIMARY KEY,
  normalized_query TEXT NOT NULL,
  scene_slug       TEXT REFERENCES scenes(slug) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS query_hashes_slug_idx ON query_hashes(scene_slug);

-- User saved simulations (bookmarks)
CREATE TABLE IF NOT EXISTS saved_scenes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scene_slug TEXT REFERENCES scenes(slug) ON DELETE CASCADE NOT NULL,
  saved_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, scene_slug)
);

CREATE INDEX IF NOT EXISTS saved_scenes_user_idx ON saved_scenes(user_id);

-- User AI generation history
CREATE TABLE IF NOT EXISTS user_generated_scenes (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scene_slug   TEXT REFERENCES scenes(slug) ON DELETE SET NULL,
  query        TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_generated_user_idx ON user_generated_scenes(user_id);


-- ── 2. Row Level Security ─────────────────────────────────────────────────────

-- scenes: anon read only, service role write
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scenes_anon_read" ON scenes;
CREATE POLICY "scenes_anon_read" ON scenes
  FOR SELECT TO anon, authenticated USING (true);

-- topic_index: anon read only, service role write
ALTER TABLE topic_index ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "topic_index_anon_read" ON topic_index;
CREATE POLICY "topic_index_anon_read" ON topic_index
  FOR SELECT TO anon, authenticated USING (true);

-- rate_limits: service role only (no client access)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT policies for anon/authenticated — service role bypasses RLS

-- query_hashes: anon read (for dedup check), service role write
ALTER TABLE query_hashes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "query_hashes_anon_read" ON query_hashes;
CREATE POLICY "query_hashes_anon_read" ON query_hashes
  FOR SELECT TO anon, authenticated USING (true);

-- saved_scenes: users own their rows
ALTER TABLE saved_scenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_scenes_user_select" ON saved_scenes;
CREATE POLICY "saved_scenes_user_select" ON saved_scenes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_scenes_user_insert" ON saved_scenes;
CREATE POLICY "saved_scenes_user_insert" ON saved_scenes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_scenes_user_delete" ON saved_scenes;
CREATE POLICY "saved_scenes_user_delete" ON saved_scenes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_generated_scenes: users read their own, service role insert
ALTER TABLE user_generated_scenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_gen_user_select" ON user_generated_scenes;
CREATE POLICY "user_gen_user_select" ON user_generated_scenes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);


-- ── 3. Auth providers ─────────────────────────────────────────────────────────
-- Do these steps in Supabase Dashboard → Authentication → Providers:
--
--   Email: Enable (already on by default)
--   Google: Enable → add Client ID + Secret from Google Cloud Console
--
-- Redirect URLs to whitelist (Dashboard → Auth → URL Configuration):
--   https://insyte.dev/auth/callback
--   http://localhost:3000/auth/callback


-- ── 4. Storage bucket for OG images ──────────────────────────────────────────
-- Run after applying the migration above.
-- Or let the generate-og-images script create it automatically.
--
-- insert into storage.buckets (id, name, public) values ('og-images', 'og-images', true)
-- on conflict (id) do nothing;


-- ── 5. Verification queries ───────────────────────────────────────────────────
-- Use these to verify the migration applied correctly:

-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--   ORDER BY table_name;

-- SELECT schemaname, tablename, rowsecurity
--   FROM pg_tables WHERE schemaname = 'public';
