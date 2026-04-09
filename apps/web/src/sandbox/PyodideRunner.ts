import type { TraceData } from './types'

interface WorkerResult {
  steps: TraceData['steps']
  finalResult?: unknown
  error?: string
  truncated?: boolean
}

type WorkerResponse =
  | { type: 'progress'; progress: number; message: string }
  | { type: 'ready' }
  | { type: 'result'; payload: WorkerResult }
  | { type: 'error'; error: string }

const PYTHON_TIMEOUT_MS = 8000
const SANDBOX_BUSY_MESSAGE = 'A sandbox run is already in progress. Please wait for it to finish.'

export class PyodideRunner {
  public isInitialized = false
  public initializationProgress = 0
  public onProgress: ((progress: number, message: string) => void) | null = null

  private worker: Worker | null = null
  private inFlight = false
  private initializationPromise: Promise<void> | null = null
  private progressListeners = new Set<(progress: number, message: string) => void>()
  private pendingInitialization:
    | {
        resolve: () => void
        reject: (error: Error) => void
      }
    | null = null
  private pendingExecution:
    | {
        resolve: (result: TraceData) => void
        timeoutId: number
      }
    | null = null

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./workers/pyodide-sandbox.worker.ts', import.meta.url), {
        type: 'module',
      })
      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(event.data)
      }
      this.worker.onerror = (event) => {
        this.handleWorkerFailure(event.message || 'Python worker failed.')
      }
    }

    return this.worker
  }

  private terminateWorker(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }

    this.inFlight = false
    this.initializationPromise = null
    this.pendingInitialization = null
    this.pendingExecution = null
    this.isInitialized = false
    this.initializationProgress = 0
  }

  subscribeProgress(listener: (progress: number, message: string) => void): () => void {
    this.progressListeners.add(listener)
    return () => {
      this.progressListeners.delete(listener)
    }
  }

  private reportProgress(progress: number, message: string): void {
    this.initializationProgress = progress
    if (this.onProgress) {
      this.onProgress(progress, message)
    }
    for (const listener of this.progressListeners) {
      listener(progress, message)
    }
  }

  private handleWorkerMessage(message: WorkerResponse): void {
    if (message.type === 'progress') {
      this.reportProgress(message.progress, message.message)
      return
    }

    if (message.type === 'ready') {
      this.isInitialized = true
      this.pendingInitialization?.resolve()
      this.pendingInitialization = null
      return
    }

    if (message.type === 'result') {
      const pendingExecution = this.pendingExecution
      if (!pendingExecution) {
        return
      }

      window.clearTimeout(pendingExecution.timeoutId)
      this.pendingExecution = null
      this.inFlight = false

      const result: TraceData = {
        steps: message.payload.steps ?? [],
        finalResult: message.payload.finalResult,
        error: message.payload.error,
        truncated: message.payload.truncated,
      }

      if (result.error) {
        this.terminateWorker()
      }

      pendingExecution.resolve(result)
      return
    }

    this.handleWorkerFailure(message.error)
  }

  private handleWorkerFailure(message: string): void {
    const initReject = this.pendingInitialization?.reject
    const pendingExecution = this.pendingExecution

    if (pendingExecution) {
      window.clearTimeout(pendingExecution.timeoutId)
    }

    this.reportProgress(0, message)
    this.terminateWorker()

    initReject?.(new Error(message))
    pendingExecution?.resolve({ steps: [], error: message })
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = new Promise<void>((resolve, reject) => {
      this.pendingInitialization = { resolve, reject }
      this.getWorker().postMessage({ type: 'initialize' })
    })

    try {
      await this.initializationPromise
    } catch (error) {
      this.terminateWorker()
      throw error
    }
  }

  async execute(code: string, timeout = PYTHON_TIMEOUT_MS): Promise<TraceData> {
    if (this.inFlight) {
      return {
        steps: [],
        error: SANDBOX_BUSY_MESSAGE,
      }
    }

    try {
      await this.initialize()
    } catch (error) {
      return {
        steps: [],
        error: error instanceof Error ? error.message : 'Python execution failed.',
      }
    }

    this.inFlight = true
    const worker = this.getWorker()

    return await new Promise<TraceData>((resolve) => {
      const timeoutId = window.setTimeout(() => {
        if (this.pendingExecution?.resolve !== resolve) {
          return
        }

        this.pendingExecution = null
        this.terminateWorker()
        resolve({
          steps: [],
          error: `Python execution timed out after ${timeout}ms.`,
        })
      }, timeout)

      this.pendingExecution = { resolve, timeoutId }
      worker.postMessage({ type: 'execute', code })
    })
  }
}
