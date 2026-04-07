import { JSRunner } from './JSRunner'
import { PyodideRunner } from './PyodideRunner'
import type { TraceData } from './types'

export class SandboxManager {
  private jsRunner = new JSRunner()

  execute(code: string, language: 'python' | 'javascript'): Promise<TraceData> {
    if (language === 'python') {
      return PyodideRunner.getInstance().execute(code)
    }
    return this.jsRunner.execute(code)
  }
}

export const sandboxManager = new SandboxManager()

