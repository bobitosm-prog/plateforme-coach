import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

import sharp from 'sharp'

import type { RecoveryMaskView } from '../lib/home/recovery-mask-assets'

const {
  RECOVERY_MASK_ASSETS,
  RECOVERY_MASK_HEIGHT,
  RECOVERY_MASK_WIDTH,
} = await import(new URL('../lib/home/recovery-mask-assets.ts', import.meta.url).href) as typeof import('../lib/home/recovery-mask-assets')
const { RECOVERY_HIT_MAP_ROWS } = await import(new URL('../lib/home/recovery-hit-map.generated.ts', import.meta.url).href) as typeof import('../lib/home/recovery-hit-map.generated')
const { buildRecoveryHitMapSource } = await import(new URL('./generate-recovery-hit-map.ts', import.meta.url).href) as typeof import('./generate-recovery-hit-map')

const ROOT = path.resolve(import.meta.dirname, '..')
const OUTPUT = path.join(ROOT, 'lib/home/recovery-hit-map.generated.ts')
const PIXEL_COUNT = RECOVERY_MASK_WIDTH * RECOVERY_MASK_HEIGHT

export interface RecoveryHitMapValidationReport {
  readonly width: number
  readonly height: number
  readonly mapBytes: number
  readonly mapSha256: string
  readonly segmentCount: Readonly<Record<RecoveryMaskView, number>>
  readonly overlapPixels: Readonly<Record<RecoveryMaskView, number>>
  readonly divergencePixels: Readonly<Record<RecoveryMaskView, number>>
}

function publicAssetPath(assetPath: string): string {
  return path.join(ROOT, 'public', assetPath)
}

export async function validateRecoveryHitMap(): Promise<RecoveryHitMapValidationReport> {
  const committedSource = await readFile(OUTPUT, 'utf8')
  const generatedSource = await buildRecoveryHitMapSource()
  if (committedSource !== generatedSource) throw new Error('Recovery hit map is not byte-for-byte reproducible')

  const segmentCount = { front: 0, back: 0 }
  const overlapPixels = { front: 0, back: 0 }
  const divergencePixels = { front: 0, back: 0 }

  for (const view of ['front', 'back'] as const) {
    const expected = new Uint8Array(PIXEL_COUNT)
    const knownIds = new Set<number>(RECOVERY_MASK_ASSETS.filter(asset => asset.view === view).map(asset => asset.atlasId))
    for (const asset of RECOVERY_MASK_ASSETS.filter(candidate => candidate.view === view)) {
      const { data } = await sharp(publicAssetPath(asset.maskPath)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      for (let pixel = 0; pixel < PIXEL_COUNT; pixel += 1) {
        if (data[pixel * 4 + 3] === 0) continue
        if (expected[pixel] !== 0) overlapPixels[view] += 1
        expected[pixel] = asset.atlasId
      }
    }

    const rows = RECOVERY_HIT_MAP_ROWS[view]
    if (rows.length !== RECOVERY_MASK_HEIGHT) throw new Error(`Invalid ${view} row count: ${rows.length}`)
    const actual = new Uint8Array(PIXEL_COUNT)
    rows.forEach((row, y) => {
      if (row.length % 3 !== 0) throw new Error(`Invalid ${view} RLE row ${y}`)
      let previousEnd = -1
      for (let index = 0; index < row.length; index += 3) {
        const xStart = row[index]
        const xEnd = row[index + 1]
        const zoneId = row[index + 2]
        if (!Number.isInteger(xStart) || !Number.isInteger(xEnd) || xStart < 0 || xEnd >= RECOVERY_MASK_WIDTH || xStart > xEnd || xStart <= previousEnd) {
          throw new Error(`Invalid ${view} segment at row ${y}, index ${index / 3}`)
        }
        if (!knownIds.has(zoneId)) throw new Error(`Unknown ${view} zone id ${zoneId}`)
        actual.fill(zoneId, y * RECOVERY_MASK_WIDTH + xStart, y * RECOVERY_MASK_WIDTH + xEnd + 1)
        previousEnd = xEnd
        segmentCount[view] += 1
      }
    })

    for (let pixel = 0; pixel < PIXEL_COUNT; pixel += 1) {
      if (actual[pixel] !== expected[pixel]) divergencePixels[view] += 1
    }
    if (overlapPixels[view] !== 0) throw new Error(`Overlapping canonical masks in ${view}: ${overlapPixels[view]}`)
    if (divergencePixels[view] !== 0) throw new Error(`Recovery hit map diverges in ${view}: ${divergencePixels[view]}`)
  }

  const mapBytes = (await stat(OUTPUT)).size
  return {
    width: RECOVERY_MASK_WIDTH,
    height: RECOVERY_MASK_HEIGHT,
    mapBytes,
    mapSha256: createHash('sha256').update(committedSource).digest('hex'),
    segmentCount,
    overlapPixels,
    divergencePixels,
  }
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isCli) console.log(JSON.stringify(await validateRecoveryHitMap(), null, 2))
