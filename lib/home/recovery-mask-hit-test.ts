import {
  RECOVERY_MASK_HEIGHT,
  RECOVERY_MASK_WIDTH,
  type RecoveryMaskView,
} from './recovery-mask-assets'
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

export interface RecoveryMaskAlphaReader {
  readonly view: RecoveryMaskView
  readonly zone: RecoveryZone
  readonly readAlpha: (x: number, y: number) => number
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

export function recoveryZoneFromMaskAlpha(
  view: RecoveryMaskView,
  x: number,
  y: number,
  readers: readonly RecoveryMaskAlphaReader[],
): RecoveryZone | null {
  for (const reader of readers) {
    if (reader.view !== view) continue
    if (reader.readAlpha(x, y) > 0) return reader.zone
  }
  return null
}

export function resolveRecoveryPointerZoneFromMasks(
  view: RecoveryMaskView,
  clientX: number,
  clientY: number,
  rect: RecoveryPointerRect,
  readers?: readonly RecoveryMaskAlphaReader[] | null,
): RecoveryZone | null {
  const point = recoveryPointerToMaskPoint(clientX, clientY, rect)
  if (!point || !readers) return null

  try {
    return recoveryZoneFromMaskAlpha(view, point.x, point.y, readers)
  } catch {
    return null
  }
}
