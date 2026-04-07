import type { Metadata } from 'next'
import { getAllStaticSlugs, loadStaticScene } from '@/src/lib/scene-loader'
import { extractTopicFromSlug } from '@/src/lib/slug'
import { getCachedScene, incrementHitCount } from '@/lib/supabase'
import { ScenePageClient } from './ScenePageClient'

// ─── Static params ─────────────────────────────────────────────────────────────
// Only pre-built slugs are statically generated. AI-generated slugs are
// rendered on-demand (ISR / dynamic) and begin streaming on the client.

export function generateStaticParams() {
  return getAllStaticSlugs().map((slug) => ({ slug }))
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ topic?: string; mode?: string; lang?: string }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const { topic: topicParam } = await searchParams

  const scene = await loadStaticScene(slug) ?? await getCachedScene(slug)

  if (scene) {
    const description =
      (scene as { description?: string }).description ??
      `Interactive ${scene.type} simulation: ${scene.title}. Visualize and play with this concept on insyte.`

    return {
      title: `${scene.title} — insyte`,
      description,
      openGraph: {
        title: `${scene.title} — insyte`,
        description,
        type: 'website',
        images: [`/api/og?slug=${encodeURIComponent(slug)}`],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${scene.title} — insyte`,
        description,
        images: [`/api/og?slug=${encodeURIComponent(slug)}`],
      },
    }
  }

  // AI-generated slug — use the topic param or derive from the slug
  const topic = topicParam?.trim() || extractTopicFromSlug(slug)
  return {
    title: `${topic} — insyte`,
    description: `AI-generated interactive simulation for "${topic}" on insyte.`,
    openGraph: {
      title: `${topic} — insyte`,
      type: 'website',
      images: [`/api/og?slug=${encodeURIComponent(slug)}`],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${topic} — insyte`,
      images: [`/api/og?slug=${encodeURIComponent(slug)}`],
    },
  }
}

// ─── Page (Server Component) ───────────────────────────────────────────────────

export default async function SimulationPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { topic: topicParam, mode, lang } = await searchParams

  // 1. Try pre-built static scene
  const staticScene = await loadStaticScene(slug)
  if (staticScene) {
    // Fire hit count increment (static scenes also count as views)
    incrementHitCount(slug)
    return <ScenePageClient scene={staticScene} slug={slug} />
  }

  // 2. Try Supabase cache (AI-generated scenes from previous visits)
  const cachedScene = await getCachedScene(slug)
  if (cachedScene) {
    // Fire hit count increment for cached scenes
    incrementHitCount(slug)
    return <ScenePageClient scene={cachedScene} slug={slug} />
  }

  if (mode === 'dsa') {
    const dsaLanguage: 'python' | 'javascript' =
      lang === 'javascript' ? 'javascript' : 'python'
    return (
      <ScenePageClient
        scene={null}
        slug={slug}
        isDSAMode
        dsaLanguage={dsaLanguage}
      />
    )
  }

  // 3. AI-generated slug — extract topic and start streaming on the client
  const topic = topicParam?.trim() || extractTopicFromSlug(slug)
  return <ScenePageClient scene={null} topic={topic} slug={slug} />
}
