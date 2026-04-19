import type { NextRequest } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'

export interface CommunityScene {
  slug: string
  title: string
  type: string
  query: string
  hit_count: number
  generated_at: string
}

const PAGE_SIZE = 20

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sort = searchParams.get('sort') === 'popular' ? 'popular' : 'recent'
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10) || 0)

  const supabase = getServerSupabase()
  if (!supabase) {
    return Response.json({ scenes: [], hasMore: false })
  }

  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('user_generated_scenes')
    .select('scene_slug, query, generated_at, scenes(title, type, hit_count)')
    .not('scene_slug', 'is', null)
    .not('query', 'is', null)
    .range(from, to)

  if (sort === 'popular') {
    query = query.order('hit_count', { referencedTable: 'scenes', ascending: false })
  } else {
    query = query.order('generated_at', { ascending: false })
  }

  const { data, error } = await query

  if (error) {
    console.error('[gallery] query failed:', error)
    return Response.json({ scenes: [], hasMore: false }, { status: 500 })
  }

  const scenes: CommunityScene[] = (data ?? [])
    .filter((row) => row.scene_slug && row.scenes)
    .map((row) => {
      const scene = Array.isArray(row.scenes) ? row.scenes[0] : row.scenes
      return {
        slug: row.scene_slug!,
        title: scene?.title ?? row.scene_slug!,
        type: scene?.type ?? 'concept',
        query: row.query!,
        hit_count: scene?.hit_count ?? 0,
        generated_at: row.generated_at,
      }
    })

  return Response.json({ scenes, hasMore: scenes.length === PAGE_SIZE })
}
