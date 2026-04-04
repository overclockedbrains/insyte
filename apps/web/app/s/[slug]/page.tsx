import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAllStaticSlugs, loadStaticScene } from '@/src/lib/scene-loader'
import { ScenePageClient } from './ScenePageClient'

// ─── Static params ─────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return getAllStaticSlugs().map((slug) => ({ slug }))
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const scene = await loadStaticScene(slug)

  if (!scene) {
    return {
      title: 'Simulation not found — insyte',
      description: 'This simulation does not exist or has not been generated yet.',
    }
  }

  const description =
    scene.description ??
    `Interactive ${scene.type} simulation: ${scene.title}. Visualize and play with this concept on insyte.`

  return {
    title: `${scene.title} — insyte`,
    description,
    openGraph: {
      title: `${scene.title} — insyte`,
      description,
      type: 'website',
      // og:image wired in Phase 11 via Satori + Supabase Storage
    },
    twitter: {
      card: 'summary_large_image',
      title: `${scene.title} — insyte`,
      description,
    },
  }
}

// ─── Page (Server Component) ───────────────────────────────────────────────────

export default async function SimulationPage({ params }: Props) {
  const { slug } = await params
  const scene = await loadStaticScene(slug)

  if (!scene) {
    notFound()
  }

  return <ScenePageClient scene={scene} slug={slug} />
}
