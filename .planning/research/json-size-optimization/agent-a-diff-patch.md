# Sub-Agent A: Diff / Patch Approaches

> Research track: RFC 6902 JSON Patch, RFC 7396 JSON Merge Patch, game-engine delta
> compression, collaborative-editing diffs — assessed through the lens of one-shot
> LLM generation reliability for the Insyte scene system.

---

## 1. RFC 6902 JSON Patch

### Syntax

RFC 6902 JSON Patch is an array of operation objects. Each operation has exactly
one `op` member (one of `add`, `remove`, `replace`, `move`, `copy`, `test`) and
one `path` member containing a JSON Pointer (RFC 6901). Some ops include `value`.

```json
[
  { "op": "replace", "path": "/components/2/status", "value": "active" },
  { "op": "add",     "path": "/components/2/metadata", "value": { "new": "field" } },
  { "op": "remove",  "path": "/components/0" }
]
```

### LLM Reliability

The "JSON Whisperer" study (arXiv:2510.04717) found LLMs show **unreliable
one-shot performance** generating RFC 6902 patches:

- **Array index arithmetic errors** (most common failure): Removing element at
  index 2 shifts all subsequent indices; models frequently miscalculate these
  shifts or conflate 0-based / 1-based indexing.
- **Fragmentation errors**: Models generate patches for 10 of 15 steps, silently
  omitting updates for steps 8, 12, 15 — state diverges without error.
- **Path expression errors**: Invalid paths like `/components/-1/` or
  non-numeric indices on arrays; typos in object keys (`/componentt/0/opacity`).
- **Op selection errors**: Using `replace` for a non-existent path (fails) or
  `add` when `replace` is required.

Few-shot examples substantially reduce errors, but zero-shot (one-shot) generation
shows "significant accuracy gaps" per the study. Your pipeline is one-shot, no
correction.

### Silent Failures (Pass Schema Validation, Produce Wrong Output)

This is the critical risk for Insyte's no-human-review pipeline:

- **Wrong array index**: `{ "op": "replace", "path": "/components/5/status", "value": "active" }`
  silently applies to the wrong node if the LLM miscounted. Schema-valid; renders
  wrong animation.
- **Typo matches a real key**: `{ "op": "replace", "path": "/style/colour", "value": "#f00" }`
  — if `colour` happens to exist as a field, the operation succeeds silently on
  the wrong property.
- **Atomicity rollback**: RFC 6902 requires atomic application — if any patch in
  the array fails, none are applied. One invalid patch in a 10-operation step
  silently reverts the entire step.
- **Type mismatch with loose schema**: `{ "op": "replace", "path": "/opacity", "value": "0" }`
  (string instead of number) passes validation if the schema is not strict on
  that leaf type.

### Size Analysis

| Scenario | Full Snapshot | RFC 6902 Patch | Reduction |
|----------|--------------|----------------|-----------|
| 15 steps, 1 field changes per step (50 fields) | 15,000 B | ~1,200 B | **92%** |
| 15 steps, 10% of fields change per step | 15,000 B | ~6,000 B | 60% |
| 15 steps, all 50 fields change at least once | 15,000 B | ~60,000 B | **−300% (4× larger)** |

Worst-case expansion is real when steps have high churn (e.g., a graph algorithm
scene where many nodes change colour each step).

---

## 2. RFC 7396 JSON Merge Patch

### Syntax

A partial JSON object describing the desired final state after merging:

```json
{ "components": [ { "status": "active", "metadata": { "new": "field" } } ] }
```

### Comparison to RFC 6902

- **Simpler for LLMs**: No `op` selection, no path expressions. Write the values
  you want to change.
- **Array limitation**: Cannot target a specific array element. Merge Patch
  treats any incoming array as a full replacement — the LLM must re-send the
  entire array even for one-element changes.
- **Null ambiguity**: `{ "field": null }` deletes the field, not sets it to null.
  This is a known silent failure trap.
- **Extra-field contamination**: If the LLM includes an unexpected property,
  Merge Patch adds it to state, potentially corrupting the schema.

### LLM Reliability

Medium. Structurally simpler (no path arithmetic), but the array-replacement
behaviour means a model that writes `"components": []` intending "no change" wipes
all nodes. Realistically 20–40% smaller than RFC 6902 for single-field updates
due to absence of operation metadata.

---

## 3. Game Engine Delta Compression

### Conceptual Model

Game engines (Unity NetCode, Unreal Engine replication) use a three-part model:

1. **Snapshot storage**: Server maintains "last acknowledged state" per client
   and "current world state".
2. **Delta computation**: Per-client diff of what they have seen vs current state.
3. **Selective transmission**: Changed fields only, via compact binary encoding
   with a **bitmask** (one bit per field: 1 = changed, 0 = skip).

### Why This Is Not LLM-Generatable

The bitmask encoding requires precise bit-level manipulation. LLMs hallucinate
this reliably. Unreal's `NetQuantize10` (reducing float precision) and
per-field custom encoders are manual engineering, not generatable text.

The conceptual pattern that IS relevant: **game engines always fall back to full
snapshots periodically** to catch desync. Your prior ISCL approach had the same
delta philosophy, which is why it matched the failure mode.

---

## 4. Collaborative Editing Diffs (Yjs, Automerge, ShareDB)

| Tool | Format | LLM-Generatable? |
|------|--------|-----------------|
| **Yjs** | Binary CRDT with lamport timestamp structs | No |
| **Automerge** | Binary RGA (Replicated Growable Array) | No |
| **ShareDB** | Custom per-data-type patch formats | Depends on format chosen |

All three prioritise binary efficiency and deterministic sync over human
readability. They are not suitable templates for AI generation.

**Key finding from CRDTs**: "If patches are broken out into a series of
operations, the optimized binary representations are discarded" — these formats
are designed for deterministic sync engines, not generative AI.

---

## Summary

**Reliability verdict: LOW** for RFC 6902 in one-shot LLM generation.
**MEDIUM** for RFC 7396 (simpler syntax, fewer error modes, but array limitation
forces full-array replacement).

**Best size reduction achievable**: 92–96% in ideal case (1 field change per
step); 80% realistic (10% fields/step). Worst case: 4× expansion.

**Key risk**: Silent semantic failures. An LLM-generated RFC 6902 patch can pass
schema validation, apply successfully, and produce visually wrong output — wrong
field updated, wrong array index, or atomicity failure rolling back the entire
step. Testing on final visual output is essential; patch syntax validation alone
is insufficient.

---

## Sources

- [RFC 6902 — JavaScript Object Notation (JSON) Patch](https://datatracker.ietf.org/doc/html/rfc6902)
- [RFC 7396 — JSON Merge Patch](https://datatracker.ietf.org/doc/html/rfc7396)
- [JSON Whisperer: Efficient JSON Editing with LLMs (arXiv:2510.04717)](https://arxiv.org/html/2510.04717v1)
- [JSON Patch vs JSON Merge Patch — Zuplo](https://zuplo.com/learning-center/json-patch-vs-merge-patch)
- [State Synchronization — Gaffer on Games](https://gafferongames.com/post/state_synchronization/)
- [Replication in Networked Games Overview](https://0fps.net/2014/02/10/replication-in-networked-games-overview-part-1/)
- [Data Compression — Unity Netcode](https://docs.unity3d.com/Packages/com.unity.netcode@1.4/manual/compression.html)
