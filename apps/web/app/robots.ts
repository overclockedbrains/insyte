import type { MetadataRoute } from 'next'
import { SITE } from '@/src/lib/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/profile',
          '/settings',
          '/auth/',
          '/community',
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  }
}
