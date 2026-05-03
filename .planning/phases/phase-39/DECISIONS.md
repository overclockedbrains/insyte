# Phase 39 — Design Decisions

Decisions locked through Q&A on 2026-05-03.

---

## Group A — Pipeline Error UX + Observability

**A1. Error surfacing on `/s/[slug]`**
When AI generation fails, show an error card in place of the scene with a human-readable message and a smart retry button. The suggested action text is driven by error type (e.g. overloaded, rate-limited, unknown).

**A2. Auto-retry behavior for 429 / 503**
No automatic retry in backend or frontend code for rate-limit (429) or high-demand (503) responses. UI always shows a manual retry button. The action/suggestion text changes per error type to set correct expectations.

**A3. Observability — deferred**
External tooling decision (Axiom, PostHog, Sentry, etc.) needs a separate discussion. Not in scope for Phase 39.

---

## Group B — Smart Generation Flow

**B-foundation. Page entry**
User submits prompt → lands on `/s/[slug]` instantly. The scene page has a new `pre-gen` state at the front of its state machine (pre-gen → generating → done).

**B1. Mode + questions API**
One lightweight API call fires immediately on page load. Returns `{ mode, questions[] }` together — AI derives mode and generates scoped questions in the same pass. Quick Settings + questions appear on the page as this resolves.

**B2. Wrong mode correction**
Mode is derived silently — no upfront confirmation. A "Change mode?" escape hatch is shown on the pre-gen screen before generation kicks off.

**B3. Pre-generation screen layout**
One screen with two clear sections:
- **Quick Settings** (top) — static selectors, always present
- **A few questions** (below) — AI-generated, mode-scoped, streamed in

**B4. Quick Settings — depth preset**
Single-tap selector: **Quick · Standard · Deep**
Controls step count only. Explanation style is not affected.

**B5. Quick Settings — familiarity**
Single-tap selector framed as *"How familiar are you with this topic?"*
Options: **New to this · Know the basics · Pretty familiar**
Controls explanation language and assumed prior knowledge in the generated scene.

**B6. AI dynamic questions**
Max 3 questions. Topic-specific and scoped to the derived mode.

**B7. Full pre-gen screen summary**
2 static selectors (depth + familiarity) + up to 3 AI questions + "Change mode?" escape hatch + one confirm button → triggers main pipeline.
