import { describe, expect, it, vi } from 'vitest'

import {
  recoveryPointerToMaskPoint,
  recoveryZoneFromMaskAlpha,
  resolveRecoveryPointerZoneFromMasks,
  type RecoveryMaskAlphaReader,
} from '@/lib/home/recovery-mask-hit-test'
import { RECOVERY_MASK_ASSETS } from '@/lib/home/recovery-mask-assets'

const rect = { left: 10, top: 20, width: 611, height: 1286 }

const readers = RECOVERY_MASK_ASSETS.map<RecoveryMaskAlphaReader>(asset => ({
  view: asset.view,
  zone: asset.zone,
  readAlpha: () => 255,
}))

describe('Recovery alpha-mask hit testing', () => {
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

  it('treats transparent pixels as background', () => {
    const transparent = readers.map(reader => ({ ...reader, readAlpha: () => 0 }))
    expect(recoveryZoneFromMaskAlpha('front', 0, 0, transparent)).toBeNull()
    expect(resolveRecoveryPointerZoneFromMasks('front', 10, 20, rect, transparent)).toBeNull()
  })

  it('maps every declared mask to its business zone using alpha only', () => {
    expect(RECOVERY_MASK_ASSETS).toHaveLength(11)
    for (const asset of RECOVERY_MASK_ASSETS) {
      const isolated = readers.map(reader => ({
        ...reader,
        readAlpha: () => reader.view === asset.view && reader.zone === asset.zone ? 1 : 0,
      }))
      expect(recoveryZoneFromMaskAlpha(asset.view, 100, 200, isolated)).toBe(asset.zone)
    }
  })

  it('does not accept an opaque mask from the other view', () => {
    expect(recoveryZoneFromMaskAlpha('front', 0, 0, readers.filter(reader => reader.view === 'back'))).toBeNull()
    expect(recoveryZoneFromMaskAlpha('back', 0, 0, readers.filter(reader => reader.view === 'front'))).toBeNull()
  })

  it('reads the converted pixel and selects the matching zone', () => {
    const readAlpha = vi.fn(() => 255)
    const quadriceps: RecoveryMaskAlphaReader[] = [{ view: 'front', zone: 'quadriceps', readAlpha }]
    expect(resolveRecoveryPointerZoneFromMasks('front', 315.5, 663, rect, quadriceps)).toBe('quadriceps')
    expect(readAlpha).toHaveBeenCalledWith(305, 643)
  })

  it('is inert before loading and fails closed when mask alpha reading fails', () => {
    expect(resolveRecoveryPointerZoneFromMasks('back', 315.5, 663, rect, null)).toBeNull()
    expect(resolveRecoveryPointerZoneFromMasks('back', 315.5, 663, rect, [{
      view: 'back', zone: 'calves', readAlpha: () => { throw new Error('mask unavailable') },
    }])).toBeNull()
  })
})
