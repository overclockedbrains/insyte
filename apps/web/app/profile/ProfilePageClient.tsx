'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Bookmark, Clock, ExternalLink } from 'lucide-react'
import { useBoundStore } from '@/src/stores/store'
import { getBrowserSupabase } from '@/lib/supabase'
import { getUserInitials, getUserAvatarUrl } from '@/lib/auth'
import { GlowEffect } from '@/components/layout/GlowEffect'
import type { User } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedScene {
  scene_slug: string
  saved_at: string
}

interface GeneratedScene {
  id: string
  scene_slug: string | null
  query: string | null
  generated_at: string
}

// ─── ProfilePageClient ────────────────────────────────────────────────────────

export function ProfilePageClient() {
  const router = useRouter()
  const user = useBoundStore((s) => s.user)
  const authLoading = useBoundStore((s) => s.authLoading)
  const openAuthModal = useBoundStore((s) => s.openAuthModal)

  const [savedScenes, setSavedScenes] = useState<SavedScene[]>([])
  const [generatedScenes, setGeneratedScenes] = useState<GeneratedScene[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  // Auth guard: redirect to home with modal if not signed in
  useEffect(() => {
    if (!authLoading && !user) {
      openAuthModal()
      router.push('/')
    }
  }, [authLoading, user, openAuthModal, router])

  // Fetch profile data once user is confirmed
  useEffect(() => {
    if (!user) return

    const supabase = getBrowserSupabase()
    if (!supabase) {
      setDataLoading(false)
      return
    }

    async function fetchData() {
      if (!supabase || !user) return
      setDataLoading(true)
      try {
        const [savedRes, generatedRes] = await Promise.all([
          supabase
            .from('saved_scenes')
            .select('scene_slug, saved_at')
            .eq('user_id', user.id)
            .order('saved_at', { ascending: false }),
          supabase
            .from('user_generated_scenes')
            .select('id, scene_slug, query, generated_at')
            .eq('user_id', user.id)
            .order('generated_at', { ascending: false })
            .limit(20),
        ])

        setSavedScenes(savedRes.data ?? [])
        setGeneratedScenes(generatedRes.data ?? [])
      } finally {
        setDataLoading(false)
      }
    }

    void fetchData()
  }, [user])

  // Loading state while auth is resolving
  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="relative min-h-screen">
      <GlowEffect intensity="subtle" className="fixed" />

      <div className="relative z-10 mx-auto max-w-screen-lg px-4 sm:px-6 py-10 flex flex-col gap-10">

        {/* ── Profile header ──────────────────────────────────────────────── */}
        <ProfileHeader user={user} />

        {/* ── Saved simulations ───────────────────────────────────────────── */}
        <section>
          <SectionHeader
            icon={<Bookmark className="h-4 w-4" />}
            title="Saved Simulations"
            count={savedScenes.length}
          />
          {dataLoading ? (
            <SkeletonGrid count={3} />
            ) : savedScenes.length === 0 ? (
              <EmptyState message="No saved simulations yet. Bookmark one to see it here." />
            ) : (
              <motion.div
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            >
              {savedScenes.map((s) => (
                <SavedCard key={s.scene_slug} slug={s.scene_slug} savedAt={s.saved_at} />
              ))}
            </motion.div>
          )}
        </section>

        {/* ── Generated history ───────────────────────────────────────────── */}
        <section>
          <SectionHeader
            icon={<Clock className="h-4 w-4" />}
            title="Generated History"
            count={generatedScenes.length}
          />
          {dataLoading ? (
            <SkeletonList count={5} />
            ) : generatedScenes.length === 0 ? (
              <EmptyState message="No simulations generated yet. Try typing a concept on the home page." />
            ) : (
            <motion.div
              className="flex flex-col gap-2 mt-4"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
            >
              {generatedScenes.map((g) => (
                <GeneratedRow key={g.id} item={g} />
              ))}
            </motion.div>
          )}
        </section>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProfileHeader({ user }: { user: User }) {
  const initials = getUserInitials(user)
  const avatarUrl = getUserAvatarUrl(user)
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'User'
  const joinedDate = new Date(user.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex items-center gap-5">
      {/* Avatar */}
      <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-primary/30 flex items-center justify-center bg-primary/10 text-primary text-xl font-bold shrink-0">
        {avatarUrl ? (
          <Image src={avatarUrl} alt={initials} width={64} height={64} className="object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-0.5">
        <h1 className="font-headline font-bold text-2xl text-on-surface">{displayName}</h1>
        <p className="text-sm text-on-surface-variant">{user.email}</p>
        <p className="text-xs text-on-surface-variant/60">Joined {joinedDate}</p>
      </div>
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode
  title: string
  count: number
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <h2 className="font-headline font-bold text-lg text-on-surface">{title}</h2>
      {count > 0 && (
        <span className="text-xs font-medium text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  )
}

function SavedCard({ slug, savedAt }: { slug: string; savedAt: string }) {
  const date = new Date(savedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  const title = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
    >
      <Link href={`/s/${slug}`} className="block group">
        <div className="rounded-md border border-outline-variant/20 bg-surface-container-low hover:border-primary/30 hover:bg-surface-container-high transition-colors p-3 flex flex-col gap-1">
          <p className="text-sm font-semibold text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </p>
          <p className="text-xs text-on-surface-variant">Saved {date}</p>
        </div>
      </Link>
    </motion.div>
  )
}

function GeneratedRow({ item }: { item: GeneratedScene }) {
  const date = new Date(item.generated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const displayTitle = item.query
    ? item.query.slice(0, 60) + (item.query.length > 60 ? '…' : '')
    : item.scene_slug ?? 'Unknown'

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, x: -6 }, visible: { opacity: 1, x: 0 } }}
      className="flex items-center justify-between gap-4 p-3 rounded-md border border-outline-variant/10 bg-surface-container-low hover:border-outline-variant/30 transition-colors group"
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-sm font-medium text-on-surface truncate">{displayTitle}</p>
        <p className="text-xs text-on-surface-variant">{date}</p>
      </div>

      {item.scene_slug && (
        <Link
          href={`/s/${item.scene_slug}`}
          className="shrink-0 flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Open</span>
        </Link>
      )}
    </motion.div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-4 px-4 py-8 rounded-md border border-outline-variant/10 bg-surface-container-low/50 text-center">
      <p className="text-sm text-on-surface-variant">{message}</p>
    </div>
  )
}

function SkeletonGrid({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl bg-surface-container animate-pulse" />
      ))}
    </div>
  )
}

function SkeletonList({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-2 mt-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-surface-container animate-pulse" />
      ))}
    </div>
  )
}
