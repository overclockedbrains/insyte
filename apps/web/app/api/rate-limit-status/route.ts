import type { NextRequest } from 'next/server'
import { getRateLimitStatus } from '@/lib/supabase'
import { getRequestIp } from '@/lib/server-auth'

// ─── GET /api/rate-limit-status ───────────────────────────────────────────────
// Read-only check — does NOT increment the counter.
// Returns remaining free-tier AI requests for the current IP this hour.

export async function GET(req: NextRequest) {
  const status = await getRateLimitStatus(getRequestIp(req))

  return Response.json(status)
}
