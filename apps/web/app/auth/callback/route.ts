import type { NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { sanitizeNextPath } from '@/lib/redirect'

// ─── GET /auth/callback ───────────────────────────────────────────────────────
// Handles the OAuth code exchange after Google sign-in.
// Supabase sends the user back here with ?code=... after OAuth consent.

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  // Optional next param — where to redirect after successful auth
  const next = sanitizeNextPath(searchParams.get('next'))

  if (code) {
    const url = new URL('/', origin)
    url.searchParams.set('auth_code', code)
    url.searchParams.set('auth_next', next)
    return redirect(url.toString())
  }

  // Error or missing code — redirect to home with error indicator
  return redirect(`${origin}/?auth_error=1`)
}
