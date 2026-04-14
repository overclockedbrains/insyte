# Cognitive Load & Multimedia Learning

**Tier:** 1 — Do First  
**Status:** Not yet researched

---

## The Problem

Mayer's Cognitive Theory of Multimedia Learning (2001, updated 2009, 2020) has 12 evidence-backed principles for educational multimedia. Some of them are almost certainly being violated by insyte right now. Unlike AlgoViz research (which is specific to algorithm animation), this is the foundational science for *any* system that combines visuals + text + narration.

---

## Why It Matters to Insyte

Every stage of insyte's output is affected: what the AI writes in explanations, how many elements appear on screen at once, whether popups help or hurt, how the explanation panel is timed.

The most likely violations to investigate:

**1. The Redundancy Effect**
> Don't show text on screen if the same information is in the explanation panel. Presenting the same content in two modalities simultaneously *hurts* comprehension.

Insyte may be doing this: step labels + explanation panel + popup callouts all saying the same thing.

**2. The Coherence Principle**
> Adding extra interesting-but-irrelevant content (seductive detail) hurts learning. More words, more visuals, more context is not better.

Insyte's AI tends to generate verbose explanations. Research says shorter + focused outperforms longer + thorough.

**3. The Segmenting Principle**
> Learner-paced segments outperform continuous animation. Users should explicitly advance each step, not watch it auto-play.

This conflicts with the current auto-advance default.

**4. The Signaling Principle**
> Highlighting what to look at (arrows, color emphasis) improves learning. Insyte's highlight animations may be doing this correctly — worth confirming.

**5. The Temporal Contiguity Principle**
> Text and the visual it describes must appear at the *same time*, not sequentially.

If insyte shows a step visually and then shows the explanation after a delay, this principle is violated.

---

## What Research Likely Exists

- **Mayer (2009)** — "Multimedia Learning" (2nd ed.) — the canonical reference, 12 principles with meta-analysis behind each
- **Sweller (1988)** — Cognitive Load Theory — the underlying framework
- **Mayer & Moreno (2003)** — "Nine Ways to Reduce Cognitive Load in Multimedia Learning"
- **Recent replications** — Some of Mayer's principles have mixed replication records in online/interactive contexts vs. original video studies. Worth knowing which ones are robust.

---

## What a Good Research Output Looks Like

A checklist of principles with an assessment of whether insyte currently satisfies each one, and specific changes where it doesn't. For example:

| Principle | Insyte Status | Change Needed |
|---|---|---|
| Coherence (less is more) | Likely violated — AI explanations are verbose | Cap explanation body to 2 sentences, add constraint to Stage 2 prompt |
| Signaling (highlight what matters) | Likely satisfied — highlight animations exist | Confirm; no change needed |
| Temporal Contiguity | Unknown — depends on SSE timing | Audit step reveal timing |
| Segmenting | Violated — auto-advance default | Change default to manual advance |

This is the most actionable research area on this list because it produces concrete, specific, cheap-to-implement fixes.
