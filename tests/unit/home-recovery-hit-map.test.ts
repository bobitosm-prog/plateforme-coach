import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { RECOVERY_HIT_MAP_ROWS } from '@/lib/home/recovery-hit-map.generated'
import { RECOVERY_MASK_HEIGHT, RECOVERY_MASK_WIDTH } from '@/lib/home/recovery-mask-assets'
import { validateRecoveryHitMap } from '@/scripts/validate-recovery-hit-map'

describe('Recovery static hit map', () => {
  it('contains one native RLE row per source image row', () => {
    expect(RECOVERY_HIT_MAP_ROWS.front).toHaveLength(RECOVERY_MASK_HEIGHT)
    expect(RECOVERY_HIT_MAP_ROWS.back).toHaveLength(RECOVERY_MASK_HEIGHT)
    expect(RECOVERY_MASK_WIDTH).toBe(611)
    expect(RECOVERY_MASK_HEIGHT).toBe(1286)
  })

  it('matches every canonical mask pixel with zero overlap and zero divergence', async () => {
    await expect(validateRecoveryHitMap()).resolves.toEqual(expect.objectContaining({
      width: 611,
      height: 1286,
      overlapPixels: { front: 0, back: 0 },
      divergencePixels: { front: 0, back: 0 },
      segmentCount: { front: 1463, back: 2175 },
    }))
  })

  it('regenerates byte-for-byte', () => {
    const path = 'lib/home/recovery-hit-map.generated.ts'
    const before = readFileSync(path)
    execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/generate-recovery-hit-map.ts'])
    expect(readFileSync(path)).toEqual(before)
  })
})
