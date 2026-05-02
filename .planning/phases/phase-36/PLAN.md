# Phase 36 — SEO Infrastructure

> **Status**: COMPLETE
> **Date**: 2026-04-28
> **Scope**: Full SEO infrastructure for insyte.amanarya.com — sitemap, robots, JSON-LD,
> OG images, canonical URLs, noindex guards, title rewrites, GSC setup.
>
> **Depends on**: Nothing — all file targets are independent of Phase 35
> **Does not block**: Phase 35 (different files entirely)
>
> **Goal**: Get insyte indexed on Google, ranking for algorithm/DSA visualizer keywords,
> and producing correct link previews on social platforms.

---

## 1. Problem Statement

insyte has ~27 pre-built, statically rendered simulation pages — high-quality educational
content that Google has not discovered. The site has:
- No `sitemap.xml` → Google can't enumerate pages
- No `robots.txt` → No crawl guidance
- No structured data → Google can't categorise content type or show rich results
- Weak page titles → Zero keyword ranking potential
- Logo used as OG image → Poor link previews on social (indirectly hurts CTR)
- Private pages (`/profile`, `/settings`, `/dev/*`) not excluded from indexing

This phase installs the full foundation. Once live, Google should index all pages
within 1–2 weeks and ranking signals will start accumulating.

---

## 2. Deliverables

