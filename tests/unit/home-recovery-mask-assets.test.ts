import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  RECOVERY_ATLAS_ASSETS,
  RECOVERY_BODY_ASSETS,
  RECOVERY_MASK_ASSETS,
  RECOVERY_MASK_ASSET_HASHES,
  RECOVERY_MASK_HEIGHT,
  RECOVERY_MASK_RUNTIME_BUDGET_BYTES,
  RECOVERY_MASK_RUNTIME_BYTES,
  RECOVERY_MASK_WIDTH,
} from '@/lib/home/recovery-mask-assets'
import { RECOVERY_ZONES } from '@/lib/home/recovery-model'
import { validateRecoveryMaskAssets } from '@/scripts/validate-recovery-mask-assets'

describe('Recovery mask assets', () => {
  it('maps eleven unique atlas identifiers to known business zones', () => {
    expect(RECOVERY_MASK_ASSETS).toHaveLength(11)
    expect(new Set(RECOVERY_MASK_ASSETS.map(asset => asset.atlasId)).size).toBe(11)
    expect(RECOVERY_MASK_ASSETS.every(asset => RECOVERY_ZONES.includes(asset.zone))).toBe(true)
    expect(RECOVERY_MASK_ASSETS.filter(asset => asset.view === 'front')).toHaveLength(5)
    expect(RECOVERY_MASK_ASSETS.filter(asset => asset.view === 'back')).toHaveLength(6)
  })

  it('tracks every runtime asset with an immutable hash and documented budget', () => {
    const paths = [
      ...Object.values(RECOVERY_BODY_ASSETS),
      ...RECOVERY_MASK_ASSETS.map(asset => asset.maskPath),
      ...Object.values(RECOVERY_ATLAS_ASSETS),
    ]
    expect(Object.keys(RECOVERY_MASK_ASSET_HASHES).sort()).toEqual([...paths].sort())
    expect(RECOVERY_MASK_RUNTIME_BYTES).toBeGreaterThan(0)
    expect(RECOVERY_MASK_RUNTIME_BYTES).toBeLessThanOrEqual(RECOVERY_MASK_RUNTIME_BUDGET_BYTES)
  })

  it('validates dimensions, alpha, boundaries, overlaps, hashes and generated atlases', async () => {
    await expect(validateRecoveryMaskAssets()).resolves.toEqual(expect.objectContaining({
      assetCount: 15,
      maskCount: 11,
      width: RECOVERY_MASK_WIDTH,
      height: RECOVERY_MASK_HEIGHT,
      runtimeBytes: RECOVERY_MASK_RUNTIME_BYTES,
      overlapPixels: { front: 0, back: 0 },
    }))
  })

  it('regenerates both atlases byte-for-byte', () => {
    const before = Object.values(RECOVERY_ATLAS_ASSETS).map(asset => readFileSync(`public${asset}`))
    execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/generate-recovery-mask-atlas.ts'])
    const after = Object.values(RECOVERY_ATLAS_ASSETS).map(asset => readFileSync(`public${asset}`))
    expect(after).toEqual(before)
  })
})
