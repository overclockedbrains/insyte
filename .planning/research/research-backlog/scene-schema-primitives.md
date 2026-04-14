# Visual Primitive Design & Scene Schema Evolution

**Tier:** 3  
**Status:** Not yet researched

---

## The Problem

Insyte currently has a fixed set of visual primitives (array, tree, graph, stack, badge, etc.). These were designed incrementally — each primitive was added when a new visualization type was needed. There's no evidence they were designed as a coherent system.

The question: **is the current primitive set the right one?** Could a different decomposition cover more topics with fewer primitives, or cover the same topics more expressively?

This matters because:
1. The AI pipeline must know what primitives exist and how to use them — a poorly designed primitive set makes the AI's job harder
2. Adding new primitives is expensive (renderer code, schema, AI prompt updates)
3. Some primitives might be redundant or better expressed as configurations of a simpler primitive

---

## Why It's Tier 3

This is a long-term architecture question, not an urgent problem. The current primitives work — this is about whether they're optimal. It should only be researched when there's a specific trigger: either "we keep hitting the limits of the current primitives" or "we're about to add 3+ new primitives and should design them as a system."

---

## What Research Likely Exists

**Visualization grammars:**
- **Vega-Lite (Satyanarayan et al., 2016)** — grammar of graphics for data visualization. Shows how a small set of mark types + encodings can cover an enormous range of charts.
- **Observable Plot** — more recent, similar philosophy: marks + channels as a composable system
- **D3** — lower-level, but the mental model (data → visual encoding) is the same

**CS-specific visualization:**
- **JHAVÉ / JSAV** — algorithm visualization frameworks. Their primitive sets are worth studying.
- **AlgoViz.org** — catalog of algorithm visualizations, shows what primitive types appear most frequently across 500+ tools

**Schema design:**
- The Scene JSON schema is essentially a DSL for visual state. Research on visual DSL design (what makes them expressive vs. brittle) would apply.

---

## Questions Research Should Answer

1. **Coverage analysis** — what are the 20 most important CS/algorithm topics insyte should cover? What primitives does each require? Are the current primitives sufficient?
2. **Composability** — can complex visualizations (e.g., hash table = array + linked list) be expressed as compositions of simpler primitives, or does each need its own dedicated primitive?
3. **The "marks + encodings" analogy** — does Vega-Lite's grammar of graphics approach translate to animated algorithm visualization? What would insyte's equivalent grammar look like?
4. **AI friendliness** — which primitive designs are easier for an LLM to reason about and generate correctly? Simple orthogonal primitives vs. feature-rich complex ones?
5. **Schema stability** — what changes to the Scene JSON schema are backwards-compatible vs. breaking? What versioning strategy makes sense?

---

## What a Good Research Output Looks Like

- An honest assessment of the current primitive set: gaps, redundancies, awkward edges
- A proposed "next generation" primitive set if changes are warranted — or confirmation that the current set is right
- Scene JSON schema changes needed to support the revised primitives
- A versioning strategy for the schema
