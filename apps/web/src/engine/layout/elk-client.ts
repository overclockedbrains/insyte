/**
 * ELK layout client — Phase 28.
 *
 * Uses elkjs/lib/elk-api.js directly (NOT elk.bundled.js).
 * elk-api.js spawns its own web worker pointing at elk-worker.min.js;
 * webpack 5 picks up the `new Worker(new URL(...))` pattern and bundles
 * elk-worker.min.js as a separate worker chunk automatically.
 *
 * Why NOT elk.bundled.js inside a custom worker:
 *   elk.bundled.js embeds elk-worker.min.js.  When that file is evaluated in
 *   a worker context (document === undefined), it hijacks self.onmessage for
 *   its own protocol and skips exporting the Worker class.  That leaves
 *   `_Worker = undefined` → "TypeError: _Worker is not a constructor".
 *
 * Why NOT a custom worker wrapper:
 *   We don't need one.  elk-api.js already manages a real web worker.
 *   We just call elk.layout() as a Promise; the computation runs off the main
 *   thread inside elk's own worker.
 */

// elk-api.js is elkjs without the bundled algorithm — it spawns a Worker
// pointed at elk-worker.min.js (bundled separately by webpack 5).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ELKApi = require('elkjs/lib/elk-api.js') as { new(opts: object): { layout(g: object): Promise<object> } }

let elkSingleton: { layout(g: object): Promise<object> } | null = null

function getElk(): { layout(g: object): Promise<object> } {
  if (!elkSingleton) {
    elkSingleton = new ELKApi({
      // Point the worker at elk-worker.min.js.
      // webpack 5 detects the `new Worker(new URL(...))` pattern inside
      // elk-api.js and bundles the algorithm file as a separate worker chunk.
      workerFactory: (_url: unknown) =>
        new Worker(
          new URL('elkjs/lib/elk-worker.min.js', import.meta.url),
          // classic type: elk-worker.min.js is a CommonJS-style script
        ),
    })
  }
  return elkSingleton
}

/**
 * Run an ELK layout computation.
 * The graph must be a valid ELK JSON graph object.
 * Returns a Promise that resolves to the laid-out ELK graph (with x/y, sections).
 */
export function runELKLayout(graph: object): Promise<object> {
  return getElk().layout(graph)
}

/**
 * Pre-warms the ELK worker so the first layout call doesn't stall.
 * Call once when the simulation page loads (if it contains a system-diagram).
 */
export function prewarmELKWorker(): void {
  getElk()  // triggers worker creation + WASM / algorithm init
}
