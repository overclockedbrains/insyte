import { JSRunner } from './JSRunner'
import { PyodideRunner } from './PyodideRunner'
import type { SandboxLanguage, TraceData } from './types'

export class SandboxManager {
  private jsRunner = new JSRunner()
  private pyodideRunner = new PyodideRunner()

  get pythonReady(): boolean {
    return this.pyodideRunner.isInitialized
  }

  get pythonInitializationProgress(): number {
    return this.pyodideRunner.initializationProgress
  }

  execute(code: string, language: SandboxLanguage): Promise<TraceData> {
    if (language === 'python') {
      return this.pyodideRunner.execute(code)
    }
    return this.jsRunner.execute(code)
  }

  initializePython(): Promise<void> {
    return this.pyodideRunner.initialize()
  }

  subscribePythonProgress(listener: (progress: number, message: string) => void): () => void {
    return this.pyodideRunner.subscribeProgress(listener)
  }
}

export const sandboxManager = new SandboxManager()
