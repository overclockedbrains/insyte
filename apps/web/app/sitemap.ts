import type { MetadataRoute } from 'next'
import { SITE } from '@/src/lib/config'
import { getAllStaticSlugs } from '@/src/lib/scene-loader'

export default function sitemap(): MetadataRoute.Sitemap {
  const buildDate = new Date()

  const simulationUrls: MetadataRoute.Sitemap = getAllStaticSlugs()
    .filter((slug) => slug !== 'test')
    .map((slug) => ({
      url: `${SITE.url}/s/${slug}`,
      lastModified: buildDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    }))

  return [
    {
      url: SITE.url,
      lastModified: buildDate,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE.url}/explore`,
      lastModified: buildDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE.url}/community/gallery`,
      lastModified: buildDate,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    ...simulationUrls,
  ]
}
