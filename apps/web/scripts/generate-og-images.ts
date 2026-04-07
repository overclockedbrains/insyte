/**
 * Generate OG images for all 24 pre-built simulations.
 * Fetches /api/og?slug=[slug]&title=...&type=...&category=...
 * Uploads PNGs to Supabase Storage bucket `og-images`
 * Updates scenes.og_image_url and topic_index.og_image_url
 *
 * Run with: pnpm generate-og (from apps/web)
 * Requires the dev server to be running at http://localhost:3000
 */

import { createClient } from '@supabase/supabase-js'
import { topicIndex } from '../src/content/topic-index'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

if (!url || !key) {
  console.error('❌  Missing Supabase env vars')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

async function generateOgImages() {
  // Ensure the og-images bucket exists and is public
  const { data: buckets } = await supabase.storage.listBuckets()
  const hasBucket = buckets?.some((b) => b.name === 'og-images')
  if (!hasBucket) {
    const { error } = await supabase.storage.createBucket('og-images', { public: true })
    if (error) console.warn('⚠️  Could not create og-images bucket:', error.message)
    else console.log('✅  Created og-images bucket')
  }

  let success = 0
  let failed = 0

  for (const topic of topicIndex) {
    try {
      const ogUrl = new URL('/api/og', baseUrl)
      ogUrl.searchParams.set('slug', topic.slug)
      ogUrl.searchParams.set('title', topic.title)
      ogUrl.searchParams.set('type', topic.type)
      ogUrl.searchParams.set('category', topic.category)

      const res = await fetch(ogUrl.toString())
      if (!res.ok) {
        console.warn(`⚠️  OG fetch failed for ${topic.slug}: ${res.status}`)
        failed++
        continue
      }

      const buffer = await res.arrayBuffer()
      const fileName = `${topic.slug}.png`

      const { error: uploadError } = await supabase.storage
        .from('og-images')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: true,
        })

      if (uploadError) {
        console.warn(`⚠️  Upload failed for ${topic.slug}:`, uploadError.message)
        failed++
        continue
      }

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('og-images')
        .getPublicUrl(fileName)

      const publicUrl = publicUrlData.publicUrl

      // Update both tables
      await Promise.all([
        supabase
          .from('topic_index')
          .update({ og_image_url: publicUrl })
          .eq('slug', topic.slug),
        supabase
          .from('scenes')
          .update({ og_image_url: publicUrl })
          .eq('slug', topic.slug),
      ])

      console.log(`✅  ${topic.slug}`)
      success++
    } catch (err) {
      console.warn(`⚠️  Error for ${topic.slug}:`, err)
      failed++
    }
  }

  console.log(`\n🎉  Done: ${success} succeeded, ${failed} failed`)
}

generateOgImages().catch((err) => {
  console.error('❌  Fatal:', err)
  process.exit(1)
})
