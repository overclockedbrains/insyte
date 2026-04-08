#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const SOURCE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.avif'])

function printHelp() {
  console.log(
    [
      'Usage:',
      '  pnpm img:webp -- <input-path> [more-paths...] [--quality 76] [--width 1600] [--out-dir <dir>] [--effort 5] [--recursive] [--overwrite] [--delete-original]',
      '',
      'Examples:',
      '  pnpm img:webp -- apps/web/public/images/simulations/hash_table.png',
      '  pnpm img:webp -- apps/web/public/images/simulations --recursive --quality 80 --width 1920',
      '  pnpm img:webp -- image.png --out-dir apps/web/public/images/optimized --overwrite',
    ].join('\n'),
  )
}

function parseArgs(argv) {
  const options = {
    quality: 76,
    width: null,
    effort: 5,
    outDir: null,
    recursive: false,
    overwrite: false,
    deleteOriginal: false,
    inputs: [],
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === '--help' || arg === '-h') {
      options.help = true
      return options
    }

    if (arg === '--recursive') {
      options.recursive = true
      continue
    }

    if (arg === '--overwrite') {
      options.overwrite = true
      continue
    }

    if (arg === '--delete-original') {
      options.deleteOriginal = true
      continue
    }

    if (arg === '--quality') {
      const value = Number(argv[i + 1])
      if (!Number.isFinite(value) || value < 1 || value > 100) {
        throw new Error('--quality must be a number between 1 and 100')
      }
      options.quality = Math.round(value)
      i += 1
      continue
    }

    if (arg === '--width') {
      const value = Number(argv[i + 1])
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error('--width must be a positive number')
      }
      options.width = Math.round(value)
      i += 1
      continue
    }

    if (arg === '--effort') {
      const value = Number(argv[i + 1])
      if (!Number.isFinite(value) || value < 0 || value > 6) {
        throw new Error('--effort must be a number between 0 and 6')
      }
      options.effort = Math.round(value)
      i += 1
      continue
    }

    if (arg === '--out-dir') {
      const value = argv[i + 1]
      if (!value) {
        throw new Error('--out-dir requires a path')
      }
      options.outDir = path.resolve(value)
      i += 1
      continue
    }

    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`)
    }

    options.inputs.push(path.resolve(arg))
  }

  return options
}

async function loadSharp() {
  try {
    const pkg = await import('sharp')
    return pkg.default ?? pkg
  } catch {
    // Fallback for monorepos where sharp exists only as a transitive pnpm package
    const pnpmDir = path.join(process.cwd(), 'node_modules', '.pnpm')
    if (!fs.existsSync(pnpmDir)) {
      throw new Error(
        'sharp is not installed. Install it with: pnpm add -D sharp',
      )
    }

    const sharpDir = fs
      .readdirSync(pnpmDir)
      .find((entry) => entry.startsWith('sharp@'))

    if (!sharpDir) {
      throw new Error(
        'sharp is not installed. Install it with: pnpm add -D sharp',
      )
    }

    const sharpPath = path.join(
      pnpmDir,
      sharpDir,
      'node_modules',
      'sharp',
      'lib',
      'index.js',
    )

    if (!fs.existsSync(sharpPath)) {
      throw new Error(
        'sharp was found but not resolvable. Install it with: pnpm add -D sharp',
      )
    }

    const pkg = await import(pathToFileURL(sharpPath).href)
    return pkg.default ?? pkg
  }
}

function collectFilesFromDirectory(dirPath, recursive) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      if (recursive) {
        files.push(...collectFilesFromDirectory(entryPath, recursive))
      }
      continue
    }
    if (!entry.isFile()) continue

    const ext = path.extname(entry.name).toLowerCase()
    if (SOURCE_EXTENSIONS.has(ext)) {
      files.push(entryPath)
    }
  }

  return files
}

function resolveInputFiles(inputs, recursive) {
  if (inputs.length === 0) {
    throw new Error('Please provide at least one input path')
  }

  const resolved = []
  for (const input of inputs) {
    if (!fs.existsSync(input)) {
      throw new Error(`Input does not exist: ${input}`)
    }

    const stat = fs.statSync(input)
    if (stat.isDirectory()) {
      resolved.push(...collectFilesFromDirectory(input, recursive))
      continue
    }

    if (!stat.isFile()) {
      continue
    }

    const ext = path.extname(input).toLowerCase()
    if (SOURCE_EXTENSIONS.has(ext)) {
      resolved.push(input)
    } else {
      console.warn(`Skipping unsupported file: ${input}`)
    }
  }

  const unique = [...new Set(resolved)]
  if (unique.length === 0) {
    throw new Error(
      `No convertible files found. Supported extensions: ${[
        ...SOURCE_EXTENSIONS,
      ].join(', ')}`,
    )
  }

  return unique
}

async function convertOne(sharp, input, options) {
  const inputDir = path.dirname(input)
  const outDir = options.outDir ?? inputDir
  const baseName = path.basename(input, path.extname(input))
  const output = path.join(outDir, `${baseName}.webp`)
  const samePath = path.resolve(input) === path.resolve(output)

  if (samePath) {
    throw new Error(`Input and output resolve to the same path: ${input}`)
  }

  if (!options.overwrite && fs.existsSync(output)) {
    throw new Error(
      `Output already exists: ${output}. Use --overwrite to replace it.`,
    )
  }

  fs.mkdirSync(outDir, { recursive: true })

  const transformer = sharp(input)
  const metadata = await transformer.metadata()

  const resizeWidth =
    options.width == null
      ? null
      : Math.min(options.width, metadata.width ?? options.width)

  let pipeline = sharp(input)
  if (resizeWidth != null) {
    pipeline = pipeline.resize({
      width: resizeWidth,
      withoutEnlargement: true,
    })
  }

  await pipeline.webp({ quality: options.quality, effort: options.effort }).toFile(output)

  const sourceSize = fs.statSync(input).size
  const outputSize = fs.statSync(output).size

  if (options.deleteOriginal) {
    fs.unlinkSync(input)
  }

  return {
    input,
    output,
    sourceSize,
    outputSize,
    sourceDimensions: `${metadata.width ?? '?'}x${metadata.height ?? '?'}`,
    outputWidth: resizeWidth ?? metadata.width ?? '?',
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const inputs = resolveInputFiles(args.inputs, args.recursive)
  const sharp = await loadSharp()

  const results = []
  for (const input of inputs) {
    const result = await convertOne(sharp, input, args)
    results.push(result)
  }

  for (const result of results) {
    console.log(
      [
        `${path.basename(result.input)} -> ${path.basename(result.output)}`,
        `  ${formatBytes(result.sourceSize)} -> ${formatBytes(result.outputSize)}`,
        `  ${result.sourceDimensions} -> ${result.outputWidth}w`,
        `  ${result.output}`,
      ].join('\n'),
    )
  }

  const totalSource = results.reduce((sum, result) => sum + result.sourceSize, 0)
  const totalOutput = results.reduce((sum, result) => sum + result.outputSize, 0)
  const saved = Math.max(totalSource - totalOutput, 0)

  console.log('')
  console.log(`Converted: ${results.length} file(s)`)
  console.log(`Total: ${formatBytes(totalSource)} -> ${formatBytes(totalOutput)} (saved ${formatBytes(saved)})`)
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
