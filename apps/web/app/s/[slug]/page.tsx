import type { Metadata } from 'next'
import { getAllStaticSlugs, loadStaticScene } from '@/src/lib/scene-loader'
import { extractTopicFromSlug } from '@/src/lib/slug'
import { SITE } from '@/src/lib/config'
import { getCachedScene, incrementHitCount } from '@/lib/supabase'
import { getTopicBySlug } from '@/src/content/topic-index'
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
    const descriptionFromExplanation = scene.steps[0]?.explanation?.body
      ? firstSentence(scene.steps[0].explanation.body)
      : ''

    const description =
      descriptionFromExplanation ||
      scene.description ||
      `Interactive ${scene.type} simulation: ${scene.title}.`

    const canonicalUrl = `${SITE.url}/s/${slug}`

    return {
      title: scene.title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: `${scene.title} — insyte`,
        description,
        type: 'website',
        url: canonicalUrl,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${scene.title} — insyte`,
        description,
      },
    }
  }

  const topic = topicParam?.trim() || extractTopicFromSlug(slug)
  const canonicalUrl = `${SITE.url}/s/${slug}`

  return {
    title: topic,
    description: `AI-generated interactive simulation for "${topic}" on insyte.`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${topic} — insyte`,
      type: 'website',
      url: canonicalUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${topic} — insyte`,
    },
  }
}

export default async function SimulationPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { topic: topicParam, mode, lang } = await searchParams

  const staticScene = await loadStaticScene(slug)
  const cachedScene = staticScene ? null : await getCachedScene(slug)
  const scene = staticScene ?? cachedScene ?? null
  const topic = getTopicBySlug(slug)

  const learningResourceJsonLd =
    scene || topic
      ? {
          '@context': 'https://schema.org',
          '@type': 'LearningResource',
          name: scene?.title ?? topic?.title ?? slug,
          description: scene?.description ?? topic?.description,
          url: `${SITE.url}/s/${slug}`,
          isAccessibleForFree: true,
          learningResourceType: 'Interactive Simulation',
          educationalLevel: 'Intermediate',
          teaches: scene?.title ?? topic?.title,
          provider: {
            '@type': 'Organization',
            name: 'insyte',
            url: SITE.url,
          },
        }
      : null

  const jsonLdScript = learningResourceJsonLd ? (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(learningResourceJsonLd).replace(/</g, '\\u003c'),
      }}
    />
  ) : null

  if (staticScene) {
    await incrementHitCount(slug)
    return (
      <>
        {jsonLdScript}
        <ScenePageClient scene={staticScene} slug={slug} />
      </>
    )
  }

  if (cachedScene) {
    await incrementHitCount(slug)
    return (
      <>
        {jsonLdScript}
        <ScenePageClient scene={cachedScene} slug={slug} />
      </>
    )
  }

  if (mode === 'dsa') {
    const dsaLanguage: 'python' | 'javascript' =
      lang === 'javascript' ? 'javascript' : 'python'
    return (
      <>
        {jsonLdScript}
        <ScenePageClient
          scene={null}
          slug={slug}
          isDSAMode
          dsaLanguage={dsaLanguage}
        />
      </>
    )
  }

  const topicName = topicParam?.trim() || extractTopicFromSlug(slug)
  return (
    <>
      {jsonLdScript}
      <ScenePageClient scene={null} topic={topicName} slug={slug} />
    </>
  )
}
