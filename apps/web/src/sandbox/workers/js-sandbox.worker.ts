/// <reference lib="webworker" />

import type { TraceStep } from '../types'

interface WorkerRequest {
  code: string
}

interface WorkerResponse {
  steps: TraceStep[]
  finalResult?: unknown
  error?: string
  truncated?: boolean
}

function postResult(payload: WorkerResponse): void {
  self.postMessage(payload)
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { code } = event.data
  const _trace: TraceStep[] = []

  try {
    const runner = new Function(
      '_trace',
      `
      "use strict";
      let finalResult;
      ${code}
      return typeof finalResult === "undefined" ? null : finalResult;
      `,
    ) as (_trace: TraceStep[]) => unknown

    const finalResult = runner(_trace)
    const truncated = _trace.some((step) => step?.step === 'truncated')
    postResult({ steps: _trace, finalResult, truncated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JavaScript execution failed.'
    const truncated = _trace.some((step) => step?.step === 'truncated')
    postResult({ steps: _trace, error: message, truncated })
  }
}

export {}

