import { readFileSync } from 'node:fs'
import { evaluateCiStability, parseCiStabilityRegistry } from '../lib/ci/stability-contract.ts'

const path = process.argv[2] ?? 'ci/stability/observations.jsonl'
let source: string
try {
  source = readFileSync(path, 'utf8')
} catch {
  console.error(JSON.stringify({ status: 'CI_STABILITY_CANDIDATE', reasons: ['REGISTRY_UNAVAILABLE'] }))
  process.exitCode = 1
  process.exit()
}

const registry = parseCiStabilityRegistry(source)
const evaluation = evaluateCiStability(registry)
console.log(JSON.stringify(evaluation, null, 2))
if (registry.issues.length > 0) process.exitCode = 1
