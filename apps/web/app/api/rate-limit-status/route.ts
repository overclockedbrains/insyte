import type { NextRequest } from 'next/server'
import { getRateLimitStatus } from '@/lib/supabase'

// ─── GET /api/rate-limit-status ───────────────────────────────────────────────
// Read-only check — does NOT increment the counter.
// Returns remaining free-tier AI requests for the current IP this hour.

export async function GET(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const status = await getRateLimitStatus(ip)

  return Response.json(status)
}
