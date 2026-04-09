# Phase 15 - R1 Fixes + UI Tweaks

**Goal:** Clean up the rough R1 edges found immediately after launch, especially navigation confusion, landing-page polish, and high-visibility UI inconsistencies.

**Entry criteria:** Phase 14 complete. Production is live and manual smoke checks are passing.

**Status:** Completed on April 10, 2026.

---

## Outcome

Phase 15 shipped the high-visibility R1 polish that was actively blocking the post-launch experience:
- duplicate navigation labels were removed
- `/explore` naming and docs were normalized
- the landing hero was rebuilt into a bespoke multi-stage cinematic loop
- featured/explore card sizing and hover behavior were tightened
- the phase operated as the live UI polish tracker until the deeper audit in `.planning/things_to_fix` was ready

The remaining open-ended work from this phase was intentionally split two ways:
- concrete correctness and architecture issues now move into [Phase 16](../phase-16/PLAN.md)
- broad future UX audits stay deferred to a later dedicated R2 UI polish phase

---

## Completed Scope

### 15.1 - Navigation and naming cleanup
- [x] Remove the duplicate second navbar item and keep `/explore` as the single discovery route
- [x] Standardize docs and product wording to call `/explore` the Explore page
- [x] Audit the major R1 naming drift and close the immediate launch blockers

### 15.2 - Delivered UI polish
- [x] Landing page visual and copy inconsistencies audit
- [x] Replace the reused landing simulation with a bespoke `Prompt -> Code -> Network -> System` cinematic loop
- [x] Rework the hero animation so captions, chips, topology, and system cards fit inside the landing shell on desktop and small screens
- [x] Remove excessive hero glow and input-focus artifacts that made the landing card look clipped or noisy
- [x] Normalize below-hero section rhythm, card treatment, and featured row sizing
- [x] Fix `/explore` hover clipping, restore meaningful row actions, and reintroduce desktop row controls cleanly

### 15.3 - Tracking and handoff
- [x] Use this phase as the active source of truth for post-launch R1 polish while fixes were landing
- [x] Roll concrete post-launch bug findings into `.planning/things_to_fix` once the deeper code audit was completed
- [x] Hand off all non-trivial correctness and architectural issues to [Phase 16](../phase-16/PLAN.md)

---

## Working Log

### April 8-10, 2026
- [x] Removed the duplicate shared navbar entry and normalized `/explore` wording across planning/docs
- [x] Replaced the landing hero demo with a purpose-built four-stage cinematic loop
- [x] Reworked the hero stages repeatedly until prompt, code, network, and system layouts fit cleanly without overflow
- [x] Reduced hero glow/focus artifacts and tightened the landing input treatment
- [x] Normalized featured card height, spacing, and section rhythm under the hero
- [x] Fixed `/explore` hover clipping and added meaningful row filtering plus desktop row controls
- [x] Converted the rolling polish tracker into a closed phase and moved the next wave of concrete engineering work into [Phase 16](../phase-16/PLAN.md)

---

## Carry-Forward Decisions

### Moved to Phase 16
- Pyodide, chat-memory, user-history, Supabase integrity, store lifecycle, and other concrete code-level issues from `.planning/things_to_fix`

### Deferred to a later R2 UI polish phase
- remaining broad audits for `/explore`, `/s/[slug]`, `/settings`, `/profile`, and copy consistency that do not yet have concrete defects attached to them

---

## Exit Criteria

- [x] No duplicate or misleading navigation labels remain in the shipped R1 UI
- [x] The most visible post-launch landing and explore issues are fixed
- [x] Known deeper correctness issues are explicitly handed off instead of left inside an open-ended polish phase
- [x] This phase document reflects what shipped and where the remaining work moved

---

## Notes

- Phase 15 is intentionally closed. It should no longer be used as a rolling backlog.
- `.planning/things_to_fix` was the bridge from ad hoc post-launch findings into a concrete engineering phase; [Phase 16](../phase-16/PLAN.md) is now the implementation source of truth for that audit.
