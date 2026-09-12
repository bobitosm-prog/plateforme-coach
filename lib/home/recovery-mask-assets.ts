import type { RecoveryZone } from './recovery-model'

export const RECOVERY_MASK_WIDTH = 611
export const RECOVERY_MASK_HEIGHT = 1286
export const RECOVERY_MASK_ASSET_ROOT = '/images/recovery/v2'

export type RecoveryMaskView = 'front' | 'back'

export interface RecoveryMaskAsset {
  readonly view: RecoveryMaskView
  readonly zone: RecoveryZone
  readonly atlasId: number
  readonly maskPath: string
}

export const RECOVERY_BODY_ASSETS = {
  front: `${RECOVERY_MASK_ASSET_ROOT}/body-front-neutral.webp`,
  back: `${RECOVERY_MASK_ASSET_ROOT}/body-back-neutral.webp`,
} as const satisfies Record<RecoveryMaskView, string>

export const RECOVERY_ATLAS_ASSETS = {
  front: `${RECOVERY_MASK_ASSET_ROOT}/atlas/front.v1.png`,
  back: `${RECOVERY_MASK_ASSET_ROOT}/atlas/back.v1.png`,
} as const satisfies Record<RecoveryMaskView, string>

export const RECOVERY_MASK_ASSETS = [
  { view: 'front', zone: 'chest', atlasId: 1, maskPath: `${RECOVERY_MASK_ASSET_ROOT}/masks/front/chest.v1.png` },
  { view: 'front', zone: 'shoulders', atlasId: 2, maskPath: `${RECOVERY_MASK_ASSET_ROOT}/masks/front/shoulders.v1.png` },
  { view: 'front', zone: 'biceps', atlasId: 3, maskPath: `${RECOVERY_MASK_ASSET_ROOT}/masks/front/biceps.v1.png` },
  { view: 'front', zone: 'core', atlasId: 4, maskPath: `${RECOVERY_MASK_ASSET_ROOT}/masks/front/core.v1.png` },
  { view: 'front', zone: 'quadriceps', atlasId: 5, maskPath: `${RECOVERY_MASK_ASSET_ROOT}/masks/front/quadriceps.v1.png` },
  { view: 'back', zone: 'shoulders', atlasId: 6, maskPath: `${RECOVERY_MASK_ASSET_ROOT}/masks/back/shoulders.v1.png` },
  { view: 'back', zone: 'back', atlasId: 7, maskPath: `${RECOVERY_MASK_ASSET_ROOT}/masks/back/back.v1.png` },
  { view: 'back', zone: 'triceps', atlasId: 8, maskPath: `${RECOVERY_MASK_ASSET_ROOT}/masks/back/triceps.v1.png` },
  { view: 'back', zone: 'glutes', atlasId: 9, maskPath: `${RECOVERY_MASK_ASSET_ROOT}/masks/back/glutes.v1.png` },
  { view: 'back', zone: 'hamstrings', atlasId: 10, maskPath: `${RECOVERY_MASK_ASSET_ROOT}/masks/back/hamstrings.v1.png` },
  { view: 'back', zone: 'calves', atlasId: 11, maskPath: `${RECOVERY_MASK_ASSET_ROOT}/masks/back/calves.v1.png` },
] as const satisfies readonly RecoveryMaskAsset[]

// Updated only when the approved source assets intentionally change.
export const RECOVERY_MASK_ASSET_HASHES: Readonly<Record<string, string>> = {
  '/images/recovery/v2/atlas/back.v1.png': 'b5afc22f8e2e48a5c6816cfdd14958488cdc749b63cfd81caa872a29e39a0559',
  '/images/recovery/v2/atlas/front.v1.png': '1013dd565d883135e58ca2ad89ca673279be32619f4b3d106ade31dc3577982e',
  '/images/recovery/v2/body-back-neutral.webp': '5c30c37353d0b54807c28f4e3ede6687bec3dd880d3ad9d6c1a6dccc9bba82fc',
  '/images/recovery/v2/body-front-neutral.webp': 'f9783608de88ad8564dd12eeae55c70ce92153d6aca618092f003e84739b7eaf',
  '/images/recovery/v2/masks/back/back.v1.png': '372ce5bcc05f15a5c5f00c26ae7a89fb9a220091a3ed7edfb5d70dac27e0d553',
  '/images/recovery/v2/masks/back/calves.v1.png': 'ed8e9614d79a573f6de774485ca39fdb41520d0d8ee67b0e069da4b581f5ff22',
  '/images/recovery/v2/masks/back/glutes.v1.png': '92d8ebc8132bc39c3c2753541a3cfc01287324ac11679bce93bcb0e55be66720',
  '/images/recovery/v2/masks/back/hamstrings.v1.png': '23b5f29511eac12d2cb6bc18857a2f4fa95368f2b3d23a2baa63d5ff5eaa0ea7',
  '/images/recovery/v2/masks/back/shoulders.v1.png': 'a1f3595bae5e3391c581a8535544e6e454bb409d3afc27357acd1a4e6ae69a9e',
  '/images/recovery/v2/masks/back/triceps.v1.png': '894ab969a9474f3953411383c88a71c38664d861e5aafc1c9fe0eb37a611a69b',
  '/images/recovery/v2/masks/front/biceps.v1.png': '02019a65bfce78df4e869bc3f1565166f989f4a9ea7b6dd8a0254027960837df',
  '/images/recovery/v2/masks/front/chest.v1.png': '0fd0892203ac4d5e15bbc11a32db17e193445968b3467f3f968ac396862c58a6',
  '/images/recovery/v2/masks/front/core.v1.png': 'a117b5382ef3a9673af3d0d288bef50fe6c283518b5b7413bdf70dbc564ca039',
  '/images/recovery/v2/masks/front/quadriceps.v1.png': '9e33e104fceb158477d2df07839987277ea656ff1062b4e8cd67d55d2f1e7569',
  '/images/recovery/v2/masks/front/shoulders.v1.png': '74b146c337cc0145576d2a26bc98a041e3ca0218a84c0d332d9892ba12c5fbe5',
}

// Sum of the two neutral WebP files, eleven masks and two generated atlases.
export const RECOVERY_MASK_RUNTIME_BYTES = 305_660
export const RECOVERY_MASK_RUNTIME_BUDGET_BYTES = 2 * 1024 * 1024
