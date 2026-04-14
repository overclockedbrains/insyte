# Research Backlog

Topics identified on April 14, 2026 as candidates for deep research — the same treatment the AI pipeline redesign received (industry papers, prior art, key numbers, concrete design decisions).

Each file contains: what the problem is, why it matters to insyte, what research likely exists, and what a useful output would look like. None of these have been researched yet — these are research briefs, not findings.

---

## Index

| File | Topic | Tier | Why Now |
|---|---|---|---|
| [algoviz-effectiveness.md](algoviz-effectiveness.md) | Algorithm Visualization Effectiveness | 1 — do first | 30-year academic field, directly changes UI + AI prompt design simultaneously |
| [cognitive-load-multimedia.md](cognitive-load-multimedia.md) | Cognitive Load & Multimedia Learning | 1 | Mayer's 12 principles — likely being violated right now, concrete fixes available |
| [layout-engine.md](layout-engine.md) | Layout Engine & Visual Placement | 2 | ELK is on a feature branch, unmerged — active unresolved problem |
| [ai-output-evaluation.md](ai-output-evaluation.md) | AI Output Evaluation & Quality Metrics | 2 | No automated way to know if pipeline output is educationally correct, not just structurally valid |
| [semantic-caching.md](semantic-caching.md) | Semantic Caching | 3 | Already decided to defer — 31% duplicate query rate means real cost savings at scale |
| [scene-schema-primitives.md](scene-schema-primitives.md) | Visual Primitive Design & Scene Schema Evolution | 3 | Is the current primitive set the right one? Visualization grammar research applies |

---

## Tier Definitions

- **Tier 1** — Research-rich area with high direct product impact. Do these first.
- **Tier 2** — Active technical problem with available research. High value but more scoped.
- **Tier 3** — Real but lower urgency. Park here until the product needs it.

---

## How to use this folder

When work begins on any of these topics:
1. Read the brief in the relevant file
2. Do the research (papers, prior art, industry tools)
3. Add a `findings.md` section or a separate file with sources + quotes (like `ai-pipeline-redesign/sources-and-quotes.md`)
4. Update the README with a status marker once research is done
