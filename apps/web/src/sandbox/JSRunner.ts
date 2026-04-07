import type { TraceData } from './types'

interface WorkerResponse {
  steps: TraceData['steps']
  finalResult?: unknown
  error?: string
  truncated?: boolean
}

export class JSRunner {
  private worker: Worker | null = null
  private inFlight = false

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(
        new URL('./workers/js-sandbox.worker.ts', import.meta.url),
        { type: 'module' },
      )
    }
    return this.worker
  }

  private terminateWorker(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.inFlight = false
  }

  execute(code: string, timeout = 5000): Promise<TraceData> {
    if (this.inFlight) {
      return Promise.reject(new Error('JavaScript sandbox is busy.'))
    }

    this.inFlight = true
    const worker = this.getWorker()

    return new Promise<TraceData>((resolve) => {
      const cleanup = () => {
        worker.onmessage = null
        worker.onerror = null
        this.inFlight = false
      }

      const timeoutId = window.setTimeout(() => {
        cleanup()
        this.terminateWorker()
        resolve({
          steps: [],
          error: `Execution timed out after ${timeout}ms.`,
        })
      }, timeout)

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        window.clearTimeout(timeoutId)
        cleanup()
        resolve({
          steps: event.data.steps ?? [],
          finalResult: event.data.finalResult,
          error: event.data.error,
          truncated: event.data.truncated,
        })
      }

      worker.onerror = (event) => {
        window.clearTimeout(timeoutId)
        cleanup()
        this.terminateWorker()
        resolve({
          steps: [],
          error: event.message || 'JavaScript worker failed.',
        })
      }

      worker.postMessage({ code })
    })
  }
}

