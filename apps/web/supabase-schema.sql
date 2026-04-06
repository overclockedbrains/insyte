-- insyte Supabase Schema
-- Run this in the Supabase SQL Editor to set up Phase 7 + 11 tables.

-- ── Cached simulations ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scenes (
  id           TEXT PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('concept', 'dsa-trace', 'lld', 'hld')),
  scene_json   JSONB NOT NULL,
  og_image_url TEXT,
  hit_count    INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scenes_slug_idx ON scenes(slug);

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
  og_image_url TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

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
