import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

type Inventory = {
  readonly protectedPaths: readonly string[]
  readonly remoteMediaDownloaded: boolean
  readonly totals: {
    readonly application: { readonly count: number; readonly bytes: number }
    readonly exercise: { readonly count: number; readonly bytes: number }
  }
  readonly exactDuplicateGroups: ReadonlyArray<{
    readonly sha256: string
    readonly paths: readonly string[]
  }>
  readonly items: ReadonlyArray<{
    readonly path: string
    readonly bytes: number
    readonly mimeType: string
    readonly consumers: readonly string[]
    readonly metadata: {
      readonly kind: 'image' | 'video'
      readonly width: number | null
      readonly height: number | null
      readonly ratio: number | null
    }
  }>
}

function generateInventory(): Inventory {
  const directory = mkdtempSync(join(tmpdir(), 'moovx-media-inventory-'))
  const output = join(directory, 'inventory.json')
  execFileSync(process.execPath, ['scripts/inventory-runtime-media.ts', output], {
    cwd: process.cwd(),
    stdio: 'pipe',
  })
  return JSON.parse(readFileSync(output, 'utf8')) as Inventory
}

describe('runtime media inventory', () => {
  const inventory = generateInventory()

  it('excludes concurrent files before inspection and never downloads remote media', () => {
    expect(inventory.protectedPaths).toEqual([
      'scripts/enrich-parent-exercises.mjs',
      'public/videos/exercises/developpe-couche-barre.jpg',
      'public/videos/exercises/developpe-couche-barre.mp4',
      'supabase/.temp/cli-latest',
    ])
    expect(inventory.remoteMediaDownloaded).toBe(false)
    expect(inventory.items.some(item => inventory.protectedPaths.includes(item.path))).toBe(false)
  })

  it('reports real files with bounded dimensions and stable ratios', () => {
    expect(inventory.items.length).toBe(
      inventory.totals.application.count + inventory.totals.exercise.count,
    )
    for (const item of inventory.items) {
      expect(existsSync(resolve(item.path)), item.path).toBe(true)
      expect(item.bytes, item.path).toBeGreaterThan(0)
      expect(item.mimeType, item.path).toMatch(/^(image|video)\//)
      expect(item.metadata.width, item.path).toBeGreaterThan(0)
      expect(item.metadata.height, item.path).toBeGreaterThan(0)
      expect(item.metadata.ratio, item.path).toBeGreaterThan(0)
      for (const consumer of item.consumers) {
        expect(existsSync(resolve(consumer)), `${item.path} -> ${consumer}`).toBe(true)
      }
    }
  })

  it('keeps exact duplicate groups explicit without deleting either file', () => {
    const paths = inventory.exactDuplicateGroups.map(group => group.paths)
    expect(paths).toContainEqual(['public/Moovx.png', 'public/logo-moovx.png'])
    expect(paths).toContainEqual([
      'public/videos/exercises/dips.mp4',
      'public/videos/exercises/tractions-pronation.mp4',
    ])
  })
})
