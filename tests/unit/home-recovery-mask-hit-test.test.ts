import { describe, expect, it, vi } from 'vitest'

import {
  recoveryPointerToAtlasPoint,
  recoveryZoneFromAtlasPixel,
  resolveRecoveryPointerZone,
} from '@/lib/home/recovery-mask-hit-test'
import { RECOVERY_MASK_ASSETS } from '@/lib/home/recovery-mask-assets'

const rect = { left: 10, top: 20, width: 611, height: 1286 }

describe('Recovery mask atlas hit testing', () => {
  it('converts the top-left and bottom-right CSS corners to native pixels', () => {
    expect(recoveryPointerToAtlasPoint(10, 20, rect)).toEqual({ x: 0, y: 0 })
    expect(recoveryPointerToAtlasPoint(621, 1306, rect)).toEqual({ x: 610, y: 1285 })
  })

  it('rejects coordinates outside the rendered body and invalid rectangles', () => {
    expect(recoveryPointerToAtlasPoint(9.99, 20, rect)).toBeNull()
    expect(recoveryPointerToAtlasPoint(10, 1306.01, rect)).toBeNull()
    expect(recoveryPointerToAtlasPoint(10, 20, { ...rect, width: 0 })).toBeNull()
    expect(recoveryPointerToAtlasPoint(Number.NaN, 20, rect)).toBeNull()
  })

  it('treats identifier zero and transparent pixels as background', () => {
    expect(recoveryZoneFromAtlasPixel('front', [0, 0, 0, 255])).toBeNull()
    expect(recoveryZoneFromAtlasPixel('front', [1, 0, 0, 0])).toBeNull()
    expect(resolveRecoveryPointerZone('front', 10, 20, rect, () => [0, 0, 0, 0])).toBeNull()
  })

  it('maps every declared front and back atlas identifier to its business zone', () => {
    for (const asset of RECOVERY_MASK_ASSETS) {
      expect(recoveryZoneFromAtlasPixel(asset.view, [asset.atlasId, 0, 0, 255])).toBe(asset.zone)
    }
  })

  it('does not accept an identifier from the other view', () => {
    expect(recoveryZoneFromAtlasPixel('front', [6, 0, 0, 255])).toBeNull()
    expect(recoveryZoneFromAtlasPixel('back', [1, 0, 0, 255])).toBeNull()
  })

  it('reads the converted pixel and selects the matching zone', () => {
    const readPixel = vi.fn(() => [5, 0, 0, 255])
    expect(resolveRecoveryPointerZone('front', 315.5, 663, rect, readPixel)).toBe('quadriceps')
    expect(readPixel).toHaveBeenCalledWith(305, 643)
  })

  it('is inert before loading and fails closed when atlas pixel reading fails', () => {
    expect(resolveRecoveryPointerZone('back', 315.5, 663, rect, null)).toBeNull()
    expect(resolveRecoveryPointerZone('back', 315.5, 663, rect, () => { throw new Error('atlas unavailable') })).toBeNull()
  })
})