| ID | File | What It Is |
|----|------|-----------|
| SEO-01 | `app/robots.ts` | Robots.txt — allow public, block private routes |
| SEO-02 | `app/sitemap.ts` | Sitemap.xml — all indexable URLs with priority/frequency |
| SEO-03 | `app/opengraph-image.tsx` | Default sitewide OG image (1200×630) |
| SEO-04 | `app/s/[slug]/opengraph-image.tsx` | Per-simulation dynamic OG image |
| SEO-05 | `app/layout.tsx` | Root: title template, canonical, GSC verification, WebApplication JSON-LD |
| SEO-06 | `app/page.tsx` | Homepage: keyword-rich title + description + canonical |
| SEO-07 | `app/explore/page.tsx` | Explore: keyword-rich title + description + canonical + ItemList JSON-LD |
| SEO-08 | `app/s/[slug]/page.tsx` | Scene: canonical in generateMetadata + LearningResource JSON-LD |
| SEO-09 | `app/community/gallery/page.tsx` | Gallery: canonical |
| SEO-10 | `app/profile/page.tsx` | noindex + nofollow |
| SEO-11 | `app/settings/page.tsx` | noindex + nofollow |
| SEO-12 | `app/dev/` pages | noindex + nofollow on all /dev/* pages |
| SEO-13 | `src/lib/config.ts` | Updated `SITE.title` and `SITE.description` |

---

## 3. Implementation — Deliverable by Deliverable

---

### SEO-01 — `app/robots.ts`

**New file.** Uses Next.js `MetadataRoute.Robots` API. Served at `/robots.txt`.

```typescript
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
          '/dev/',
          '/profile',
          '/settings',
          '/auth/',
          '/community',   // redirect page only, no content
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  }
}
```

**Key decisions:**
- `/api/` blocked — endpoints have no SEO value and exposing them leaks internal paths
- `/dev/` blocked — internal tooling pages
- `/profile` and `/settings` blocked — user-private, client-gated
- `/auth/` blocked — login/signup flows (duplicate content risk)
- `/community` (redirect page, not `/community/gallery`) blocked — just redirects, no content
- `/community/gallery` is NOT blocked — it's public and should be indexed
- Do NOT block `/_next/static/` or `/_next/image/` — required for rendering
- `Crawl-delay` not set — Google ignores it; Vercel handles rate limiting at infra level

---

### SEO-02 — `app/sitemap.ts`

**New file.** Generates `/sitemap.xml` dynamically from the static slug registry.

```typescript
import type { MetadataRoute } from 'next'
import { SITE } from '@/src/lib/config'
import { getAllStaticSlugs } from '@/src/lib/scene-loader'

export default function sitemap(): MetadataRoute.Sitemap {
  const buildDate = new Date()

  // Static simulation pages — exclude 'test' (dev-only slug)
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
```

**Key decisions:**
- Homepage priority `1.0` — highest, it's the canonical entry point
- `/explore` priority `0.9` — the catalogue page; high keyword density, high crawl value
- `/community/gallery` priority `0.7`, `changeFrequency: 'daily'` — dynamic content, changes frequently
- Simulation pages priority `0.8` — individually high-value keyword targets
- `test` slug excluded — it's a dev fixture, not real content
- User-generated cached scenes at `/s/<random-slug>` are NOT included — they are dynamic and unpredictable; the sitemap only covers the 26 known hand-crafted simulations

---

### SEO-03 — `app/opengraph-image.tsx`

**New file.** Default sitewide OG image at `/opengraph-image`. Used by pages that don't
have their own (homepage, explore, gallery). Runs on Edge runtime. Renders a branded
dark card 1200×630px.

```typescript
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'insyte — Interactive Visualizer for Algorithms, DSA & System Design'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          background: '#0e0e13',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Gradient accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(to right, #7c6af7, #38bdf8)',
          }}
        />

        {/* Brand name */}
        <div
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#a0a0b8',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '32px',
          }}
        >
          insyte
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: '68px',
            fontWeight: 800,
            color: '#f0f0f8',
            lineHeight: 1.1,
            maxWidth: '900px',
          }}
        >
          Understand any tech concept.
        </div>

        <div
          style={{
            fontSize: '68px',
            fontWeight: 800,
            background: 'linear-gradient(to right, #7c6af7, #38bdf8)',
            backgroundClip: 'text',
            color: 'transparent',
            lineHeight: 1.1,
            marginTop: '8px',
          }}
        >
          By playing with it.
        </div>

        {/* Subtext */}
        <div
          style={{
            fontSize: '26px',
            color: '#6b6b80',
            marginTop: '40px',
          }}
        >
          Interactive simulations for DSA, System Design & CS Concepts
        </div>
      </div>
    ),
    { ...size }
  )
}
```

**Note:** `next/og` only supports a subset of CSS (flexbox only, no grid). Keep styles
inline. Fonts: will use default system sans-serif unless we load a custom font via the
`fonts` option in `ImageResponse` — acceptable for v1.

---

### SEO-04 — `app/s/[slug]/opengraph-image.tsx`

**New file.** Per-simulation OG image. Receives the slug via `params`, loads the topic
entry from `topicIndex`, renders a branded card with the simulation title.

```typescript
import { ImageResponse } from 'next/og'
import { getTopicBySlug } from '@/src/content/topic-index'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const topic = getTopicBySlug(slug)

  const title = topic?.title ?? slug.replace(/-/g, ' ')
  const category = topic?.category ?? 'Interactive Simulation'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          background: '#0e0e13',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Gradient accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(to right, #7c6af7, #38bdf8)',
          }}
        />

        {/* Category badge */}
        <div
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#7c6af7',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '28px',
          }}
        >
          {category}
        </div>

        {/* Simulation title */}
        <div
          style={{
            fontSize: '64px',
            fontWeight: 800,
            color: '#f0f0f8',
            lineHeight: 1.1,
            maxWidth: '950px',
          }}
        >
          {title}
        </div>

        {/* Brand footer */}
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '80px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#6b6b80',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            insyte
          </div>
          <div style={{ color: '#3a3a4a', fontSize: '22px' }}>·</div>
          <div style={{ fontSize: '22px', color: '#6b6b80' }}>
            Interactive Simulation
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
```

**Important:** `getTopicBySlug` is a pure function (no async, no DB call) — safe to
call from Edge runtime. User-generated cached scenes that don't have a `topicIndex`
entry will fall back to the slug title, which is acceptable.

---

### SEO-05 — `app/layout.tsx` changes

**Edit existing file.** Three additions:
1. Title template (so all pages auto-get " — insyte" suffix without manual repetition)
2. Google Search Console verification meta tag
3. WebApplication JSON-LD script

```typescript
export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  // Title template — child pages set just their page name; root fallback is full title
  title: {
    template: '%s — insyte',
    default: 'insyte — Interactive Visualizer for Algorithms, DSA & System Design',
  },
  description: SITE.description,
  // Google Search Console verification
  verification: {
    google: 'GOOGLE_VERIFICATION_CODE_HERE',  // ← replace with real code from GSC
  },
  openGraph: {
    title: 'insyte — Interactive Visualizer for Algorithms, DSA & System Design',
    description: SITE.description,
    type: 'website',
    url: SITE.url,
    siteName: 'insyte',
    // OG image now provided by app/opengraph-image.tsx automatically
  },
  twitter: {
    card: 'summary_large_image',
    title: 'insyte — Interactive Visualizer for Algorithms, DSA & System Design',
    description: SITE.description,
    site: '@insytedotdev',  // add if Twitter/X account exists, otherwise remove
  },
}
```

The WebApplication JSON-LD goes inside `RootLayout`:

```tsx
const webApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'insyte',
  url: SITE.url,
  description: SITE.description,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'Interactive algorithm visualizations',
    'DSA step-by-step simulations',
    'System design diagrams',
    'AI-generated custom simulations',
  ],
}

