---
name: eval-pipeline
description: Evaluates the AI generation pipeline against a suite of hardcoded test cases to catch regressions and validate generation quality. Uses caching to minimize token usage.
---

# `eval-pipeline` Skill

This skill allows the agent to run an automated quality testing loop for the `insyte` AI pipeline. It executes the AI pipeline against 14 curated test topics, caching intermediate stages to save tokens and time.

## 1. When to use this skill
- When the user asks to "test the AI pipeline" or "run the quality loop".
- After you (the agent) have modified prompt files (e.g., `apps/web/src/ai/prompts/builders.ts`) or schemas (e.g., `apps/web/src/ai/schemas.ts`), to ensure your changes didn't break anything.
- To diagnose why a specific primitive type (like `graph` or `tree`) is generating invalid outputs.

## 2. Prerequisites
The dev API server MUST be running. Before starting the evaluation, check if the Next.js dev server is running on `http://localhost:3000`. If it is not running, you (the agent) must start it using the `run_command` tool (e.g., `pnpm dev`) in the background before proceeding.

## 3. How to run the evaluation
You should execute the `scripts/ai-eval.ts` script using `tsx` (which is standard for Next.js repos):
```bash
npx tsx scripts/ai-eval.ts
```

This script will:
- Iterate over the 14 hardcoded test topics.
- Ping `http://localhost:3000/api/dev/pipeline-stage`.
- Write caches to `.eval-cache/`.
- Output a markdown report to `artifacts/ai-eval-report.md`.

## 4. Cache Invalidation (CRITICAL)
The harness is **cache-first**. If a stage succeeds, it saves its output and will NEVER run again unless the cache is deleted.

**CRITICAL RULE: DO NOT delete the `.eval-cache/` directory on the first run.** Always run `npx tsx scripts/ai-eval.ts` FIRST to see what is already cached and what fails. 

Only clear the cache **AFTER** you (the agent) have modified a prompt or schema to fix a failure. You must clear the cache for the modified stage and all subsequent stages.

**Examples of when to clear cache:**
- If you modified `STAGE2_SYSTEM` prompt, delete Stage 2, 3, 4, and 5 caches before running:
  ```bash
  rm -rf .eval-cache/*/stage2.json .eval-cache/*/stage3.json .eval-cache/*/stage4.json .eval-cache/*/stage5.json
  ```
- If you modified `STAGE1_SYSTEM`, you must clear Stage 1, 2, 3, 4, 5.
- Only run `rm -rf .eval-cache/` if the user explicitly asks for a "completely fresh run".

## 5. Interpreting Results and Closing the Loop
1. Run the eval script.
2. If it fails, read `artifacts/ai-eval-report.md` using the `view_file` tool. The report contains detailed error messages.
3. If it's a validation error (e.g., Zod or `validateSteps`), identify *why* the model generated incorrect JSON. Read the prompt (`apps/web/src/ai/prompts/builders.ts`), the schemas, or the `spec.ts` rules to understand the invariant that was broken.
4. Use `multi_replace_file_content` to fix the prompt/schema.
5. **Invalidate the relevant caches using bash.**
6. Re-run `npx tsx scripts/ai-eval.ts`.
7. Iterate until `scripts/ai-eval.ts` passes with exit code 0.
8. NEVER auto-commit. Present the successful evaluation report to the user and explain what fixes you applied.
