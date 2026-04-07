/**
 * Seed script: uploads all 24 topic entries to Supabase `topic_index` table.
 * Run with: pnpm seed (from apps/web) or pnpm --filter web seed
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { topicIndex } from '../src/content/topic-index'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local from apps/web root
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error(
    '❌  Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
  )
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

async function seed() {
  console.log(`🌱  Seeding ${topicIndex.length} topics into Supabase topic_index…`)

  const rows = topicIndex.map((t) => ({
    slug: t.slug,
    title: t.title,
    description: t.description,
    category: t.category,
    tags: t.tags,
    type: t.type,
    is_featured: t.isFeatured,
    is_prebuilt: t.isPrebuilt,
    created_at: new Date().toISOString(),
  }))

  const { error, count } = await supabase
    .from('topic_index')
    .upsert(rows, { onConflict: 'slug', count: 'exact' })

  if (error) {
    console.error('❌  Supabase error:', error.message)
    process.exit(1)
  }

  console.log(`✅  Seeded ${count ?? rows.length} topics successfully.`)
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err)
  process.exit(1)
})
