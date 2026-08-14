import { writeFileSync } from 'node:fs'
import {
  collectCiStabilityObservation,
  type GithubCiJobSnapshot,
  type IncompleteCiStabilityCollection,
} from '../lib/ci/stability-collection.ts'

const outputFlag = process.argv.indexOf('--output')
const outputPath = outputFlag >= 0 ? process.argv[outputFlag + 1] : undefined
const runId = process.env.GITHUB_RUN_ID ?? ''
const runAttempt = Number(process.env.GITHUB_RUN_ATTEMPT ?? '')
const repository = process.env.GITHUB_REPOSITORY ?? ''
const expectedSha = process.env.GITHUB_SHA ?? ''
const token = process.env.GITHUB_TOKEN ?? ''

const incomplete = (reason: IncompleteCiStabilityCollection['reason']): IncompleteCiStabilityCollection => ({
  record_type: 'incomplete_collection',
  schema_version: 1,
  run_id: `github-${runId || 'unavailable'}-attempt-${runAttempt || 'unavailable'}`,
  reason,
})

async function githubJson(path: string): Promise<unknown> {
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!response.ok) throw new Error('github api unavailable')
  return response.json() as Promise<unknown>
}

let artifact: ReturnType<typeof collectCiStabilityObservation> = incomplete('INVALID_RUN_METADATA')
try {
  if (!outputPath || !/^\d+$/.test(runId) || !Number.isInteger(runAttempt) || runAttempt < 1
    || !/^[^/]+\/[^/]+$/.test(repository) || !/^[0-9a-f]{40}$/.test(expectedSha) || !token) {
    artifact = incomplete('INVALID_RUN_METADATA')
  } else {
    const [run, jobsResponse] = await Promise.all([
      githubJson(`/actions/runs/${runId}/attempts/${runAttempt}`),
      githubJson(`/actions/runs/${runId}/attempts/${runAttempt}/jobs?per_page=100`),
    ])
    const runData = run as { head_sha?: unknown; run_started_at?: unknown }
    const jobsData = jobsResponse as { jobs?: unknown }
    if (runData.head_sha !== expectedSha || typeof runData.run_started_at !== 'string'
      || !Array.isArray(jobsData.jobs)) {
      artifact = incomplete('INVALID_RUN_METADATA')
    } else {
      artifact = collectCiStabilityObservation({
        githubRunId: runId,
        runAttempt,
        sha: expectedSha,
        runStartedAt: runData.run_started_at,
        jobs: jobsData.jobs as GithubCiJobSnapshot[],
      })
    }
  }
} catch {
  artifact = incomplete('GITHUB_API_UNAVAILABLE')
}

if (!outputPath) {
  console.error('missing --output path')
  process.exitCode = 1
} else {
  writeFileSync(outputPath, `${JSON.stringify(artifact)}\n`, { encoding: 'utf8', flag: 'wx' })
  console.log(JSON.stringify({ record_type: artifact.record_type, reason: 'reason' in artifact ? artifact.reason : null }))
}
