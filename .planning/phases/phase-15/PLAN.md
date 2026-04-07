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
