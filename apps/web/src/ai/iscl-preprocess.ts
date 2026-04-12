/**
 * ISCL pre-processing utilities.
 *
 * These run on the raw LLM output *before* it hits the parser, correcting
 * common model generation errors that are otherwise recoverable.
 */

/**
 * Strip leading/trailing markdown code fences that models sometimes add
 * despite being instructed not to.
 * Handles: ```json ... ```, ```iscl ... ```, and bare ``` ... ```
 */
export function stripCodeFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json|iscl|plaintext)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

/**
 * Pre-processor: re-joins SET continuation lines that models split across multiple lines.
 *
 * The ISCL grammar requires the full STEP body on one line:
 *   STEP N : SET id field=value | SET id field=value
 *
 * LLMs sometimes break long lines, producing any of:
 *   STEP N : SET id field=value |
 *   SET id field=value          ← pipe-split continuation
 *
 *   STEP N : SET id field=value
 *   SET id field=value          ← newline-split continuation
 *
 *   STEP N :
 *   SET id field=value          ← empty-body continuation
 *
 * This function scans every line; when a bare `SET …` line is found it is
 * appended to the previous non-empty/non-comment line with the correct
 * separator (` | ` normally, ` ` when the previous line already ends with `|`
 * or has an empty STEP body).
 */
export function joinStepContinuations(script: string): string {
  const lines = script.split('\n')
  const result: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Pass blank lines and comments through unchanged
    if (!trimmed || trimmed.startsWith('#')) {
      result.push(line)
      continue
    }

    // A bare SET line is always a continuation of the nearest previous STEP
    if (trimmed.startsWith('SET ')) {
      let joined = false
      for (let i = result.length - 1; i >= 0; i--) {
        const prevTrimmed = result[i]!.trim()
        if (!prevTrimmed || prevTrimmed.startsWith('#')) continue

        // Skip init steps — STEP 0 : init cannot have SET clauses.
        // AI sometimes writes SET lines after "STEP 0 : init" by mistake;
        // joining them would create an invalid body "init | SET …".
        if (/STEP\s+\d+\s*:\s*init\s*$/.test(prevTrimmed)) continue

        const prevLine = result[i]!.trimEnd()
        if (prevLine.endsWith(' |') || prevLine.endsWith('|')) {
          // AI already placed a pipe at end of previous line — just append
          result[i] = prevLine + ' ' + trimmed
        } else if (/STEP\s+\d+\s*:\s*$/.test(prevLine)) {
          // STEP N : with no body yet — attach directly after the colon
          result[i] = prevLine + ' ' + trimmed
        } else {
          // Normal multiline continuation — add pipe separator
          result[i] = prevLine + ' | ' + trimmed
        }
        joined = true
        break
      }
      // If we couldn't find a non-init STEP to attach to, drop the stray SET
      // line silently — it was AI noise after an init step.
      if (!joined) continue
      continue
    }

    result.push(line)
  }

  return result.join('\n')
}
