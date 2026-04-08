# Supabase Data Model

This project uses Supabase for scene persistence, deduplication, rate limiting, and user history/bookmarks.

Type definitions live in `apps/web/lib/supabase.ts`.

## Clients

| Client | Source | Used For |
| --- | --- | --- |
| Server client (service role) | `getServerSupabase()` | Writes, caching, rate limits, history/bookmarks |
| Browser client (anon key) | `getBrowserSupabase()` | Auth/session and client-safe reads |

## Tables

| Table | Purpose | Key Columns |
| --- | --- | --- |
| `scenes` | Stores generated/cached scene JSON by slug | `slug`, `title`, `type`, `scene_json`, `hit_count` |
| `query_hashes` | Query dedupe map (`normalized_query` -> `scene_slug`) | `hash`, `normalized_query`, `scene_slug` |
| `rate_limits` | Free-tier quota counters per hour window | `ip` (hashed), `window_start`, `count` |
| `topic_index` | Explore catalog metadata | `slug`, `title`, `category`, `tags`, `is_featured` |
| `user_generated_scenes` | User generation history | `user_id`, `scene_slug`, `query`, `generated_at` |
| `saved_scenes` | User bookmarks | `user_id`, `scene_slug`, `saved_at` |

## Privacy and Security Notes

- Raw IP addresses are never persisted; they are SHA-256 hashed before writes.
- BYOK keys are stored only in browser local state (`settings-slice`) and sent per request.
- Service role key is used only server-side.

## Runtime Usage Patterns

| Flow | Tables Touched |
| --- | --- |
| Prompt generation dedupe | `query_hashes`, `scenes` |
| Free-tier generation | `rate_limits`, `query_hashes`, `scenes` |
| Scene page hit tracking | `scenes.hit_count` |
| Authenticated generation history | `user_generated_scenes` |
| Bookmark save/check/list | `saved_scenes` |
| Explore seed/import | `topic_index`, `scenes` (seed scripts) |

## Related Scripts

| Script | Purpose |
| --- | --- |
| `apps/web/scripts/seed-topic-index.ts` | Seed topic metadata into `topic_index` |
| `apps/web/scripts/seed-scenes.ts` | Seed scenes into Supabase |

