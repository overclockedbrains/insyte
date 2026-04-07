'use client'

import { useState, useEffect } from 'react'
import { Bookmark } from 'lucide-react'
import { motion } from 'framer-motion'
import { getBrowserSupabase } from '@/lib/supabase'
import { useBoundStore } from '@/src/stores/store'

// ─── BookmarkButton ───────────────────────────────────────────────────────────
// Sits in the Navbar on simulation pages.
// - Not signed in → clicking opens AuthModal
// - Signed in → toggles saved_scenes row, optimistic UI

interface BookmarkButtonProps {
  slug: string
  className?: string
}

export function BookmarkButton({ slug, className }: BookmarkButtonProps) {
  const user = useBoundStore((s) => s.user)
  const openAuthModal = useBoundStore((s) => s.openAuthModal)

  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  // Check initial saved state when user is signed in
  useEffect(() => {
    if (!user || !slug) return
    const supabase = getBrowserSupabase()
    if (!supabase) return

    void supabase
      .from('saved_scenes')
      .select('id')
      .eq('user_id', user.id)
      .eq('scene_slug', slug)
      .maybeSingle()          // returns null (not 406) when no row found
      .then(({ data }) => {
        setSaved(!!data)
      })
  }, [user, slug])

  async function handleToggle() {
    if (!user) {
      openAuthModal()
      return
    }

    const supabase = getBrowserSupabase()
    if (!supabase || loading) return

    // Optimistic update
    const next = !saved
    setSaved(next)
    setLoading(true)

    try {
      if (next) {
        const { error } = await supabase
          .from('saved_scenes')
          .upsert({ user_id: user.id, scene_slug: slug })
        if (error) setSaved(false)
      } else {
        const { error } = await supabase
          .from('saved_scenes')
          .delete()
          .eq('user_id', user.id)
          .eq('scene_slug', slug)
        if (error) setSaved(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.button
      type="button"
      onClick={handleToggle}
      whileTap={{ scale: 0.85 }}
      title={saved ? 'Remove from saved' : 'Save simulation'}
      aria-label={saved ? 'Remove bookmark' : 'Bookmark'}
      disabled={loading}
      className={[
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer disabled:opacity-60',
        saved
          ? 'text-primary bg-primary/10'
          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high',
        className ?? '',
      ].join(' ')}
    >
      <motion.span
        animate={saved ? { scale: [1, 1.3, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Bookmark
          className="h-3.5 w-3.5"
          fill={saved ? 'currentColor' : 'none'}
        />
      </motion.span>
      <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
    </motion.button>
  )
}
