# Phase 36 — SEO Audit & Research Context

> **Status**: Pre-plan. This document captures all audit findings, research, and design
> decisions from the Phase 36 scoping session.
>
> **Date recorded**: 2026-04-28
> **Web research basis**: Next.js App Router SEO — 2025 (official Next.js docs + current guides)
> **Previous phase**: Phase 35 (JSON Payload Optimization) — `.planning/phases/phase-35/`

---

## 1. Why Phase 36 Exists

insyte.amanarya.com is not appearing in Google search results despite being live for
weeks. The platform has ~27 statically pre-rendered simulation pages, a well-structured
Next.js 16 App Router codebase, and genuine educational value — but zero SEO
infrastructure. Google cannot discover the site systematically, has no structural data
about what the pages contain, and the page titles are too generic to rank for anything.

This phase fixes all of that. It is purely an SEO infrastructure phase — no new product
features, no UI changes.

---

## 2. Full Codebase Audit (as of 2026-04-28)

### What's Already Good

| Item | Status |
|------|--------|
| `generateStaticParams` on `/s/[slug]` | ✅ All 27 simulation slugs pre-rendered at build |
| `generateMetadata` exports | ✅ Present on all main pages (home, explore, community/gallery, profile, scene) |
| `metadataBase` | ✅ Set in `app/layout.tsx` via `SITE.url` |
| OpenGraph + Twitter card meta | ✅ On every page |
| `next/font` with `display: 'swap'` | ✅ All 3 fonts configured correctly (prevents FOUT) |
| Vercel Analytics | ✅ Integrated in root layout |
| HTTPS / SSL | ✅ Vercel handles |
| Static pre-rendering | ✅ SSG for all simulation pages |
| `next/image` used on cards | ✅ `FeaturedSimulationCard`, `TopicCard`, `Navbar` |

### What's Missing (Blocking Google Discoverability)

| Item | Status | Impact |
|------|--------|--------|
| `app/sitemap.ts` | ❌ Missing | **Critical** — Googlebot can't enumerate all /s/ pages |
| `app/robots.ts` | ❌ Missing | **Critical** — No crawl guidance for any bot |
| JSON-LD structured data | ❌ Missing | High — No rich results possible; Google can't categorise content type |
| Proper OG image (1200×630) | ❌ Using `logo.png` | Medium — Weak social previews hurt CTR |
| `noindex` on private pages | ❌ Missing | Medium — `/settings`, `/profile`, `/dev/*` are being indexed wastefully |
| Canonical `alternates` in metadata | ❌ Missing | Medium — Duplicate content risk (search params, trailing slashes) |
| Google Search Console verification | ❌ Not set up | High — Can't submit sitemap or monitor indexing without this |
| Keyword-rich page titles | ❌ Weak | High — "insyte - See how it works." ranks for nothing |
| `priority` on hero image | ❌ Not set | Medium — Hurts LCP score (hero section) |

### Page Inventory

| Route | Rendered As | Should be Indexed? | Current `noindex`? |
|-------|-------------|--------------------|--------------------|
| `/` | SSG | ✅ Yes | No |
| `/explore` | SSG | ✅ Yes | No |
| `/community/gallery` | Dynamic (force-dynamic) | ✅ Yes | No |
| `/s/[slug]` (27 slugs) | SSG (generateStaticParams) | ✅ Yes | No |
| `/profile` | Client-gated | ❌ No — user private | No (should add) |
| `/settings` | Client-gated | ❌ No — nothing to index | No (should add) |
| `/dev/*` | Dev tools | ❌ No — internal | No (should add) |
| `/auth/*` | Auth flows | ❌ No | No (should add) |
| `/community` (root) | Redirect only | ❌ No | No |

### Static Simulation Slugs (all 27)

```
hash-tables, js-event-loop, load-balancer, dns-resolution, git-branching,
copilot-agent-architecture, two-sum, valid-parentheses, binary-search,
reverse-linked-list, climbing-stairs, merge-sort, level-order-bfs,
number-of-islands, sliding-window-max, fibonacci-recursive, lru-cache,
rate-limiter, min-stack, trie, design-hashmap, url-shortener,
twitter-feed, consistent-hashing, chat-system,
test (excluded — dev only)
```

Plus 1 `test` slug which should be excluded from the sitemap.

### OG Image Problem

Every page currently references `/logo.png` as its OG/Twitter image. This is:
- Not the required 1200×630 dimensions (logo.png is not sized for this)
- Not descriptive per-page (same image for every simulation)
- Not optimised for social link previews

The fix is a dynamic `opengraph-image.tsx` file using `next/og` `ImageResponse` that:
- Renders the simulation title in a branded dark card at 1200×630
- Falls back to a generic brand card for non-simulation pages
- Runs on the Edge runtime (zero cold-start cost)

### Keyword Opportunity (Search Demand Estimate)

The platform is uniquely positioned to rank for high-value educational searches:

