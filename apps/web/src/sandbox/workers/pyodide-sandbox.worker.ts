/// <reference lib="webworker" />

import type { TraceStep } from '../types'

interface PyodideInstance {
  runPythonAsync: (code: string) => Promise<unknown>
  globals: {
    get: (key: string) => unknown
  }
}

interface PyodideModule {
  loadPyodide: (options: { indexURL: string }) => Promise<PyodideInstance>
}

interface WorkerRequest {
  type: 'initialize' | 'execute'
  code?: string
}

interface WorkerResult {
  steps: TraceStep[]
  finalResult?: unknown
  error?: string
  truncated?: boolean
}

type WorkerResponse =
  | { type: 'progress'; progress: number; message: string }
  | { type: 'ready' }
  | { type: 'result'; payload: WorkerResult }
  | { type: 'error'; error: string }

const PYODIDE_INDEX_URL = '/pyodide/'

let pyodide: PyodideInstance | null = null
let initializationPromise: Promise<PyodideInstance> | null = null

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

function postMessageToMain(message: WorkerResponse): void {
  self.postMessage(message)
}

function postProgress(progress: number, message: string): void {
  postMessageToMain({ type: 'progress', progress, message })
}

async function loadPyodideModule(): Promise<PyodideModule> {
  // @ts-expect-error This public asset is loaded dynamically at runtime inside the worker.
  return (await import(/* webpackIgnore: true */ '/pyodide/pyodide.mjs')) as PyodideModule
}

async function initializePyodide(): Promise<PyodideInstance> {
  if (pyodide) {
    return pyodide
  }

  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = (async () => {
    postProgress(5, 'Loading Python runtime (1/4)...')
    const { loadPyodide } = await loadPyodideModule()

    postProgress(35, 'Initializing Pyodide engine (2/4)...')
    const runtime = await loadPyodide({ indexURL: PYODIDE_INDEX_URL })

    postProgress(70, 'Downloading packages (3/4)...')
    await runtime.runPythonAsync('import math, json, random')

    postProgress(90, 'Preparing execution sandbox (4/4)...')
    await runtime.runPythonAsync('_trace = []\nfinalResult = None')

    pyodide = runtime
    postProgress(100, 'Python runtime ready.')
    return runtime
  })()

  try {
    return await initializationPromise
  } catch (error) {
    pyodide = null
    initializationPromise = null
    throw error
  }
}

async function executePython(code: string): Promise<WorkerResult> {
  try {
    const runtime = await initializePyodide()

    await runtime.runPythonAsync('_trace = []\nfinalResult = None')
    await runtime.runPythonAsync(code)

    const rawTrace = runtime.globals.get('_trace')
    const rawResult = runtime.globals.get('finalResult')

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
      if (pyodide) {
        const rawTrace = pyodide.globals.get('_trace')
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

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    if (event.data.type === 'initialize') {
      await initializePyodide()
      postMessageToMain({ type: 'ready' })
      return
    }

    if (event.data.type === 'execute') {
      const result = await executePython(event.data.code ?? '')
      postMessageToMain({ type: 'result', payload: result })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Python worker failed.'
    postMessageToMain({ type: 'error', error: message })
  }
}

export {}
