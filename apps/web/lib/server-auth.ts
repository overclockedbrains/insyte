import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { jsonError } from './responses'
import { checkAndIncrementRateLimit } from './supabase'

function getAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient<Database>(url, key, { auth: { persistSession: false } })
}

function getBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice('Bearer '.length).trim()
  return token || null
}

export async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  const token = getBearerToken(req)
  if (!token) return null

  const supabase = getAuthClient()
  if (!supabase) return null

  const { data, error } = await supabase.auth.getUser(token)
  if (error) return null
  return data.user?.id ?? null
}

export function getRequestIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

export async function enforceFreeTierRateLimit(
  req: NextRequest,
  isByok: boolean,
): Promise<Response | null> {
  if (isByok) return null

  const ip = getRequestIp(req)
  const allowed = await checkAndIncrementRateLimit(ip)
  if (!allowed) {
    return jsonError('Rate limit exceeded. Try again later.', 429)
  }

  return null
}
