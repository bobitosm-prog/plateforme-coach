import {
  RECOVERY_MASK_ASSETS,
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

export interface RecoveryAtlasPoint {
  readonly x: number
  readonly y: number
}

export type RecoveryAtlasPixelReader = (x: number, y: number) => ArrayLike<number>

export function recoveryPointerToAtlasPoint(
  clientX: number,
  clientY: number,
  rect: RecoveryPointerRect,
): RecoveryAtlasPoint | null {
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

export function recoveryZoneFromAtlasPixel(
  view: RecoveryMaskView,
  pixel: ArrayLike<number>,
): RecoveryZone | null {
  if (pixel.length < 4 || pixel[3] === 0 || pixel[0] === 0) return null
  return RECOVERY_MASK_ASSETS.find(asset => asset.view === view && asset.atlasId === pixel[0])?.zone ?? null
}

export function resolveRecoveryPointerZone(
  view: RecoveryMaskView,
  clientX: number,
  clientY: number,
  rect: RecoveryPointerRect,
  readPixel?: RecoveryAtlasPixelReader | null,
): RecoveryZone | null {
  const point = recoveryPointerToAtlasPoint(clientX, clientY, rect)
  if (!point || !readPixel) return null

  try {
    return recoveryZoneFromAtlasPixel(view, readPixel(point.x, point.y))
  } catch {
    return null
  }
}
