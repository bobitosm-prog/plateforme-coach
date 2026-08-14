import { appendFileSync, readFileSync } from 'node:fs'
import { appendCollectedCiStabilityObservation } from '../lib/ci/stability-collection.ts'

const artifactPath = process.argv[2]
const confirmed = process.argv[3] === '--confirm-append'
const registryPath = 'ci/stability/observations.jsonl'

if (!artifactPath || !confirmed) {
  console.error('usage: npm run ci:stability:import -- <artifact.json> --confirm-append')
  process.exitCode = 1
} else {
  let artifact: unknown
  try { artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as unknown } catch { artifact = null }
  const current = readFileSync(registryPath, 'utf8')
  const appended = appendCollectedCiStabilityObservation(current, artifact)
  if (!appended.ok) {
    console.error(JSON.stringify({ status: 'REJECTED', reason: appended.reason }))
    process.exitCode = 1
  } else {
    appendFileSync(registryPath, appended.source.slice(current.length), { encoding: 'utf8', flag: 'a' })
    console.log(JSON.stringify({
      status: 'APPENDED', sequence: appended.observation.sequence, run_id: appended.observation.run_id,
    }))
  }
}
