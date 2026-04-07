import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV !== 'production',
  globPublicPatterns: ['**/*', '!pyodide/**/*'],
})

const isProduction = process.env.NODE_ENV === 'production'

function buildContentSecurityPolicy() {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
    "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com https://api.groq.com",
    "worker-src 'self' blob:",
  ].join('; ')
}

function getWorkspaceVersion(): string {
  const candidates = [
    resolve(process.cwd(), '..', '..', 'package.json'),
    resolve(process.cwd(), 'package.json'),
  ]

  for (const packagePath of candidates) {
    if (!existsSync(packagePath)) continue
    try {
      const parsed = JSON.parse(readFileSync(packagePath, 'utf8')) as { version?: string }
      if (parsed.version) return parsed.version
    } catch {
      continue
    }
  }

  return '0.1.0'
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: getWorkspaceVersion(),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    const headers = [
      {
        source: '/pyodide/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ]

    if (isProduction) {
      headers.push({
        source: '/((?!pyodide).*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: buildContentSecurityPolicy(),
          },
        ],
      })
    }

    return headers
  },
  webpack(config) {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
    }

    return config
  },
}

export default withSerwist(nextConfig)