| Keyword | Est. Monthly Searches | Page to Target |
|---------|----------------------|----------------|
| algorithm visualizer | 15K–30K | `/explore` |
| DSA visualizer | 5K–10K | `/explore` |
| interactive algorithm visualizer | 3K–5K | `/` (home) |
| how does binary search work | 5K–10K | `/s/binary-search` |
| how does a hash table work | 3K–8K | `/s/hash-tables` |
| how does DNS work | 10K–20K | `/s/dns-resolution` |
| how does git branching work | 5K–10K | `/s/git-branching` |
| how does load balancing work | 3K–5K | `/s/load-balancer` |
| system design visualizer | 2K–5K | `/s/url-shortener`, `/s/chat-system` |
| merge sort visualizer | 2K–4K | `/s/merge-sort` |
| linked list visualizer | 2K–4K | `/s/reverse-linked-list` |

Current title: `"insyte - See how it works."` — ranks for nothing.
Target title: `"insyte — Interactive Visualizer for Algorithms, DSA & System Design"`

### Core Web Vitals Risk Assessment

| Metric | Current Risk | Source |
|--------|-------------|--------|
| LCP | Medium — No `priority` on hero section images | Hero uses gradient text + UnifiedInput, not an image LCP target, but FeaturedSimulationCard images above fold may trigger LCP |
| CLS | Low — `next/font` prevents FOUT; most layout is fixed | Watch: dynamic content in FeaturedSimulations |
| INP | Low — Most interaction is React Server Component rendered HTML | Heavy: Framer Motion on HowItWorks client component |

---

## 3. Technical Research Findings

### Next.js App Router SEO — Key Facts (2025)

- `app/sitemap.ts` exporting `MetadataRoute.Sitemap` is the canonical pattern. Served at `/sitemap.xml`.
- `app/robots.ts` exporting `MetadataRoute.Robots` is the canonical pattern. Served at `/robots.txt`.
- `alternates.canonical` in `generateMetadata` emits `<link rel="canonical">` — must be set per page.
- `app/opengraph-image.tsx` using `ImageResponse` from `next/og` runs on Edge, generates image at `/opengraph-image`. Route-specific images placed at `app/s/[slug]/opengraph-image.tsx`.
- JSON-LD goes into a `<script type="application/ld+json">` tag via `dangerouslySetInnerHTML`. Must escape `<` as `<` to prevent XSS.
- `noindex` via `metadata.robots = { index: false, follow: false }` is the App Router pattern.
- `metadata.verification.google = '<code>'` emits the Google verification meta tag.
- Do NOT disallow `/_next/static/` or `/_next/image/` — these are required for rendering.
- `community/gallery/page.tsx` has `export const dynamic = 'force-dynamic'` — this page will not be statically cached but is still crawlable. Acceptable since gallery content changes frequently.

### JSON-LD Schemas Chosen

**Homepage** (`/`): `WebApplication` — describes the platform itself. Best match for a SaaS tool.
```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "insyte",
  "applicationCategory": "EducationalApplication",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
}
```

**Simulation pages** (`/s/[slug]`): `LearningResource` — directly maps to "interactive simulation for learning a tech concept". Enables Google to surface these pages in educational search queries.
```json
{
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "name": "How does Binary Search work?",
  "learningResourceType": "Interactive Simulation",
  "isAccessibleForFree": true,
  "educationalLevel": "Intermediate"
}
```

**Explore page** (`/explore`): `ItemList` — describes a curated list of simulations. Enables Google to show list rich results.

---

## 4. What This Phase Does NOT Include

- New simulation content
- UI redesign or layout changes
- Performance optimisations beyond adding `priority` to the hero LCP element
- Social media marketing or link building (off-page SEO)
- Blog / content marketing (a separate future phase if needed)
- Paid search (Google Ads)
- i18n / multi-language SEO

---

## 5. External Setup Required (Developer Action, Not Code)

The following must be done manually outside the codebase:

1. **Google Search Console** — Create property for `insyte.amanarya.com`, use HTML meta tag
   verification (code goes into `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` env var or directly
   into `layout.tsx`). Submit sitemap after deploy.

2. **Bing Webmaster Tools** — Optional but free. Same verification flow, different code.

3. **Check robots.txt** — After deploy, verify `https://insyte.amanarya.com/robots.txt` loads
   correctly and `https://insyte.amanarya.com/sitemap.xml` returns valid XML.

4. **Request Indexing** — In GSC, use URL Inspection → Request Indexing on the homepage
   and `/explore` immediately after deploy. Google's crawl queue will eventually reach the
   rest via sitemap.

---

## 6. Dependencies

- Phase 35 (JSON Payload Optimization) — may be in progress in parallel. Phase 36 touches
  completely different files (metadata, OG images, sitemap, robots, layout). No conflicts.
- No database changes required.
- No environment variable changes required (Google verification code will be hardcoded
  into layout.tsx directly — simpler than an env var for a public meta tag).
