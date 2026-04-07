/**
 * Seed script: upserts all static scene JSON files into Supabase `scenes` table.
 *
 * This is required so FK constraints on saved_scenes.scene_slug and
 * user_generated_scenes.scene_slug resolve correctly for pre-built simulations.
 * It also enables hit_count tracking for static scenes in the DB.
 *
 * Run with: pnpm seed-scenes (from apps/web)
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, basename } from 'path'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('❌  Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

// ─── Collect all scene JSON files ─────────────────────────────────────────────

const SCENES_DIR = resolve(__dirname, '../src/content/scenes')

// Slugs to skip (test scenes not shown to users)
const SKIP_SLUGS = new Set(['minimal'])

interface SceneRow {
  id: string
  slug: string
  title: string
  type: string
  scene_json: unknown
  og_image_url: null
  hit_count: number
  created_at: string
}

function collectSceneFiles(dir: string): SceneRow[] {
  const rows: SceneRow[] = []

  function walk(current: string) {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry)
      if (statSync(full).isDirectory()) {
        walk(full)
      } else if (entry.endsWith('.json')) {
        const slug = basename(entry, '.json')
        if (SKIP_SLUGS.has(slug)) continue

        try {
          const raw = readFileSync(full, 'utf-8')
          const json = JSON.parse(raw) as Record<string, unknown>

          if (!json.id || !json.title || !json.type) {
            console.warn(`⚠️  Skipping ${slug}: missing id/title/type`)
            continue
          }

          rows.push({
            id: json.id as string,
            slug,
            title: json.title as string,
            type: json.type as string,
            scene_json: json,
            og_image_url: null,
            hit_count: 0,
            created_at: new Date().toISOString(),
          })
        } catch (err) {
          console.warn(`⚠️  Could not parse ${full}:`, err)
        }
      }
    }
  }

  walk(dir)
  return rows
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  const rows = collectSceneFiles(SCENES_DIR)
  console.log(`🌱  Seeding ${rows.length} static scenes into Supabase scenes table…`)
  rows.forEach((r) => console.log(`     • ${r.slug} (${r.type})`))

  // Delete-then-insert per slug to handle both PK (id) and UNIQUE (slug) conflicts.
  // A simple upsert(onConflict:'slug') fails when a stale row exists with the same id.
  let success = 0
  let failed = 0

  for (const row of rows) {
    try {
      // 1. Fetch existing hit_count so we don't reset it on re-seed
      const { data: existing } = await supabase
        .from('scenes')
        .select('hit_count')
        .eq('slug', row.slug)
        .single()

      const hitCount = existing?.hit_count ?? 0

      // 2. Delete any stale row(s) matching this slug OR this id
      // Both must be cleared: a stale AI-generated scene may have reused the same id
      // with a different slug (e.g., id='hash-tables' slug='hash-tables-abc123')
      await supabase.from('scenes').delete().eq('slug', row.slug)
      await supabase.from('scenes').delete().eq('id', row.id)

      // 3. Insert fresh, preserving hit_count
      const { error } = await supabase
        .from('scenes')
        .insert({ ...row, hit_count: hitCount })

      if (error) {
        console.error(`  ❌ ${row.slug}: ${error.message}`)
        failed++
      } else {
        console.log(`  ✅ ${row.slug}`)
        success++
      }
    } catch (err) {
      console.error(`  ❌ ${row.slug}:`, err)
      failed++
    }
  }

  console.log(`\n🎉  Done: ${success} seeded, ${failed} failed.`)
  console.log(`💡  Run this after updating any scene JSON to keep the DB in sync.`)
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err)
  process.exit(1)
})
