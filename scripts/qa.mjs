#!/usr/bin/env node

/**
 * Insyte QA Suite
 * A premium command-line runner for Quality Assurance checks.
 */

import { spawn, execSync } from 'node:child_process';
import process from 'node:process';

// --- Configuration ---

const STEPS = [
  { name: 'Install', command: 'pnpm', args: ['install'], color: '\x1b[34m' }, // Blue
  { name: 'Lint', command: 'pnpm', args: ['lint'], color: '\x1b[35m' },    // Magenta
  { name: 'Build', command: 'pnpm', args: ['build'], color: '\x1b[36m' },   // Cyan
  { name: 'Type Check', command: 'pnpm', args: ['type-check'], color: '\x1b[33m' }, // Yellow
  { name: 'Test', command: 'pnpm', args: ['test'], color: '\x1b[32m' },    // Green
];

// --- Constants & Styles ---

const T = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  white: '\x1b[37m',
};

const ICONS = {
  success: `${T.green}✔${T.reset}`,
  failure: `${T.red}✘${T.reset}`,
  pending: `${T.cyan}⧖${T.reset}`,
  skipped: `${T.dim}○${T.reset}`,
  arrow: `${T.dim}→${T.reset}`,
};

// --- Utilities ---

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function getGitContext() {
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return `${branch}@${commit}`;
  } catch {
    return 'development';
  }
}

function printHeader() {
  const context = getGitContext();
  const width = Math.min(process.stdout.columns || 80, 80);
  const internalWidth = width - 2;
  
  const title = 'INSYTE QA SUITE';
  const titlePadding = internalWidth - title.length;
  const titleLeft = Math.floor(titlePadding / 2);
  const titleRight = titlePadding - titleLeft;

  const contextLabelText = ` Context: ${context}`;
  const contextPadding = internalWidth - contextLabelText.length;

  console.log('\n' + T.cyan + T.bold + '┌' + '─'.repeat(internalWidth) + '┐' + T.reset);
  console.log(T.cyan + T.bold + '│' + T.reset + ' '.repeat(titleLeft) + T.bold + title + T.reset + ' '.repeat(titleRight) + T.cyan + T.bold + '│' + T.reset);
  console.log(T.cyan + T.bold + '├' + '─'.repeat(internalWidth) + '┤' + T.reset);
  console.log(T.cyan + T.bold + '│' + T.reset + ` Context: ${T.dim}${context}${T.reset}` + ' '.repeat(Math.max(0, contextPadding)) + T.cyan + T.bold + '│' + T.reset);
  console.log(T.cyan + T.bold + '└' + '─'.repeat(internalWidth) + '┘' + T.reset + '\n');
}

// --- Runner ---

async function runStep(step, dryRun = false) {
  const start = Date.now();
  console.log(`${T.bold}${step.color}[QA]${T.reset} Running ${T.bold}${T.white}${step.name}${T.reset}...`);
  
  if (dryRun) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const duration = Math.floor(Math.random() * 500) + 100;
        resolve({ ...step, code: 0, duration });
      }, 300);
    });
  }

  return new Promise((resolve) => {
    const child = spawn(step.command, step.args, { 
      stdio: 'inherit', 
      shell: process.platform === 'win32'
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - start;
      resolve({ ...step, code, duration });
    });
    
    child.on('error', (err) => {
      console.error(`${T.red}Failed to start ${step.name}:${T.reset}`, err.message);
      resolve({ ...step, code: 1, duration: 0, error: err });
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  printHeader();

  const results = [];
  const globalStart = Date.now();
  let aborted = false;

  // Handle manual interrupts
  process.on('SIGINT', () => {
    aborted = true;
    console.log(`\n\n${T.yellow}⧖ QA aborted by user. Summary will be partial.${T.reset}`);
  });

  for (const step of STEPS) {
    if (aborted) break;
    
    const result = await runStep(step, dryRun);
    results.push(result);
    
    if (result.code !== 0) {
      console.log(`\n${ICONS.failure} ${T.red}${T.bold}${step.name} check failed.${T.reset}`);
      break;
    }
    console.log(`${ICONS.success} ${T.green}${step.name} completed in ${formatDuration(result.duration)}${T.reset}\n`);
  }

  const totalDuration = Date.now() - globalStart;
  printSummary(results, totalDuration, aborted);
}

function printSummary(results, totalDuration, aborted) {
  const width = Math.min(process.stdout.columns || 80, 80);
  const allPassed = results.length === STEPS.length && results.every(r => r.code === 0);

  console.log('\n' + T.bold + 'SUMMARY REPORT' + T.reset);
  console.log('─'.repeat(width));

  for (const step of STEPS) {
    const result = results.find(r => r.name === step.name);
    
    let statusText = '';
    let icon = ICONS.skipped;
    let durationText = '';

    if (result) {
      if (result.code === 0) {
        icon = ICONS.success;
        statusText = `${T.green}PASSED${T.reset}`;
      } else {
        icon = ICONS.failure;
        statusText = `${T.red}FAILED${T.reset}`;
      }
      durationText = `${T.dim}${formatDuration(result.duration)}${T.reset}`;
    } else {
      statusText = aborted ? `${T.yellow}ABORTED${T.reset}` : `${T.dim}SKIPPED${T.reset}`;
    }

    const label = `${icon} ${step.name}`;
    const cleanName = step.name;
    const durationStr = result ? formatDuration(result.duration) : '';
    const dotCount = Math.max(2, width - (cleanName.length + 12 + durationStr.length));
    
    console.log(`${label} ${T.dim}${'.'.repeat(dotCount)}${T.reset} ${statusText} ${durationText}`);
  }

  console.log('─'.repeat(width));
  
  if (allPassed) {
    console.log(`\n${T.bgGreen}${T.white}${T.bold}  PASS  ${T.reset} ${T.green}All quality checks passed in ${formatDuration(totalDuration)}!${T.reset} ✨\n`);
    process.exit(0);
  } else {
    const message = aborted ? 'QA Suite aborted.' : 'QA Suite failed. Please address the issues above.';
    console.log(`\n${T.bgRed}${T.white}${T.bold}  FAIL  ${T.reset} ${T.red}${message}${T.reset}\n`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\nFatal error in QA script:', err);
  process.exit(1);
});
