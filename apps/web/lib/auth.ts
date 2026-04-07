'use client'

import type { User, Session } from '@supabase/supabase-js'
import { getBrowserSupabase } from './supabase'

// ─── Auth helpers (client-side only) ─────────────────────────────────────────
// All functions use the anon-key browser client.
// Signing in / up with email keeps keys local — never sent to our server.

export type { User, Session }

/**
 * Returns the currently signed-in user, or null if not authenticated.
 */
export async function getUser(): Promise<User | null> {
  const supabase = getBrowserSupabase()
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * Returns the current session (access token + user), or null if not authenticated.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = getBrowserSupabase()
  if (!supabase) return null
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

/**
 * Sign in with Google OAuth.
 * Redirects to Google, then back to /auth/callback.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = getBrowserSupabase()
  if (!supabase) return
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
}

/**
 * Sign in with email + password.
 * Returns an error string on failure, null on success.
 */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<string | null> {
  const supabase = getBrowserSupabase()
  if (!supabase) return 'Supabase not configured'
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error?.message ?? null
}

/**
 * Create a new account with email + password.
 * Returns an error string on failure, null on success.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<string | null> {
  const supabase = getBrowserSupabase()
  if (!supabase) return 'Supabase not configured'
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  return error?.message ?? null
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
  const supabase = getBrowserSupabase()
  if (!supabase) return
  await supabase.auth.signOut()
}

/**
 * Get initials for an avatar from display name or email.
 */
export function getUserInitials(user: User): string {
  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    '?'

  const parts = name.trim().split(/\s+/)
  const first = parts[0] ?? ''
  const last = parts[parts.length - 1] ?? ''
  if (parts.length >= 2 && first && last) {
    return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

/**
 * Get avatar URL (Google profile photo) from user metadata if available.
 */
export function getUserAvatarUrl(user: User): string | null {
  return (
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null
  )
}
