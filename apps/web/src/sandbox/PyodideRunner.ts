import type { TraceData, TraceStep } from './types'

interface PyodideGlobal {
  loadPyodide: (options: { indexURL: string }) => Promise<PyodideInstance>
}

interface PyodideInstance {
  runPythonAsync: (code: string) => Promise<unknown>
  globals: {
    get: (key: string) => unknown
  }
}

const PYODIDE_SCRIPT_ID = 'insyte-pyodide-runtime'

function hasToJs(value: unknown): value is { toJs: (options?: unknown) => unknown } {
  return typeof value === 'object' && value !== null && 'toJs' in value
}

function hasDestroy(value: unknown): value is { destroy: () => void } {
  return typeof value === 'object' && value !== null && 'destroy' in value
}

function toPlainJs(value: unknown): unknown {
  if (!hasToJs(value)) {
    return value
  }
  return value.toJs({
    dict_converter: (entries: Iterable<[string, unknown]>) => Object.fromEntries(entries),
  })
}

async function loadPyodideScript(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Pyodide is only available in the browser.')
  }

  const win = window as Window & Partial<PyodideGlobal>
  if (typeof win.loadPyodide === 'function') {
    return
  }

  const existing = document.getElementById(PYODIDE_SCRIPT_ID) as HTMLScriptElement | null
  if (existing) {
    await new Promise<void>((resolve, reject) => {
      if (typeof win.loadPyodide === 'function') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load pyodide.js')), {
        once: true,
      })
    })
    return
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.id = PYODIDE_SCRIPT_ID
    script.src = '/pyodide/pyodide.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load /pyodide/pyodide.js'))
    document.head.appendChild(script)
  })
}

export class PyodideRunner {
  private static instance: PyodideRunner | null = null

  static getInstance(): PyodideRunner {
    if (!PyodideRunner.instance) {
      PyodideRunner.instance = new PyodideRunner()
    }
    return PyodideRunner.instance
  }

  public isInitialized = false
  public initializationProgress = 0
  public onProgress: ((progress: number, message: string) => void) | null = null

  private pyodide: PyodideInstance | null = null
  private initializationPromise: Promise<void> | null = null
  private progressListeners = new Set<(progress: number, message: string) => void>()

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

  async initialize(): Promise<void> {
    if (this.isInitialized && this.pyodide) {
      return
    }
    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = (async () => {
      this.reportProgress(5, 'Loading Python runtime (1/4)...')
      await loadPyodideScript()

      this.reportProgress(35, 'Initializing Pyodide engine (2/4)...')
      const win = window as unknown as Window & PyodideGlobal
      this.pyodide = await win.loadPyodide({ indexURL: '/pyodide/' })

      this.reportProgress(70, 'Downloading packages (3/4)...')
      await this.pyodide.runPythonAsync('import math, json, random')

      this.reportProgress(90, 'Preparing execution sandbox (4/4)...')
      await this.pyodide.runPythonAsync('_trace = []\nfinalResult = None')

      this.isInitialized = true
      this.reportProgress(100, 'Python runtime ready.')
    })()

    try {
      await this.initializationPromise
    } catch (error) {
      this.initializationPromise = null
      this.isInitialized = false
      this.pyodide = null
      throw error
    }
  }

  async execute(code: string): Promise<TraceData> {
    try {
      await this.initialize()
      if (!this.pyodide) {
        throw new Error('Pyodide failed to initialize.')
      }

      await this.pyodide.runPythonAsync('_trace = []\nfinalResult = None')
      await this.pyodide.runPythonAsync(code)

      const rawTrace = this.pyodide.globals.get('_trace')
      const rawResult = this.pyodide.globals.get('finalResult')

      const steps = (toPlainJs(rawTrace) as TraceStep[] | undefined) ?? []
      const finalResult = toPlainJs(rawResult)
      const truncated = steps.some((step) => step?.step === 'truncated')

      if (hasDestroy(rawTrace)) rawTrace.destroy()
      if (hasDestroy(rawResult)) rawResult.destroy()

      return {
        steps,
        finalResult,
        truncated,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Python execution failed.'

      try {
        if (this.pyodide) {
          const rawTrace = this.pyodide.globals.get('_trace')
          const steps = (toPlainJs(rawTrace) as TraceStep[] | undefined) ?? []
          const truncated = steps.some((step) => step?.step === 'truncated')
          if (hasDestroy(rawTrace)) rawTrace.destroy()
          return { steps, error: message, truncated }
        }
      } catch {
        // Ignore fallback extraction failures.
      }

      return { steps: [], error: message }
    }
  }

  reset(): void {
    if (!this.pyodide) {
      return
    }
    void this.pyodide.runPythonAsync('_trace = []\nfinalResult = None')
  }
}
