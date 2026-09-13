import {
  RECOVERY_MASK_ASSETS,
  RECOVERY_MASK_HEIGHT,
  RECOVERY_MASK_WIDTH,
  type RecoveryMaskView,
} from './recovery-mask-assets'
import { RECOVERY_HIT_MAP_ROWS } from './recovery-hit-map.generated'
import type { RecoveryZone } from './recovery-model'

export interface RecoveryPointerRect {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

export interface RecoveryMaskPoint {
  readonly x: number
  readonly y: number
}

export function recoveryPointerToMaskPoint(
  clientX: number,
  clientY: number,
  rect: RecoveryPointerRect,
): RecoveryMaskPoint | null {
  if (![clientX, clientY, rect.left, rect.top, rect.width, rect.height].every(Number.isFinite)) return null
  if (rect.width <= 0 || rect.height <= 0) return null

  const right = rect.left + rect.width
  const bottom = rect.top + rect.height
  if (clientX < rect.left || clientX > right || clientY < rect.top || clientY > bottom) return null

  return {
    x: Math.min(RECOVERY_MASK_WIDTH - 1, Math.max(0, Math.floor((clientX - rect.left) / rect.width * RECOVERY_MASK_WIDTH))),
    y: Math.min(RECOVERY_MASK_HEIGHT - 1, Math.max(0, Math.floor((clientY - rect.top) / rect.height * RECOVERY_MASK_HEIGHT))),
  }
}

export function recoveryZoneFromHitMap(
  view: RecoveryMaskView,
  x: number,
  y: number,
): RecoveryZone | null {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= RECOVERY_MASK_WIDTH || y < 0 || y >= RECOVERY_MASK_HEIGHT) {
    return null
  }
  const row = RECOVERY_HIT_MAP_ROWS[view][y]
  for (let index = 0; index < row.length; index += 3) {
    const xStart = row[index]
    if (x < xStart) return null
    if (x <= row[index + 1]) {
      const zoneId = row[index + 2]
      return RECOVERY_MASK_ASSETS.find(asset => asset.view === view && asset.atlasId === zoneId)?.zone ?? null
    }
  }
  return null
}

export function resolveRecoveryClickZone(
  view: RecoveryMaskView,
  clientX: number,
  clientY: number,
  rect: RecoveryPointerRect,
): RecoveryZone | null {
  const point = recoveryPointerToMaskPoint(clientX, clientY, rect)
  return point ? recoveryZoneFromHitMap(view, point.x, point.y) : null
}
