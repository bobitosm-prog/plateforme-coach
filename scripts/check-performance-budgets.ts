import { readFileSync } from 'node:fs'
import { checkPerformanceBudgets } from '../lib/performance/budgets/index.ts'

const defaults = ['perf/baseline/phase-8-baseline-run-1.json', 'perf/baseline/phase-8-baseline-run-2.json']
const paths = process.argv.slice(2).length ? process.argv.slice(2) : defaults
let failed = false

for (const path of paths) {
  let input: unknown
  try { input = JSON.parse(readFileSync(path, 'utf8')) as unknown }
  catch { console.error(`${path}: invalid artifact`); failed = true; continue }
  const result = checkPerformanceBudgets(input)
  if (result.status === 'passed') {
    const informative = result.checks.filter(check => check.enforcement === 'informative' && check.status === 'failed').length
    console.log(`${path}: passed (${result.checks.length} checks, ${informative} informative exceedances)`)
    continue
  }
  failed = true
  if (result.status === 'invalid') { console.error(`${path}: invalid (${result.issues.join(', ')})`); continue }
  const failures = result.status === 'failed' ? result.violations : result.unavailable
  console.error(`${path}: ${result.status} (${failures.length})`)
  for (const failure of failures.slice(0, 20)) console.error(`- ${failure.id}: observed=${failure.observed ?? 'unavailable'} limit=${failure.limit}`)
}

if (failed) process.exitCode = 1
