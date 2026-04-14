# Algorithm Visualization Effectiveness (AlgoViz)

**Tier:** 1 — Do First  
**Status:** Not yet researched

---

## The Problem

Insyte's current model: the user hits play, watches the visualization step through, reads the explanation panel. That's it.

The question research will answer: **does watching an animation actually teach anything?**

Early AlgoViz studies (Stasko, Patterson — 1990s) found that passive animation alone produces almost no learning gain over static diagrams. Comprehension only improves meaningfully when learners are:
- Forced to predict the next step before seeing it
- In control of playback (not auto-advancing)
- Actively answering questions tied to specific steps

If this holds, insyte's current passive step-player model is leaving most of its potential learning impact on the table — regardless of how good the AI-generated content is.

---

## Why It Matters to Insyte

This isn't just a UI tweak. The findings would affect:

1. **The step-player interaction model** — should the user predict before advancing? Should auto-play be off by default?
2. **How the AI generates content** — what should the explanation panel say? Should it ask questions or state facts?
3. **Quiz design** — the current quiz is at the end. Research may say step-embedded questions are far more effective.
4. **What the AI prioritizes** — narrating the "why" of each step vs. describing what happened visually.

---

## What Research Likely Exists

- **Stasko & Patterson (1992)** — "Algorithm Animation: Bridging the Gap Between Code and Execution" — original passive vs. interactive study
- **Hundhausen, Douglas, Stasko (2002)** — Meta-study of 24 AlgoViz studies. Key finding: the medium matters less than what the learner *does* with it.
- **Naps et al. (2002)** — "Evaluating the Educational Impact of Visualization" — introduced the "engagement taxonomy" (no viewing → viewing → responding → constructing → presenting)
- **Recent work** — Papers on interactive algorithm visualization in browser environments, JSAV library studies, CS education conferences (SIGCSE, ITiCSE)

---

## What a Good Research Output Looks Like

A set of evidence-backed design constraints, for example:

- "Learner-controlled playback produces X% better retention than auto-advance"
- "Step-embedded prediction questions (before revealing the step) outperform end-of-session quizzes"
- "Explanation text that asks 'what will happen next?' outperforms text that describes what just happened"

These should be specific enough to directly change the step-player component, the quiz generation prompt, and the Stage 2 explanation schema.
