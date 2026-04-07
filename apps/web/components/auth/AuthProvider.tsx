'use client'

import { useEffect } from 'react'
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

  return <>{children}</>
}
