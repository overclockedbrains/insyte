import type { NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// ─── GET /auth/callback ───────────────────────────────────────────────────────
// Handles the OAuth code exchange after Google sign-in.
// Supabase sends the user back here with ?code=... after OAuth consent.

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  // Optional next param — where to redirect after successful auth
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
      })

      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        // Successful auth — redirect to the intended destination
        return redirect(`${origin}${next}`)
      }
    }
  }

  // Error or missing code — redirect to home with error indicator
  return redirect(`${origin}/?auth_error=1`)
}