// In JSX, inside <head> via Next.js Script or directly in <body> before children:
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(webApplicationJsonLd).replace(/</g, '\\u003c'),
  }}
/>
```

Place the script tag inside `<body>` before `{children}` — Next.js will hoist it
into `<head>` correctly via its metadata system.

**Note on `twitter.site`**: Only add if an official @insytedotdev (or similar) Twitter/X
handle exists. Remove the field entirely if not.

---

### SEO-06 — `app/page.tsx` changes

**Edit existing file.** Keyword-rich metadata + canonical.

```typescript
export const metadata: Metadata = {
  title: 'Interactive Visualizer for Algorithms, DSA & System Design',
  // title template in layout.tsx will make this: "Interactive Visualizer... — insyte"
  description:
    'Turn any algorithm, data structure, or system design concept into a live interactive simulation. Play with Binary Search, Hash Tables, DNS, Git, and 20+ more — free.',
  alternates: {
    canonical: SITE.url,
  },
  openGraph: {
    title: 'insyte — Interactive Visualizer for Algorithms, DSA & System Design',
    description:
      'Turn any algorithm or system design concept into a live interactive simulation you can play with.',
    type: 'website',
    url: SITE.url,
    // No images[] needed — falls through to app/opengraph-image.tsx
  },
  twitter: {
    card: 'summary_large_image',
    title: 'insyte — Interactive Visualizer for Algorithms, DSA & System Design',
    description: 'Turn any algorithm or system design concept into a live interactive simulation.',
  },
}
```

**Keyword strategy for homepage:**
- Primary: `interactive algorithm visualizer`, `DSA visualizer`
- Secondary: `system design`, `interactive simulations`, `data structures`
- Long-tail in description: names specific algorithms (Binary Search, Hash Tables, DNS, Git)

---

### SEO-07 — `app/explore/page.tsx` changes

**Edit existing file.** Keyword-rich metadata + canonical + ItemList JSON-LD.

```typescript
export const metadata: Metadata = {
  title: 'Explore Algorithm & DSA Simulations',
  description: `Browse ${totalCount} interactive simulations — Binary Search, Merge Sort, Hash Tables, System Design, and more. Play with algorithms instead of reading about them.`,
  alternates: {
    canonical: `${SITE.url}/explore`,
  },
}
```

Add ItemList JSON-LD inside the page component (use `topicIndex` to generate):

```tsx
const itemListJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'insyte Interactive Simulations',
  description: 'Interactive algorithm and system design simulations',
  numberOfItems: topicIndex.filter(t => t.slug !== 'test').length,
  itemListElement: topicIndex
    .filter((t) => t.slug !== 'test')
    .map((topic, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: topic.title,
      url: `${SITE.url}/s/${topic.slug}`,
    })),
}
```

Note: `totalCount` is already computed at the top of the file from `topicIndex.length`.
Just add the metadata `alternates` field and the JSON-LD script block.

---

### SEO-08 — `app/s/[slug]/page.tsx` changes

**Edit existing file.** Two changes:
1. Add `alternates.canonical` to the existing `generateMetadata` return values
2. Add LearningResource JSON-LD to the server component render

#### Canonical in `generateMetadata`

In both the `if (scene)` branch and the fallback:
```typescript
alternates: {
  canonical: canonicalUrl,  // already computed as `${SITE.url}/s/${slug}`
},
```

#### LearningResource JSON-LD in `SimulationPage`

```tsx
export default async function SimulationPage({ params, searchParams }: Props) {
  const { slug } = await params
  // ...existing logic...

  const topic = getTopicBySlug(slug)
  const scene = staticScene ?? cachedScene ?? null

  const learningResourceJsonLd = scene || topic
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

  return (
    <>
      {learningResourceJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(learningResourceJsonLd).replace(/</g, '\\u003c'),
          }}
        />
      )}
      {/* ...existing JSX... */}
    </>
  )
}
```

Import `getTopicBySlug` at the top of the file.

---

### SEO-09 — `app/community/gallery/page.tsx` changes

**Edit existing file.** Add canonical only.

```typescript
export const metadata: Metadata = {
  title: 'Community Gallery',
  description: 'Browse AI-generated interactive simulations created by the insyte community.',
  alternates: {
    canonical: `${SITE.url}/community/gallery`,
  },
  openGraph: {
    title: 'Community Gallery — insyte',
    description: 'Browse AI-generated interactive simulations created by the insyte community.',
  },
}
```

---

### SEO-10 — `app/profile/page.tsx` changes

**Edit existing file.** Add `robots` noindex.

```typescript
export const metadata: Metadata = {
  title: 'Profile',
  description: 'Your saved simulations and generation history on insyte.',
  robots: {
    index: false,
    follow: false,
  },
}
```

---

### SEO-11 — `app/settings/page.tsx` changes

**Edit existing file.** The `settings/page.tsx` is currently a full client component
that doesn't export `metadata`. Add a server-component shell that exports metadata
and delegates to the existing client component (this is the existing pattern used in
`profile/page.tsx`).

Currently `settings/page.tsx` has `'use client'` at the top. This needs to be split:
- Move the entire existing client code into `app/settings/SettingsPageClient.tsx`
- Make `app/settings/page.tsx` a Server Component that exports metadata and renders `<SettingsPageClient />`

```typescript
// app/settings/page.tsx (new server component shell)
import type { Metadata } from 'next'
import { SettingsPageClient } from './SettingsPageClient'

