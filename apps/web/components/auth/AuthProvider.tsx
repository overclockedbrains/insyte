'use client'

import { useEffect } from 'react'
import { sanitizeNextPath } from '@/lib/redirect'
import { getBrowserSupabase } from '@/lib/supabase'
import { useBoundStore } from '@/src/stores/store'

/**
 * AuthProvider — mounts once in root layout.
 * Initialises auth state from the existing session,
 * then subscribes to Supabase auth changes for the lifetime of the session.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useBoundStore((s) => s.setSession)
  const setAuthLoading = useBoundStore((s) => s.setAuthLoading)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setAuthLoading(false)
      return
    }

    // Hydrate from existing session on first mount
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Subscribe to future auth events (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [setSession, setAuthLoading])

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase || typeof window === 'undefined') return

    const url = new URL(window.location.href)
    const code = url.searchParams.get('auth_code')
    if (!code) return

    const next = sanitizeNextPath(url.searchParams.get('auth_next'))

    void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      const target = new URL(error ? '/?auth_error=1' : next, window.location.origin)
      window.location.replace(target.toString())
    })
  }, [])

  return <>{children}</>
}
