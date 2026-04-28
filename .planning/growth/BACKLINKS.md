# Backlink Strategy — insyte

> **Context**: Phase 36 laid the full SEO foundation (sitemap, structured data, canonical URLs,
> keyword-optimised titles). Backlinks are the next lever — Google uses them as "votes of
> confidence" to determine ranking authority. You can't code your way to them; this is
> distribution work done one simulation at a time.
>
> **Date written**: 2026-04-28

---

## Core Principle

Each simulation page (`/s/hash-tables`, `/s/dns-resolution`, etc.) is a standalone
educational resource that answers a specific search query. Treat each one like a mini
product launch — share it where that topic is discussed, link to the specific `/s/` page
(not the homepage), and let the content do the conversion.

One genuine Hacker News "Show HN" that hits the front page is worth more than 100
directory submissions. Prioritise quality of placement over quantity.

---

## Tier 1 — Free, High-Impact (Do These First)

### Reddit
Post each simulation as a standalone explainer. Don't pitch the product — teach the concept,
link the simulation as the resource.

| Subreddit | Best simulations to post |
|-----------|--------------------------|
| r/learnprogramming | All DSA pages, DNS, Git Branching |
| r/compsci | Hash Tables, Binary Search, Merge Sort |
| r/webdev | JS Event Loop, DNS Resolution |
| r/cscareerquestions | System Design pages (URL Shortener, Chat System) |
| r/leetcode | All DSA pages |

**Post format:** "I built an interactive visualizer for [topic] — here's how [concept] works step
by step." Link to `/s/[slug]`. Do not post the homepage.

### Hacker News
"Show HN: Interactive visualizers for DSA and System Design concepts"

- Target: front page = thousands of visitors + high-authority backlink
- Post on a Tuesday/Wednesday morning (US time) for best visibility
- Link to the explore page or the most impressive single simulation
- Have a few simulations ready to demo in comments

### Dev.to / Hashnode
Write "How X works" articles (e.g. "How DNS Resolution works") with the insyte simulation
embedded or linked as the interactive companion. These articles themselves rank in Google
and link back to insyte.

One article per simulation. Reuse the `description` field from `topicIndex` as the intro.

### Twitter/X Threads
Format: "How does [concept] work? A visual thread 🧵" — screenshot each step of the
simulation, link to the live page at the end. Tag relevant accounts (CS educators, bootcamps).

### LinkedIn
Same content as Twitter but written as a post (no thread format). Performs well with
hiring managers and CS students. System Design simulations (URL Shortener, Chat System,
Consistent Hashing) resonate most here.

---

## Tier 2 — Medium Effort, Durable Links

### GitHub "Awesome" Lists
Submit insyte to curated lists — these are permanent, high-authority links.

Target lists:
- `sindresorhus/awesome` (if accepted, massive authority)
- `donnemartin/system-design-primer`
- `jwasham/coding-interview-university`
- `labuladong/fucking-algorithm`
- Any `awesome-algorithms`, `awesome-dsa`, `awesome-system-design` repo

Approach: open a PR adding insyte as a resource under the relevant section. Keep the
description factual ("interactive step-by-step visualizer, free, no login").

### Stack Overflow / Quora
Answer questions like "What is the best way to visualise how a hash table works?" or
"How can I understand DNS resolution?" — link to the relevant `/s/` page as a resource.
Do not spam; only add the link where it genuinely answers the question.

### CS Educators & Bootcamps
Email instructors who teach data structures or system design. Offer the simulations as
free embeddable resources for their students. A single course page linking to insyte
counts as a backlink.

### Directories & Aggregators
Low effort, moderate value. Submit once, not worth spending more than 30 minutes total.

- Product Hunt (launch properly — prepare assets, ask for upvotes)
- There's An AI For That
- Futurepedia
- AlternativeTo (list as alternative to VisuAlgo, CS Academy)
- toolify.ai

---

## Tier 3 — Longer Term

### Blog on insyte itself (Phase 37)
Write "How does Binary Search work?" as a long-form post on the site with the simulation
embedded. The blog post targets the keyword directly, ranks independently, and the
simulation is the differentiator no other blog post has. Each blog post becomes a backlink
magnet for the simulation page.

One post per high-traffic keyword from the Phase 36 keyword table:
- "How does a hash table work" — 3K–8K/mo
- "How does DNS work" — 10K–20K/mo
- "How does binary search work" — 5K–10K/mo

### Guest Posts
Pitch to dev newsletters that accept guest content:
- TLDR Newsletter
- Bytes.dev (JavaScript Weekly audience)
- JavaScript Weekly
- System Design Newsletter

Offer a "visual explainer" format — something they don't normally publish.

---

## Tracking

Once GSC has 4–8 weeks of data, check:
- **Performance** → which pages are getting impressions but low CTR (title/description fix)
- **Links** → which external sites are already linking (double down on those communities)
- **Coverage** → confirm all 28 pages move from "Discovered" to "Indexed"

No backlink tool needed at this stage — GSC is sufficient until the site has meaningful
traffic.

---

## Execution Order

1. Reddit posts (1 simulation/week, starting with hash-tables or dns-resolution)
2. Hacker News Show HN (prepare, pick the right day)
3. Dev.to articles (1/week, repurpose Reddit post into long form)
4. GitHub awesome list PRs (one afternoon, submit to 5–10 lists)
5. Product Hunt launch (coordinate assets + upvote push)
6. Blog on insyte (Phase 37 — after pipeline fixes are done)
