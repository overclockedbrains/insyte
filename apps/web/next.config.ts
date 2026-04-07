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
    return [
      {
        source: '/pyodide/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ]
  },
}

export default withSerwist(nextConfig)
