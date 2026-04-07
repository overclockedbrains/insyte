import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

function resolvePromptPath(relativePath: string): string {
  const monorepoPath = path.resolve(process.cwd(), 'apps/web/src/ai/prompts', relativePath)
  if (existsSync(monorepoPath)) {
    return monorepoPath
  }
  return path.resolve(process.cwd(), 'src/ai/prompts', relativePath)
}

export function loadPromptMarkdown(relativePath: string): string {
  return readFileSync(resolvePromptPath(relativePath), 'utf8')
}

