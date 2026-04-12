'use client'

// ELKInitializer — sets the browser-side ELK runner on the layout engine.
//
// This is a 'use client' module, so module-level code only runs in the browser.
// We call setELKRunner() synchronously at evaluation time so that any
// system-diagram scene rendered on first paint already has the runner wired.
//
// Architecture note (Phase 28 fix):
//   We use elk-api.js + workerUrl → elk-worker.min.js, NOT elk.bundled.js.
//   elk.bundled.js embeds elk-worker.min.js; when that file runs in a Worker
//   context, it hijacks self.onmessage and skips exporting its Worker class,
//   leaving _Worker = undefined → "TypeError: _Worker is not a constructor".
//   Using elk-api.js directly lets webpack 5 bundle elk-worker.min.js as a
//   proper worker chunk so ELK computation still runs off the main thread.

import { setELKRunner } from '@insyte/scene-engine'
import { runELKLayout } from './layout/elk-client'

// Wire the ELK runner at module-load time (browser only).
setELKRunner(runELKLayout)

export function ELKInitializer(): null {
  return null
}
