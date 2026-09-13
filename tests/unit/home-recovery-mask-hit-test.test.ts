import { describe, expect, it } from 'vitest'

import {
  recoveryPointerToMaskPoint,
  recoveryZoneFromHitMap,
  resolveRecoveryClickZone,
} from '@/lib/home/recovery-mask-hit-test'
import { RECOVERY_HIT_MAP_ROWS } from '@/lib/home/recovery-hit-map.generated'
import { RECOVERY_MASK_ASSETS } from '@/lib/home/recovery-mask-assets'

const rect = { left: 10, top: 20, width: 611, height: 1286 }

describe('Recovery static hit-map testing', () => {
  it('converts the top-left and bottom-right CSS corners to native pixels', () => {
    expect(recoveryPointerToMaskPoint(10, 20, rect)).toEqual({ x: 0, y: 0 })
    expect(recoveryPointerToMaskPoint(621, 1306, rect)).toEqual({ x: 610, y: 1285 })
  })

  it('rejects coordinates outside the rendered body and invalid rectangles', () => {
    expect(recoveryPointerToMaskPoint(9.99, 20, rect)).toBeNull()
    expect(recoveryPointerToMaskPoint(10, 1306.01, rect)).toBeNull()
    expect(recoveryPointerToMaskPoint(10, 20, { ...rect, width: 0 })).toBeNull()
    expect(recoveryPointerToMaskPoint(Number.NaN, 20, rect)).toBeNull()
  })

  it('treats the background and a muscle separation as non-selectable', () => {
    expect(recoveryZoneFromHitMap('front', 0, 0)).toBeNull()
    expect(recoveryZoneFromHitMap('front', 270, 250)).toBeNull()
    expect(resolveRecoveryClickZone('front', 10, 20, rect)).toBeNull()
  })

  it('maps every declared mask identifier to its business zone', () => {
    expect(RECOVERY_MASK_ASSETS).toHaveLength(11)
    for (const asset of RECOVERY_MASK_ASSETS) {
      const y = RECOVERY_HIT_MAP_ROWS[asset.view].findIndex(row => row.some((_, index) => index % 3 === 2 && row[index] === asset.atlasId))
      const row = RECOVERY_HIT_MAP_ROWS[asset.view][y]
      const segment = row.findIndex((_, index) => index % 3 === 2 && row[index] === asset.atlasId)
      const x = Math.floor((row[segment - 2] + row[segment - 1]) / 2)
      expect(recoveryZoneFromHitMap(asset.view, x, y)).toBe(asset.zone)
    }
  })

  it('rejects invalid native coordinates', () => {
    expect(recoveryZoneFromHitMap('front', -1, 0)).toBeNull()
    expect(recoveryZoneFromHitMap('back', 611, 0)).toBeNull()
    expect(recoveryZoneFromHitMap('back', 0, 1286)).toBeNull()
    expect(recoveryZoneFromHitMap('front', 1.5, 1)).toBeNull()
  })

  it('converts a rendered click and selects quadriceps immediately', () => {
    expect(resolveRecoveryClickZone('front', 265, 727, rect)).toBe('quadriceps')
  })
})
