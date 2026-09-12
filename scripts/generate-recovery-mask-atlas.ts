import { pathToFileURL } from 'node:url'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import type { RecoveryMaskView } from '../lib/home/recovery-mask-assets'

const {
  RECOVERY_ATLAS_ASSETS,
  RECOVERY_MASK_ASSETS,
  RECOVERY_MASK_HEIGHT,
  RECOVERY_MASK_WIDTH,
} = await import(new URL('../lib/home/recovery-mask-assets.ts', import.meta.url).href) as typeof import('../lib/home/recovery-mask-assets')

const ROOT = path.resolve(import.meta.dirname, '..')
const PIXEL_COUNT = RECOVERY_MASK_WIDTH * RECOVERY_MASK_HEIGHT

export function publicAssetPath(assetPath: string): string {
  if (!assetPath.startsWith('/images/')) throw new Error(`Unexpected public asset path: ${assetPath}`)
  return path.join(ROOT, 'public', assetPath)
}

export async function buildRecoveryAtlas(view: RecoveryMaskView): Promise<Buffer> {
  const atlas = Buffer.alloc(PIXEL_COUNT * 4)
  const assets = RECOVERY_MASK_ASSETS.filter(asset => asset.view === view)

  for (const asset of assets) {
    const { data, info } = await sharp(publicAssetPath(asset.maskPath))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    if (info.width !== RECOVERY_MASK_WIDTH || info.height !== RECOVERY_MASK_HEIGHT || info.channels !== 4) {
      throw new Error(`Invalid mask geometry: ${asset.maskPath}`)
    }

    for (let pixel = 0; pixel < PIXEL_COUNT; pixel++) {
      if (data[pixel * 4 + 3] === 0) continue
      const offset = pixel * 4
      if (atlas[offset + 3] !== 0) throw new Error(`Overlapping masks in ${view} atlas at pixel ${pixel}`)
      atlas[offset] = asset.atlasId
      atlas[offset + 3] = 255
    }
  }

  return sharp(atlas, {
    raw: { width: RECOVERY_MASK_WIDTH, height: RECOVERY_MASK_HEIGHT, channels: 4 },
  }).png({ compressionLevel: 9, palette: false }).toBuffer()
}

export async function generateRecoveryMaskAtlases(): Promise<void> {
  for (const view of ['front', 'back'] as const) {
    await writeFile(publicAssetPath(RECOVERY_ATLAS_ASSETS[view]), await buildRecoveryAtlas(view))
  }
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isCli) {
  await generateRecoveryMaskAtlases()
  console.log('Generated Recovery mask atlases: front, back')
}
