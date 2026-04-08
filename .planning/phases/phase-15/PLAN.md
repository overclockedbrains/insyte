# Phase 15 — R1 Fixes + UI Tweaks

**Goal:** Clean up rough edges discovered after the R1 launch. This phase is a rolling polish pass for broken UI, inconsistent copy, and small UX issues that should be fixed before deeper R2 feature work.

**Entry criteria:** Phase 14 complete. Production is live and manual smoke checks are passing.

**Status:** In progress as of April 8, 2026.

---

## How This Phase Works

- This is an active tracking document, not a frozen one-time scope.
- Every newly discovered R1 issue or UI inconsistency should be added here before or while it is being fixed.
- Keep tasks small and concrete. Prefer polish, consistency, and bug fixes over net-new feature work.
- If a requested change turns into a larger product capability, move it to a later R2 phase instead of overloading this one.

---

## Current Objectives

### 15.1 — Navigation and naming cleanup
- [x] Remove the duplicate second navbar item and keep `/explore` as the single discovery route
- [x] Standardize docs and product wording to call `/explore` the Explore page
- [ ] Audit remaining UI copy for outdated R1 labels or duplicated navigation concepts

### 15.2 — UI polish queue
- [ ] Landing page visual/copy inconsistencies audit
- [x] Replace the reused landing simulation with a bespoke `Prompt -> Code -> Network -> System` cinematic loop
- [x] Rework the hero animation to use short stage captions instead of overflowing simulation commands
- [x] Make the landing hero motion self-contained and timer-driven so it stays smooth and predictable
- [x] Tighten the cinematic hero layout so captions, chips, nodes, and connectors do not overlap on desktop or small screens
- [x] Remove excessive hero glow so the landing card reads crisp and does not clip shadows inside rounded panels
- [ ] Explore page spacing, row behavior, and search polish audit
- [ ] Simulation page navbar, controls, and overflow audit
- [ ] Settings and BYOK UX polish audit
- [ ] Profile/auth modal polish audit
- [ ] Share, bookmark, toast, and empty-state consistency audit

### 15.3 — Broken experience tracker
- [ ] Log each newly found broken or confusing R1 behavior in this document with a short fix note
- [ ] Add manual verification notes after each fix cluster lands
- [ ] Keep this file current instead of tracking ad hoc issues in chat only

---

## Working Log

### April 8, 2026
- [x] Removed the duplicate second navbar label from the shared navbar config
- [x] Renamed current planning/doc references so `/explore` is consistently treated as the Explore page
- [x] Replaced the landing hash-table demo with a handcrafted four-scene cinematic hero loop
- [x] Built a custom stage cycle for prompt intake, code tracing, network flow, and system assembly
- [x] Removed the old hero dependence on scene-engine playback, popups, and overflowing simulation copy
- [x] Rebuilt the cinematic hero with stricter stage layouts and lane-based connectors to eliminate overlap and small-screen breakage
- [x] Removed the loud purple/blue canvas bloom and replaced clipped glow effects with quieter border/background emphasis
- [x] Matched the hero `Explore` CTA sizing to the footer caption card for a more consistent landing footer rhythm
- [x] Reworked the hero `Code` stage to use a numeric array demo with a matching transformation view instead of abstract fake app-flow code
- [x] Compressed the hero `Code` stage vertically so the snippet and array panels fit cleanly inside the landing card
- [x] Collapsed the hero `Code` stage into a denser single-panel numeric flow to eliminate remaining overflow
- [x] Removed the dynamic hero loader indirection so landing hero edits show up reliably during dev instead of serving stale chunks
- [x] Flattened the hero `Code` stage into a shorter left-to-right numeric transformation so it stays inside the landing card
- [x] Replaced the plain hero `Network` stage pills with a compact routed topology and cleaner SVG connector paths
- [x] Replaced the plain hero `System` stage pills with a compact service architecture diagram that reads like system design
- [x] Reworked the hero `System` stage again to borrow the repo's load-balancer style topology: client -> balancer -> worker fan-out
- [x] Simplified the hero `Prompt` stage into a cleaner prompt card plus brief/output breakdown instead of noisy stacked chips
- [x] Reduced the hero `Code` array flow from three states to two so it fits vertically inside the landing card
- [x] Reworked the hero `Prompt` stage again into a compact demo workflow (input, parsed intent, execution steps) instead of promo-style copy blocks
- [x] Polished network connector routing and stroke intensity so topology paths stay clean and readable inside the fixed hero canvas
- [x] Forced the hero footer caption to single-line with truncation so stage text does not wrap and jitter
- [x] Reworked network connectors to crisp straight lines with subtle packet dots while keeping the same card layout
- [x] Removed the landing input double-border seam so no extra bottom line appears under the hero prompt field
- [x] Centered the network topology block vertically inside the hero stage so the tab no longer looks top-heavy
- [x] Removed landing input focus-jump and reduced focus glow so the field stays stable and avoids a harsh bottom accent line
- [x] Replaced landing input shadow-outline with a plain border-color transition to remove persistent neon bottom edge artifacts
- [x] Replaced motion-driven input border with plain CSS border transition and fully disabled textarea focus ring/shadow to remove residual ghost line
- [x] Added a scoped global focus-visible override for the landing textarea so the app-wide purple accessibility ring no longer draws the bottom ghost line
- [x] Added back a very subtle focus glow on the landing input wrapper for clarity without reintroducing harsh focus artifacts
- [x] Tuned landing input focus glow to use the site's purple+teal accent blend for a cohesive visual style
- [x] Reworked Featured Simulations spacing/sizing to use full-width equal-height cards, removing empty gaps and mismatched last-card height
- [x] Reverted Featured Simulations sizing back to the previous compact layout after review (preferred denser 4-up appearance)
- [x] Normalized Featured card heights (fixed title block + full-height body) so the last card no longer appears shorter
- [x] Tightened Featured section spacing by centering a compact fixed-width desktop card row without changing `/explore` card behavior
- [x] Rebalanced Featured row to full-width desktop occupancy with section-local card width overrides (no `/explore` behavior change)
- [x] Fixed `/explore` hover clipping by giving horizontal topic rows vertical overflow room and padding around cards
- [x] Removed `/explore` card hover scale (lift-only hover) and added extra right scroll padding to eliminate edge clipping
- [x] Removed outer hover glow on `/explore` cards (inset highlight only) and simplified row padding so hover state no longer clips at scroll bounds
- [x] Restored `/explore` outer card glow and fixed clipping properly by adding buffered inner row wrappers inside horizontal scrollers
- [x] Made `/explore` row-level `See all` actions meaningful by wiring them to `?row=` filtering with a `Show all` reset state
- [ ] Add the next discovered R1 fix here before implementation starts

---

## Exit Criteria

- [ ] No duplicate or misleading navigation labels remain in the shipped R1 UI
- [ ] Major R1 surfaces (`/`, `/explore`, `/s/[slug]`, `/settings`, `/profile`) have completed a fresh polish pass
- [ ] Known broken UX issues discovered during R1 usage are either fixed or explicitly deferred
- [ ] This phase document reflects what was fixed and how it was verified

---

## Notes

- Keep scope disciplined. This phase is for R1 polish and correctness, not for large new interaction systems.
- Use this file as the source of truth for ongoing UI fixes until a narrower R2 implementation phase is started.
