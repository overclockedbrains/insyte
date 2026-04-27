import fs from 'fs/promises'
import path from 'path'

const CACHE_DIR = path.join(process.cwd(), '.eval-cache')
const DEV_API_URL = 'http://localhost:3000/api/dev/pipeline-stage'

// Define the 14 curated topics covering all 7 primitive types
const TEST_SUITE = [
  { id: 'linear-stack', type: 'linear', topic: 'Stack Push and Pop operations' },
  { id: 'linear-binary-search', type: 'linear', topic: 'Binary Search on a sorted array' },
  { id: 'map-two-sum', type: 'map', topic: 'Two Sum using a Hash Map' },
  { id: 'map-lru-cache', type: 'map', topic: 'LRU Cache Eviction Policy' },
  { id: 'tree-bst-insert', type: 'tree', topic: 'Binary Search Tree Insertion' },
  { id: 'tree-trie-search', type: 'tree', topic: 'Trie Word Search' },
  { id: 'graph-dijkstra', type: 'graph', topic: 'Dijkstra\'s Algorithm' },
  { id: 'graph-bfs', type: 'graph', topic: 'Breadth First Search Traversal' },
  { id: 'grid-maze', type: 'grid', topic: 'Maze Pathfinding using DFS' },
  { id: 'grid-dp-knapsack', type: 'grid', topic: '0/1 Knapsack Dynamic Programming' },
  { id: 'chart-quicksort', type: 'chart', topic: 'QuickSort Partitioning' },
  { id: 'chart-frequency', type: 'chart', topic: 'Character Frequency Distribution' },
  { id: 'system-oauth', type: 'system-diagram', topic: 'OAuth 2.0 Authorization Code Flow' },
  { id: 'system-load-balancer', type: 'system-diagram', topic: 'Load Balancer Round Robin Routing' },
]

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true })
}

async function readCache(testId: string, stage: number) {
  const file = path.join(CACHE_DIR, testId, `stage${stage}.json`)
  try {
    const data = await fs.readFile(file, 'utf8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

async function writeCache(testId: string, stage: number, data: unknown) {
  const dir = path.join(CACHE_DIR, testId)
  await fs.mkdir(dir, { recursive: true })
  const file = path.join(dir, `stage${stage}.json`)
  await fs.writeFile(file, JSON.stringify(data, null, 2))
}

async function runStageViaDevApi(stage: number, topic: string, inputs: Record<string, unknown> = {}) {
  let res: globalThis.Response;
  try {
    res = await fetch(DEV_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, topic, inputs })
    })
  } catch (err) {
    throw new Error(`Failed to connect to dev server. Is it running on port 3000? (${err})`)
  }

  if (stage === 0) {
    if (!res.ok) throw new Error(`Stage 0 failed: ${res.statusText}`)
    const text = await res.text()
    const lines = text.split('\n')
    let fullText = ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const payload = JSON.parse(line.slice(6))
          if (payload.type === 'chunk') fullText += payload.text
        } catch { }
      }
    }
    return fullText
  }

  const json = (await res.json()) as Record<string, unknown>
  if (!res.ok || !json.ok) {
    throw new Error(`Stage ${stage} failed: ${json.error || res.statusText}\nCause: ${json.cause || ''}\nRaw: ${json.rawText || ''}`)
  }
  return json.data
}

async function main() {
  await ensureCacheDir()
  console.log(`🚀 Starting AI Pipeline Evaluation (${TEST_SUITE.length} topics)`)
  console.log(`ℹ️ Connecting to Dev API at ${DEV_API_URL}\n`)

  const results = []

  for (const test of TEST_SUITE) {
    console.log(`==================================================`)
    console.log(`🧪 Testing [${test.type}] ${test.topic}`)
    console.log(`==================================================`)

    try {
      // Stage 0
      let reasoning = await readCache(test.id, 0)
      if (!reasoning) {
        console.log(`  [Stage 0] Generating reasoning...`)
        reasoning = await runStageViaDevApi(0, test.topic)
        await writeCache(test.id, 0, reasoning)
      } else {
        console.log(`  [Stage 0] Loaded from cache.`)
      }

      // Stage 1
      let skeleton = await readCache(test.id, 1)
      if (!skeleton) {
        console.log(`  [Stage 1] Generating skeleton...`)
        skeleton = await runStageViaDevApi(1, test.topic, { reasoning })
        await writeCache(test.id, 1, skeleton)
      } else {
        console.log(`  [Stage 1] Loaded from cache.`)
      }

      // Stage 2
      let steps = await readCache(test.id, 2)
      if (!steps) {
        console.log(`  [Stage 2] Generating steps (this may take a while)...`)
        steps = await runStageViaDevApi(2, test.topic, { reasoning, skeleton })
        await writeCache(test.id, 2, steps)
      } else {
        console.log(`  [Stage 2] Loaded from cache.`)
      }

      // Stage 3
      let popups = await readCache(test.id, 3)
      if (!popups) {
        console.log(`  [Stage 3] Generating popups...`)
        popups = await runStageViaDevApi(3, test.topic, { skeleton, steps })
        await writeCache(test.id, 3, popups)
      } else {
        console.log(`  [Stage 3] Loaded from cache.`)
      }

      // Stage 4
      let misc = await readCache(test.id, 4)
      if (!misc) {
        console.log(`  [Stage 4] Generating misc/challenges...`)
        misc = await runStageViaDevApi(4, test.topic, { skeleton, steps })
        await writeCache(test.id, 4, misc)
      } else {
        console.log(`  [Stage 4] Loaded from cache.`)
      }

      // Stage 5
      let assembled = await readCache(test.id, 5)
      if (!assembled) {
        console.log(`  [Stage 5] Assembling scene...`)
        assembled = await runStageViaDevApi(5, test.topic, { skeleton, steps, popups, misc })
        await writeCache(test.id, 5, assembled)
      } else {
        console.log(`  [Stage 5] Loaded from cache.`)
      }

      if (!assembled.ok) {
        throw new Error(`Assembly failed: ${assembled.errors?.join('; ')}`)
      }

      console.log(`✅ [${test.id}] Successfully generated scene!\n`)
      results.push({ test, status: 'success' })

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`❌ [${test.id}] Failed:\n   ${errorMessage.replace(/\\n/g, '\n   ')}\n`)
      results.push({ test, status: 'error', error: errorMessage })
    }
  }

  // Generate Report
  console.log(`📊 Generating Report...`)
  const reportPath = path.join(process.cwd(), 'artifacts', 'ai-eval-report.md')
  let reportData = `# AI Pipeline Evaluation Report\nDate: ${new Date().toISOString()}\n\n`

  const successes = results.filter(r => r.status === 'success')
  const failures = results.filter(r => r.status === 'error')

  reportData += `## Summary\n- Total Tests: ${TEST_SUITE.length}\n- Passed: ${successes.length}\n- Failed: ${failures.length}\n\n`

  if (failures.length > 0) {
    reportData += `## Failures\n`
    for (const fail of failures) {
      reportData += `### ❌ ${fail.test.topic} (${fail.test.type})\n\`\`\`\n${fail.error}\n\`\`\`\n\n`
    }
  }

  reportData += `## Passed\n`
  for (const success of successes) {
    reportData += `- ✅ ${success.test.topic} (${success.test.type})\n`
  }

  await fs.mkdir(path.join(process.cwd(), 'artifacts'), { recursive: true })
  await fs.writeFile(reportPath, reportData)

  console.log(`📄 Report saved to artifacts/ai-eval-report.md`)

  if (failures.length > 0) {
    process.exit(1)
  }
}

main().catch(console.error)
