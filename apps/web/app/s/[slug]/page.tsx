import type { Metadata } from 'next'
import { getAllStaticSlugs, loadStaticScene } from '@/src/lib/scene-loader'
import { extractTopicFromSlug } from '@/src/lib/slug'
import { SITE } from '@/src/lib/config'
import { getCachedScene, incrementHitCount } from '@/lib/supabase'
import { ScenePageClient } from './ScenePageClient'

export function generateStaticParams() {
  return getAllStaticSlugs().map((slug) => ({ slug }))
}

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ topic?: string; mode?: string; lang?: string }>
}

function stripMarkdown(text: string): string {
  return text
    .replace(/`+/g, ' ')
    .replace(/\*\*/g, ' ')
    .replace(/[_*#>-]/g, ' ')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function firstSentence(text: string): string {
  const plain = stripMarkdown(text)
  const match = plain.match(/(.+?[.!?])(?:\s|$)/)
  return match?.[1] ?? plain
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const { topic: topicParam } = await searchParams

  const staticScene = await loadStaticScene(slug)
  const cachedScene = staticScene ? null : await getCachedScene(slug)
  const scene = staticScene ?? cachedScene ?? null

  if (scene) {
    const descriptionFromExplanation = scene.explanation?.[0]?.body
      ? firstSentence(scene.explanation[0].body)
      : ''

    const description =
      descriptionFromExplanation ||
      scene.description ||
      `Interactive ${scene.type} simulation: ${scene.title}.`

    const ogImage = `${SITE.url}/og-image.png`
    const canonicalUrl = `${SITE.url}/s/${slug}`

    return {
      title: `${scene.title} - insyte`,
      description,
      openGraph: {
        title: `${scene.title} - insyte`,
        description,
        type: 'website',
        url: canonicalUrl,
        images: [ogImage],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${scene.title} - insyte`,
        description,
        images: [ogImage],
      },
    }
  }

  const topic = topicParam?.trim() || extractTopicFromSlug(slug)
  const canonicalUrl = `${SITE.url}/s/${slug}`

  return {
    title: `${topic} - insyte`,
    description: `AI-generated interactive simulation for "${topic}" on insyte.`,
    openGraph: {
      title: `${topic} - insyte`,
      type: 'website',
      url: canonicalUrl,
      images: [`${SITE.url}/og-image.png`],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${topic} - insyte`,
      images: [`${SITE.url}/og-image.png`],
    },
  }
}

export default async function SimulationPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { topic: topicParam, mode, lang } = await searchParams

  const staticScene = await loadStaticScene(slug)
  if (staticScene) {
    incrementHitCount(slug)
    return <ScenePageClient scene={staticScene} slug={slug} />
  }

  const cachedScene = await getCachedScene(slug)
  if (cachedScene) {
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

  const topic = topicParam?.trim() || extractTopicFromSlug(slug)
  return <ScenePageClient scene={null} topic={topic} slug={slug} />
}
