-- insyte Supabase Schema
-- Run this in the Supabase SQL Editor to set up Phase 7 + 11 tables.

-- ── Cached simulations ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scenes (
  id           TEXT PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('concept', 'dsa-trace', 'lld', 'hld')),
  scene_json   JSONB NOT NULL,
  hit_count    INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scenes_slug_idx ON scenes(slug);

CREATE OR REPLACE FUNCTION increment_hit_count(slug_arg TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_count INTEGER;
BEGIN
  UPDATE scenes
  SET hit_count = hit_count + 1
  WHERE slug = slug_arg
  RETURNING hit_count INTO next_count;

  RETURN COALESCE(next_count, 0);
END;
$$;

-- ── IP-based rate limiting ────────────────────────────────────────────────────
-- 15 AI generation requests per IP per hour (free tier).
CREATE TABLE IF NOT EXISTS rate_limits (
  ip           TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER DEFAULT 0,
  PRIMARY KEY (ip, window_start)
);

-- Auto-clean old windows (optional cron or pg_cron)
-- DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '2 hours';

-- ── Searchable topic catalog ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS topic_index (
  slug         TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  category     TEXT NOT NULL,
  tags         TEXT[],
  type         TEXT NOT NULL CHECK (type IN ('concept', 'dsa-trace', 'lld', 'hld')),
  is_featured  BOOLEAN DEFAULT FALSE,
  is_prebuilt  BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS query_hashes (
  hash             TEXT PRIMARY KEY,
  normalized_query TEXT NOT NULL,
  scene_slug       TEXT REFERENCES scenes(slug) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS query_hashes_slug_idx ON query_hashes(scene_slug);

CREATE TABLE IF NOT EXISTS saved_scenes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scene_slug TEXT REFERENCES scenes(slug) ON DELETE CASCADE NOT NULL,
  saved_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, scene_slug)
);

CREATE INDEX IF NOT EXISTS saved_scenes_user_idx ON saved_scenes(user_id);

CREATE TABLE IF NOT EXISTS user_generated_scenes (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scene_slug   TEXT REFERENCES scenes(slug) ON DELETE SET NULL,
  query        TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_generated_user_idx ON user_generated_scenes(user_id);

-- Optional cleanup for existing deployments that already had OG columns:
ALTER TABLE scenes DROP COLUMN IF EXISTS og_image_url;
ALTER TABLE topic_index DROP COLUMN IF EXISTS og_image_url;

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Public read for scenes and topic_index (no auth in R1)
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON scenes FOR SELECT USING (true);
CREATE POLICY "Service role write" ON scenes FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE topic_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON topic_index FOR SELECT USING (true);
CREATE POLICY "Service role write" ON topic_index FOR ALL USING (auth.role() = 'service_role');

-- rate_limits: service role only
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON rate_limits FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE query_hashes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "query_hashes_anon_read" ON query_hashes
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE saved_scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_scenes_user_select" ON saved_scenes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "saved_scenes_user_insert" ON saved_scenes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_scenes_user_delete" ON saved_scenes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE user_generated_scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_gen_user_select" ON user_generated_scenes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
