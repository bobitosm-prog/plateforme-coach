import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')
const harness = resolve(root, 'tests/integration/ai-usage-concurrency.sh')
const temporaryDirectories: string[] = []

function execute(mode?: 'fail-after-seed' | 'term-after-seed') {
  const directory = mkdtempSync(join(tmpdir(), 'moovx-ai-concurrency-cleanup-'))
  temporaryDirectories.push(directory)
  const logPath = join(directory, 'psql.log')
  const fakePsql = join(directory, 'psql')
  writeFileSync(fakePsql, `#!/usr/bin/env bash
set -euo pipefail
input="$(cat)"
printf '%s\\n__PSQL_CALL_END__\\n' "$input" >> "$FAKE_PSQL_LOG"
if [[ "$*" == *"SELECT count(*)"* ]]; then
  printf '20\\n'
elif [[ "$input" == *"concurrency-a"* ]]; then
  printf '{"status": "allowed"}\\n'
elif [[ "$input" == *"concurrency-b"* ]]; then
  printf '{"status": "denied"}\\n'
fi
`)
  chmodSync(fakePsql, 0o700)

  const result = spawnSync('bash', [harness], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${directory}:${process.env.PATH || ''}`,
      FAKE_PSQL_LOG: logPath,
      MOOVX_TEST_DATABASE_URL: 'postgresql://local.invalid/test',
      ...(mode ? { MOOVX_AI_USAGE_CONCURRENCY_TEST_MODE: mode } : {}),
    },
  })
  return { result, log: readFileSync(logPath, 'utf8') }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('AI usage concurrency cleanup lifecycle', () => {
  it('cleans its fixtures after the nominal race', () => {
    const { result, log } = execute()
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('AI usage concurrency test passed')
    expect(log.match(/SELECT test\.cleanup_personas\(\);/g)).toHaveLength(1)
    expect(log).toContain('AI_USAGE_CONCURRENCY_CLEANUP_FAILED [auth.users]')
    expect(log).toContain('AI_USAGE_CONCURRENCY_CLEANUP_FAILED [ai_usage_logs]')
  })

  it('cleans its fixtures after a controlled failure', () => {
    const { result, log } = execute('fail-after-seed')
    expect(result.status).toBe(86)
    expect(log.match(/SELECT test\.cleanup_personas\(\);/g)).toHaveLength(1)
  })

  it('cleans its fixtures after a controlled termination', () => {
    const { result, log } = execute('term-after-seed')
    expect(result.status).toBe(143)
    expect(log.match(/SELECT test\.cleanup_personas\(\);/g)).toHaveLength(1)
  })
})
