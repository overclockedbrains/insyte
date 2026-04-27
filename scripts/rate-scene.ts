import fs from 'fs'
import path from 'path'

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error("Usage: pnpm dlx tsx scripts/rate-scene.ts <path/to/scene.json>")
  process.exit(1)
}

const filePath = path.resolve(args[0])
const content = fs.readFileSync(filePath, 'utf-8')
let scene
try {
  scene = JSON.parse(content)
} catch (e) {
  console.error("Failed to parse JSON:", e)
  process.exit(1)
}

let score = 100
const deductions: string[] = []
const praises: string[] = []

function deduct(points: number, reason: string) {
  score -= points
  deductions.push(`[-${points}] ${reason}`)
}
function praise(reason: string) {
  praises.push(`[+] ${reason}`)
}

console.log(`\n🔍 Rating Scene: ${scene.title || 'Unknown'} (${scene.id || 'No ID'})\n`)

// 1. Primitive Density
const primitives = scene.canvas || []
const sysDiagrams = primitives.filter((p: any) => p.type === 'system-diagram')
if (sysDiagrams.length > 0 && primitives.length > 2) {
  deduct(15, `System diagram combined with ${primitives.length - 1} other primitives. UI canvas may become very cluttered and cramped.`)
}

// 2. Missing Labels
for (const p of primitives) {
  if (['linear', 'map', 'grid', 'chart', 'tree'].includes(p.type) && !p.label) {
    deduct(15, `Primitive '${p.id}' (type: ${p.type}) is missing a 'label'. It will render without a title on the screen.`)
  }
}

// 3. Step Analysis
const steps = scene.steps || []
if (steps.length < 4) {
  deduct(10, `Only ${steps.length} steps. Scene is likely too brief to be educational.`)
} else if (steps.length > 15) {
  deduct(5, `Scene has ${steps.length} steps. This is very long and might lose user attention.`)
} else {
  praise(`Good length: ${steps.length} steps.`)
}

let hasCallout = false
let hasHighlights = false
let stepWithoutAnimation = 0

for (const step of steps) {
  if (step.explanation?.callout) hasCallout = true
  
  const bodyLen = step.explanation?.body?.length || 0
  if (bodyLen > 450) {
    deduct(5, `Step ${step.index} explanation body is over 450 chars (${bodyLen}). Too wordy for UI limits.`)
  }
  
  const hasCanvasUpdates = step.canvas && Object.keys(step.canvas).length > 0
  const hasHudUpdates = step.hud && Object.keys(step.hud).length > 0
  if (!hasCanvasUpdates && !hasHudUpdates && step.index > 1) {
    stepWithoutAnimation++
  }

  // Quick heuristic for highlights
  if (JSON.stringify(step.canvas || {}).includes('"highlight"')) {
    hasHighlights = true
  }
}

if (stepWithoutAnimation > 1) {
  deduct(stepWithoutAnimation * 5, `${stepWithoutAnimation} steps have no visual updates. Missing opportunities for animation.`)
}
if (!hasCallout) {
  deduct(5, `No explanation callouts used in any steps. Missed teaching opportunity.`)
} else {
  praise('Used explanation callouts effectively.')
}
if (!hasHighlights) {
  deduct(10, `No 'highlight' fields used in any step animations. Visuals will look static.`)
} else {
  praise('Used visual highlights to guide user attention.')
}

// 4. Orphaned References
const popups = scene.popups || []
const primitiveIds = new Set(primitives.map((p: any) => p.id))

for (const popup of popups) {
  if (!primitiveIds.has(popup.attachTo) && primitiveIds.size > 0) {
    deduct(10, `Popup attaches to unknown visual ID: '${popup.attachTo}'`)
  }
}

// 5. Challenges Quality
const challenges = scene.challenges || []
if (challenges.length < 2) {
  deduct(5, `Only ${challenges.length} challenges provided. Should provide 3-4.`)
} else {
  praise(`Provided ${challenges.length} interactive challenges.`)
}

// Output
score = Math.max(0, score)
console.log('--- SCORING RESULTS ---')
const color = score >= 90 ? '\x1b[32m' : score >= 75 ? '\x1b[33m' : '\x1b[31m' // Green, Yellow, Red
console.log(`Final Quality Score: ${color}${score}/100\x1b[0m\n`)

if (deductions.length > 0) {
  console.log('⚠️ Deductions:')
  deductions.forEach(d => console.log(`  ${d}`))
} else {
  console.log('🌟 No deductions! Objectively perfect scene structure.')
}

if (praises.length > 0) {
  console.log('\n💡 Strengths:')
  praises.forEach(p => console.log(`  ${p}`))
}
console.log('\n')
