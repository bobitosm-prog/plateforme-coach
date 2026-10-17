import { readFileSync } from 'node:fs'
import { evaluateCiStability, evaluateCiStabilityV2, parseCiStabilityRegistry } from '../lib/ci/stability-contract.ts'

const args = process.argv.slice(2)
const path = args.find(arg => !arg.startsWith('--')) ?? 'ci/stability/observations.jsonl'
const sha = args.find(arg => arg.startsWith('--v2-sha='))?.slice('--v2-sha='.length)
const startedAt = args.find(arg => arg.startsWith('--v2-started-at='))?.slice('--v2-started-at='.length)
if ((sha === undefined) !== (startedAt === undefined)) {
  console.error('V2 evaluation requires both --v2-sha and --v2-started-at')
  process.exit(2)
}
let source: string
try {
  source = readFileSync(path, 'utf8')
} catch {
  console.error(JSON.stringify({ status: 'CI_STABILITY_CANDIDATE', reasons: ['REGISTRY_UNAVAILABLE'] }))
  process.exitCode = 1
  process.exit()
}

const registry = parseCiStabilityRegistry(source)
const evaluation = sha !== undefined && startedAt !== undefined
  ? evaluateCiStabilityV2(registry, { sha, startedAt })
  : evaluateCiStability(registry)
console.log(JSON.stringify(evaluation, null, 2))
if (registry.issues.length > 0) process.exitCode = 1
