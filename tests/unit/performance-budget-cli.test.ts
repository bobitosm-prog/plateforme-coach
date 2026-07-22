import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('performance budget CLI', () => {
  it('passes both default reference artifacts', () => {
    const result = spawnSync(process.execPath, ['scripts/check-performance-budgets.ts'], { encoding: 'utf8' })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('phase-8-baseline-run-1.json: passed')
    expect(result.stdout).toContain('phase-8-baseline-run-2.json: passed')
  })

  it('returns a non-zero code for an invalid future artifact', () => {
    const directory = mkdtempSync(join(tmpdir(), 'moovx-performance-budget-'))
    const path = join(directory, 'invalid.json')
    try {
      writeFileSync(path, '{}')
      const result = spawnSync(process.execPath, ['scripts/check-performance-budgets.ts', path], { encoding: 'utf8' })
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('invalid')
      expect(result.stderr).not.toContain('{')
    } finally { rmSync(directory, { recursive: true, force: true }) }
  })
})