export const metadata: Metadata = {
  title: 'Settings',
  robots: {
    index: false,
    follow: false,
  },
}

export default function SettingsPage() {
  return <SettingsPageClient />
}
```

The existing `page.tsx` content (all the client code) moves verbatim to `SettingsPageClient.tsx`
with `'use client'` at the top.

---

### SEO-12 — `app/dev/` pages

**Edit existing files.** Three dev pages: `page.tsx`, `pipeline/page.tsx`,
`primitives/page.tsx`. Each needs `robots: { index: false, follow: false }`.

For `app/dev/page.tsx` and `app/dev/pipeline/page.tsx` and `app/dev/primitives/page.tsx`:
Check which are Server Components (can export metadata directly) vs Client Components
(need same shell split as SEO-11). Then add:

```typescript
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}
```

For dev pages that are already client-only with no metadata, a tiny `metadata` export
won't interfere — Next.js merges parent layout metadata with child metadata.

---

### SEO-13 — `src/lib/config.ts` changes

**Edit existing file.** Update `title` and `description` to be keyword-optimised.

```typescript
export const SITE = {
  name: 'insyte',
  tagline: 'See how it works.',
  title: 'insyte — Interactive Visualizer for Algorithms, DSA & System Design',
  description:
    'Turn any algorithm, data structure, or system design concept into a live interactive simulation. Free. No login required.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://insyte.amanarya.com',
} as const
```

`tagline` stays as-is (used in UI, not metadata). `title` and `description` are used
as fallback metadata in `layout.tsx` and across pages that pull from `SITE.*`.

---

## 4. Google Search Console Setup (Manual Steps — Post Deploy)

These steps cannot be automated in code. Do them after the deploy goes live.

**Step 1 — Create GSC Property**
1. Go to https://search.google.com/search-console
2. Click "Add Property"
3. Choose "URL prefix" → enter `https://insyte.amanarya.com`
4. Choose "HTML tag" verification method
5. Copy the `content` attribute value from the provided meta tag (format: `abc123xyz`)

**Step 2 — Add Verification Code to Codebase**
In `app/layout.tsx`, in the `metadata` export:
```typescript
verification: {
  google: 'abc123xyz',  // ← paste your actual code here
},
```
Commit and deploy.

**Step 3 — Verify**
Back in GSC, click "Verify". If deploy is live, it will pass immediately.

**Step 4 — Submit Sitemap**
1. In GSC left nav, click "Sitemaps"
2. Enter `sitemap.xml` in the field
3. Click Submit
4. Confirm it shows "Success" (not "Couldn't fetch")
   - If it shows a fetch error, it's usually a redirect mismatch (www vs non-www)

**Step 5 — Request Indexing for Key Pages**
1. In GSC, use the URL Inspection tool
2. Enter `https://insyte.amanarya.com` → click "Request Indexing"
3. Enter `https://insyte.amanarya.com/explore` → click "Request Indexing"
4. The sitemap will handle the rest automatically over 1–2 weeks

**Optional — Bing Webmaster Tools**
1. Go to https://www.bing.com/webmasters
2. Import from Google Search Console (one-click if GSC is already set up)
3. Submit the same sitemap

---

## 5. Keyword Strategy Summary

### Page-Level Keyword Targets

