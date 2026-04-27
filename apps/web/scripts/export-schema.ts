import { buildJsonSchema } from '@insyte/scene-engine'
import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'

const schema = buildJsonSchema()
const outputPath = path.resolve(process.cwd(), 'public', 'scene-schema.json')
fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2) + '\n')
console.log(`✓ Written ${path.relative(process.cwd(), outputPath)}`)
