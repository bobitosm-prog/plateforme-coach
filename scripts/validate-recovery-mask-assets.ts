import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

import sharp from 'sharp'

import type { RecoveryMaskView } from '../lib/home/recovery-mask-assets'

const {
  RECOVERY_ATLAS_ASSETS,
  RECOVERY_BODY_ASSETS,
  RECOVERY_MASK_ASSETS,
  RECOVERY_MASK_ASSET_HASHES,
  RECOVERY_MASK_HEIGHT,
  RECOVERY_MASK_RUNTIME_BUDGET_BYTES,
  RECOVERY_MASK_RUNTIME_BYTES,
  RECOVERY_MASK_WIDTH,
} = await import(new URL('../lib/home/recovery-mask-assets.ts', import.meta.url).href) as typeof import('../lib/home/recovery-mask-assets')
const { RECOVERY_ZONES } = await import(new URL('../lib/home/recovery-model.ts', import.meta.url).href) as typeof import('../lib/home/recovery-model')
const { buildRecoveryAtlas, publicAssetPath } = await import(new URL('./generate-recovery-mask-atlas.ts', import.meta.url).href) as typeof import('./generate-recovery-mask-atlas')

const PIXEL_COUNT = RECOVERY_MASK_WIDTH * RECOVERY_MASK_HEIGHT

export interface RecoveryMaskValidationReport {
  readonly assetCount: number
  readonly maskCount: number
  readonly width: number
  readonly height: number
  readonly runtimeBytes: number
  readonly overlapPixels: Readonly<Record<RecoveryMaskView, number>>
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

export async function validateRecoveryMaskAssets(): Promise<RecoveryMaskValidationReport> {
  const ids = new Set<number>()
  const knownZones = new Set<string>(RECOVERY_ZONES)
  for (const asset of RECOVERY_MASK_ASSETS) {
    if (ids.has(asset.atlasId)) throw new Error(`Duplicate atlas id: ${asset.atlasId}`)
    if (!Number.isInteger(asset.atlasId) || asset.atlasId < 1 || asset.atlasId > 255) {
      throw new Error(`Atlas id outside PNG channel range: ${asset.atlasId}`)
    }
    if (!knownZones.has(asset.zone)) throw new Error(`Unknown Recovery zone: ${asset.zone}`)
    ids.add(asset.atlasId)
  }

  const runtimePaths = [
    ...Object.values(RECOVERY_BODY_ASSETS),
    ...RECOVERY_MASK_ASSETS.map(asset => asset.maskPath),
    ...Object.values(RECOVERY_ATLAS_ASSETS),
  ]
  const overlapPixels = { front: 0, back: 0 }

  for (const [view, assetPath] of Object.entries(RECOVERY_BODY_ASSETS)) {
    const metadata = await sharp(publicAssetPath(assetPath)).metadata()
    if (metadata.width !== RECOVERY_MASK_WIDTH || metadata.height !== RECOVERY_MASK_HEIGHT || metadata.format !== 'webp') {
      throw new Error(`Invalid ${view} neutral body asset: ${assetPath}`)
    }
  }

  for (const view of ['front', 'back'] as const) {
    const occupancy = new Uint8Array(PIXEL_COUNT)
    for (const asset of RECOVERY_MASK_ASSETS.filter(item => item.view === view)) {
      const file = publicAssetPath(asset.maskPath)
      const metadata = await sharp(file).metadata()
      if (metadata.width !== RECOVERY_MASK_WIDTH || metadata.height !== RECOVERY_MASK_HEIGHT) {
        throw new Error(`Invalid dimensions: ${asset.maskPath}`)
      }
      if (!metadata.hasAlpha || metadata.channels !== 4) throw new Error(`Missing RGBA alpha: ${asset.maskPath}`)

      const data = await sharp(file).ensureAlpha().raw().toBuffer()
      let populated = 0
      for (let pixel = 0; pixel < PIXEL_COUNT; pixel++) {
        if (data[pixel * 4 + 3] === 0) continue
        populated++
        const x = pixel % RECOVERY_MASK_WIDTH
        const y = Math.floor(pixel / RECOVERY_MASK_WIDTH)
        if (x === 0 || y === 0 || x === RECOVERY_MASK_WIDTH - 1 || y === RECOVERY_MASK_HEIGHT - 1) {
          throw new Error(`Mask touches canvas boundary: ${asset.maskPath}`)
        }
        if (occupancy[pixel]) overlapPixels[view]++
        occupancy[pixel]++
      }
      if (populated === 0) throw new Error(`Empty mask: ${asset.maskPath}`)
    }
    if (overlapPixels[view] !== 0) throw new Error(`Overlapping ${view} masks: ${overlapPixels[view]} pixels`)

    const generated = await buildRecoveryAtlas(view)
    const committed = await readFile(publicAssetPath(RECOVERY_ATLAS_ASSETS[view]))
    if (!generated.equals(committed)) throw new Error(`Atlas is not derived exactly from masks: ${view}`)

    const atlas = await sharp(committed).ensureAlpha().raw().toBuffer()
    const expectedIds = new Set<number>(RECOVERY_MASK_ASSETS.filter(asset => asset.view === view).map(asset => asset.atlasId))
    const actualIds = new Set<number>()
    for (let pixel = 0; pixel < PIXEL_COUNT; pixel++) {
      const offset = pixel * 4
      if (atlas[offset + 3] === 0) continue
      if (atlas[offset + 1] !== 0 || atlas[offset + 2] !== 0 || !expectedIds.has(atlas[offset])) {
        throw new Error(`Unknown atlas pixel identifier in ${view} at pixel ${pixel}`)
      }
      actualIds.add(atlas[offset])
    }
    if (actualIds.size !== expectedIds.size) throw new Error(`Atlas identifiers missing from ${view}`)
  }

  let runtimeBytes = 0
  for (const assetPath of runtimePaths) {
    const file = publicAssetPath(assetPath)
    const buffer = await readFile(file)
    runtimeBytes += (await stat(file)).size
    const expectedHash = RECOVERY_MASK_ASSET_HASHES[assetPath]
    if (!expectedHash || sha256(buffer) !== expectedHash) throw new Error(`Hash mismatch: ${assetPath}`)
  }
  if (runtimeBytes !== RECOVERY_MASK_RUNTIME_BYTES) {
    throw new Error(`Runtime asset weight mismatch: expected ${RECOVERY_MASK_RUNTIME_BYTES}, received ${runtimeBytes}`)
  }
  if (runtimeBytes > RECOVERY_MASK_RUNTIME_BUDGET_BYTES) {
    throw new Error(`Recovery mask assets exceed budget: ${runtimeBytes}`)
  }

  return {
    assetCount: runtimePaths.length,
    maskCount: RECOVERY_MASK_ASSETS.length,
    width: RECOVERY_MASK_WIDTH,
    height: RECOVERY_MASK_HEIGHT,
    runtimeBytes,
    overlapPixels,
  }
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isCli) {
  const report = await validateRecoveryMaskAssets()
  console.log(JSON.stringify(report, null, 2))
}
