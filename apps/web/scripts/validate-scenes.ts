import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { safeParseScene } from '@insyte/scene-engine'

const SCENES_ROOT = path.resolve(process.cwd(), 'src', 'content', 'scenes')
const IGNORED_DIRS = new Set(['test'])

async function collectSceneFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue
      files.push(...(await collectSceneFiles(fullPath)))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath)
    }
  }

  return files
}

function formatIssues(fileName: string, error: { issues: Array<{ path: Array<string | number>; message: string }> }) {
  const details = error.issues
    .map((issue) => {
      const issuePath = issue.path.length > 0 ? issue.path.join('.') : 'root'
      return `${issuePath}: ${issue.message}`
    })
    .join('; ')

  return `✗ ${fileName}: ${details}`
}

async function main() {
  const sceneFiles = (await collectSceneFiles(SCENES_ROOT)).sort()

  if (sceneFiles.length === 0) {
    console.error(`No scene JSON files found under ${SCENES_ROOT}`)
    process.exit(1)
  }

  let hasFailures = false

  for (const sceneFile of sceneFiles) {
    const raw = await readFile(sceneFile, 'utf8')
    const parsedJson = JSON.parse(raw) as unknown
    const result = safeParseScene(parsedJson)
    const fileName = path.relative(SCENES_ROOT, sceneFile).replaceAll('\\', '/')

    if (result.success) {
      console.log(`✓ ${fileName}`)
      continue
    }

    hasFailures = true
    console.error(formatIssues(fileName, result.error))
  }

  console.log(`Validated ${sceneFiles.length} production scene files.`)

  if (hasFailures) {
    process.exit(1)
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Scene validation failed: ${message}`)
  process.exit(1)
})