| Page | H1 / Title Target | Primary Keyword |
|------|------------------|-----------------|
| `/` | "Interactive Visualizer for Algorithms, DSA & System Design" | `algorithm visualizer`, `DSA visualizer` |
| `/explore` | "Explore Algorithm & DSA Simulations" | `interactive simulations`, `algorithm visualizer` |
| `/s/binary-search` | "Binary Search — insyte" | `binary search visualizer`, `how does binary search work` |
| `/s/hash-tables` | "How does a Hash Table work? — insyte" | `hash table visualizer`, `how does hash table work` |
| `/s/dns-resolution` | "How does DNS Resolution work? — insyte" | `how does DNS work`, `DNS visualizer` |
| `/s/merge-sort` | "Merge Sort — insyte" | `merge sort visualizer` |
| `/s/reverse-linked-list` | "Reverse Linked List — insyte" | `linked list visualizer` |

The simulation page titles are already well-formed in `topicIndex` (e.g. "How does a Hash Table
work?", "Binary Search"). The metadata template in SEO-05 (`'%s — insyte'`) handles the brand
suffix automatically.

### What Realistic Ranking Looks Like

Timeline expectations:
- **Week 1–2**: Google crawls sitemap, pages appear in Search Console as discovered
- **Week 3–8**: Pages start appearing in search results (likely page 3–10 initially)
- **Month 2–6**: With no backlinks, expect positions to improve slowly via content signals
- **Month 6+**: Ranking improvement accelerates only with backlinks (blog posts,
  GitHub mentions, social shares). SEO content creation (blog, tutorials) is a
  natural Phase 37 or later.

The structured data, sitemap, and keyword-optimised titles are prerequisites — without
them, no ranking is possible regardless of content quality.

---

## 6. Non-Goals & Explicitly Out of Scope

- `priority` prop on the Navbar logo `<Image>` — the logo is small and not the LCP
  element. Homepage LCP is likely the gradient headline text or first card image.
  Full CWV audit is a separate concern (Phase 37 if needed).
- Removing Framer Motion from `HowItWorks` — this is a client component but runs
  on the client after SSR paint. Not an SEO blocker.
- Per-page keyword research beyond what's documented in §5 — do this after GSC is
  live and shows real impression data.
- Pagination meta (`rel="next"`, `rel="prev"`) on the community gallery — the gallery
  loads more via JS; Google will only index the initial server-rendered batch.
  Acceptable for v1.
- Hreflang / i18n — English only.
- AMP pages — obsolete; Next.js dropped AMP support.

---

## 7. Verification Checklist (Post-Deploy)

After all changes are deployed to production:

- [ ] `https://insyte.amanarya.com/robots.txt` loads and shows correct rules
- [ ] `https://insyte.amanarya.com/sitemap.xml` loads valid XML with 29+ URLs
- [ ] `https://insyte.amanarya.com/opengraph-image` returns a 1200×630 PNG
- [ ] `https://insyte.amanarya.com/s/binary-search` OG image shows "Binary Search" title
- [ ] View source on homepage: contains `<script type="application/ld+json">`
- [ ] View source on `/s/binary-search`: contains `LearningResource` JSON-LD
- [ ] View source on `/profile`: contains `<meta name="robots" content="noindex"`
- [ ] View source on `/settings`: same noindex meta
- [ ] GSC sitemap submission shows "Success"
- [ ] Rich Results Test (search.google.com/test/rich-results) on homepage passes
- [ ] PageSpeed Insights score on homepage — note LCP/CLS/INP baseline values

---

## 8. File Change Summary

```
apps/web/app/
  robots.ts                           NEW
  sitemap.ts                          NEW
  opengraph-image.tsx                 NEW
  layout.tsx                          EDIT (metadata, JSON-LD script)
  page.tsx                            EDIT (metadata)
  explore/page.tsx                    EDIT (metadata, JSON-LD script)
  s/[slug]/page.tsx                   EDIT (canonical in generateMetadata, JSON-LD)
  s/[slug]/opengraph-image.tsx        NEW
  community/gallery/page.tsx          EDIT (metadata canonical)
  profile/page.tsx                    EDIT (robots noindex)
  settings/page.tsx                   REFACTOR (extract to SettingsPageClient.tsx, add metadata)
  settings/SettingsPageClient.tsx     NEW (moved from settings/page.tsx)
  dev/page.tsx                        EDIT (robots noindex)
  dev/pipeline/page.tsx               EDIT (robots noindex)
  dev/primitives/page.tsx             EDIT (robots noindex)

apps/web/src/lib/
  config.ts                           EDIT (SITE.title, SITE.description)
```

Total: 3 new files, 1 refactor (settings), 10 edits. No schema changes, no DB
changes, no package installs required (`next/og` is included with Next.js 13+).
