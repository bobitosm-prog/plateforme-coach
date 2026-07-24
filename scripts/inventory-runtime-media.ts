import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const OUTPUT = process.argv[2]
const MEDIA_EXTENSIONS = new Set([
  '.avif', '.gif', '.ico', '.jpeg', '.jpg', '.m4v', '.mov', '.mp4',
  '.png', '.svg', '.webm', '.webp',
])
const SOURCE_EXTENSIONS = new Set([
  '.css', '.html', '.js', '.json', '.mjs', '.scss', '.sql', '.ts', '.tsx',
])
export const PROTECTED_PATHS = Object.freeze([
  'scripts/enrich-parent-exercises.mjs',
  'public/videos/exercises/developpe-couche-barre.jpg',
  'public/videos/exercises/developpe-couche-barre.mp4',
  'supabase/.temp/cli-latest',
])
const PROTECTED = new Set(PROTECTED_PATHS)

type ImageMetadata = {
  readonly kind: 'image'
  readonly width: number | null
  readonly height: number | null
  readonly ratio: number | null
  readonly hasAlpha: boolean | null
  readonly orientation: number | null
}

type VideoMetadata = {
  readonly kind: 'video'
  readonly width: number | null
  readonly height: number | null
  readonly ratio: number | null
  readonly codec: string | null
  readonly container: string | null
  readonly durationSeconds: number | null
  readonly bitRate: number | null
  readonly hasAudio: boolean
}

type MediaMetadata = ImageMetadata | VideoMetadata

type InventoryItem = {
  readonly path: string
  readonly category: 'application' | 'exercise'
  readonly role: 'source' | 'derived' | 'unknown'
  readonly bytes: number
  readonly mimeType: string
  readonly sha256: string
  readonly metadata: MediaMetadata
  readonly consumers: readonly string[]
  readonly delivery: readonly {
    readonly consumer: string
    readonly route: string | null
    readonly loading: 'explicit-lazy' | 'explicit-eager' | 'browser-default' | 'unknown'
    readonly preload: 'none' | 'metadata' | 'auto' | 'unspecified'
    readonly poster: boolean
    readonly sizing: 'responsive' | 'fixed' | 'unknown'
    readonly aboveTheFold: 'yes' | 'no' | 'unknown'
  }[]
  readonly referenced: boolean
}

function walk(relativeDirectory: string, extensions: ReadonlySet<string>): string[] {
  const absoluteDirectory = resolve(ROOT, relativeDirectory)
  if (!existsSync(absoluteDirectory)) return []

  const result: string[] = []
  for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const path = `${relativeDirectory}/${entry.name}`
    if (PROTECTED.has(path)) continue
    if (entry.isDirectory()) result.push(...walk(path, extensions))
    else if (entry.isFile() && extensions.has(extname(entry.name).toLowerCase())) result.push(path)
  }
  return result.sort()
}

function finiteNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

async function inspectImage(path: string): Promise<ImageMetadata> {
  try {
    const metadata = await sharp(resolve(ROOT, path), { animated: true }).metadata()
    const width = finiteNumber(metadata.width)
    const height = finiteNumber(metadata.height)
    return {
      kind: 'image',
      width,
      height,
      ratio: width !== null && height ? Number((width / height).toFixed(6)) : null,
      hasAlpha: metadata.hasAlpha ?? null,
      orientation: finiteNumber(metadata.orientation),
    }
  } catch {
    const [widthValue, heightValue] = execFileSync(
      'identify',
      ['-format', '%w %h', `${resolve(ROOT, path)}[0]`],
      { encoding: 'utf8' },
    ).trim().split(/\s+/)
    const width = finiteNumber(widthValue)
    const height = finiteNumber(heightValue)
    return {
      kind: 'image',
      width,
      height,
      ratio: width !== null && height ? Number((width / height).toFixed(6)) : null,
      hasAlpha: null,
      orientation: null,
    }
  }
}

function inspectVideo(path: string): VideoMetadata {
  const raw = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=format_name,duration,bit_rate:stream=codec_name,codec_type,width,height',
    '-of', 'json',
    resolve(ROOT, path),
  ], { encoding: 'utf8' })
  const probe = JSON.parse(raw) as {
    format?: { format_name?: string; duration?: string; bit_rate?: string }
    streams?: Array<{ codec_name?: string; codec_type?: string; width?: number; height?: number }>
  }
  const video = probe.streams?.find(stream => stream.codec_type === 'video')
  const width = finiteNumber(video?.width)
  const height = finiteNumber(video?.height)
  return {
    kind: 'video',
    width,
    height,
    ratio: width !== null && height ? Number((width / height).toFixed(6)) : null,
    codec: video?.codec_name ?? null,
    container: probe.format?.format_name ?? null,
    durationSeconds: finiteNumber(probe.format?.duration),
    bitRate: finiteNumber(probe.format?.bit_rate),
    hasAudio: probe.streams?.some(stream => stream.codec_type === 'audio') ?? false,
  }
}

function detectMimeType(path: string): string {
  return execFileSync('file', ['--brief', '--mime-type', resolve(ROOT, path)], { encoding: 'utf8' }).trim()
}

function detectRole(path: string): InventoryItem['role'] {
  if (/-\\d+x\\d+\.|-\\d+\.(png|webp)$/i.test(path)) return 'derived'
  if (/\/hero-[^/]+\.webp$/i.test(path)) return 'derived'
  if (/\/hero-[^/]+\.png$/i.test(path)) return 'source'
  return 'unknown'
}

function sourceFiles(): Array<{ readonly path: string; readonly contents: string }> {
  return ['app', 'lib', 'public', 'scripts', 'supabase']
    .flatMap(directory => walk(directory, SOURCE_EXTENSIONS))
    .map(path => ({ path, contents: readFileSync(resolve(ROOT, path), 'utf8') }))
}

function consumerPaths(mediaPath: string, sources: ReturnType<typeof sourceFiles>): string[] {
  const publicReference = mediaPath.startsWith('public/') ? `/${mediaPath.slice(7)}` : mediaPath
  const basename = mediaPath.split('/').at(-1) ?? mediaPath
  return sources
    .filter(source => source.path !== mediaPath)
    .filter(source => source.contents.includes(publicReference) || source.contents.includes(basename))
    .map(source => source.path)
    .sort()
}

function routeFromConsumer(consumer: string): string | null {
  if (!consumer.startsWith('app/')) return null
  const route = consumer
    .replace(/^app/, '')
    .replace(/\/components\/.*$/, '')
    .replace(/\/[^/]+\.(ts|tsx)$/, '')
    .replace(/\([^/]+\)\//g, '')
  return route || '/'
}

function deliveryDetails(
  mediaPath: string,
  sources: ReturnType<typeof sourceFiles>,
): InventoryItem['delivery'] {
  const publicReference = mediaPath.startsWith('public/') ? `/${mediaPath.slice(7)}` : mediaPath
  const basename = mediaPath.split('/').at(-1) ?? mediaPath
  return sources.flatMap(source => {
    const needle = source.contents.includes(publicReference) ? publicReference : basename
    const index = source.contents.indexOf(needle)
    if (index < 0 || source.path === mediaPath) return []
    const context = source.contents.slice(Math.max(0, index - 400), index + needle.length + 400)
    const isMarkup = /<(img|video|Image)\b/.test(context)
    const loading: InventoryItem['delivery'][number]['loading'] = /loading\s*=\s*["']lazy["']/.test(context)
      ? 'explicit-lazy'
      : /\b(priority|autoPlay)\b/.test(context)
        ? 'explicit-eager'
        : isMarkup
          ? 'browser-default'
          : 'unknown'
    const preloadMatch = context.match(/preload\s*=\s*["'](none|metadata|auto)["']/)
    const sizing: InventoryItem['delivery'][number]['sizing'] = /\bsizes\s*=|\bfill\b|width:\s*['"]100%/.test(context)
      ? 'responsive'
      : /\b(width|height)\s*=\s*\{?\d+/.test(context)
        ? 'fixed'
        : 'unknown'
    return [{
      consumer: source.path,
      route: routeFromConsumer(source.path),
      loading,
      preload: (preloadMatch?.[1] as InventoryItem['delivery'][number]['preload'] | undefined) ?? 'unspecified',
      poster: /\bposter\s*=/.test(context),
      sizing,
      aboveTheFold: 'unknown' as const,
    }]
  }).sort((left, right) => left.consumer.localeCompare(right.consumer))
}

function exactDuplicates(items: readonly InventoryItem[]) {
  const groups = new Map<string, string[]>()
  for (const item of items) groups.set(item.sha256, [...(groups.get(item.sha256) ?? []), item.path])
  return [...groups.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([sha256, paths]) => ({ sha256, paths: paths.sort() }))
    .sort((left, right) => left.paths[0].localeCompare(right.paths[0]))
}

async function main() {
  const paths = ['public', 'app', 'assets']
    .flatMap(directory => walk(directory, MEDIA_EXTENSIONS))
    .sort()
  const sources = sourceFiles()
  const items: InventoryItem[] = []

  for (const path of paths) {
    const bytes = statSync(resolve(ROOT, path)).size
    const buffer = readFileSync(resolve(ROOT, path))
    const mimeType = detectMimeType(path)
    const isVideo = mimeType.startsWith('video/')
    const metadata = isVideo ? inspectVideo(path) : await inspectImage(path)
    const consumers = consumerPaths(path, sources)
    items.push({
      path,
      category: path.startsWith('public/videos/exercises/') ? 'exercise' : 'application',
      role: detectRole(path),
      bytes,
      mimeType,
      sha256: createHash('sha256').update(buffer).digest('hex'),
      metadata,
      consumers,
      delivery: deliveryDetails(path, sources),
      referenced: consumers.length > 0,
    })
  }

  const totals = items.reduce((result, item) => {
    const category = result[item.category]
    category.count += 1
    category.bytes += item.bytes
    return result
  }, {
    application: { count: 0, bytes: 0 },
    exercise: { count: 0, bytes: 0 },
  })

  const report = {
    schemaVersion: 1,
    roots: ['public/', 'app/', 'assets/'],
    protectedPaths: PROTECTED_PATHS,
    remoteMediaDownloaded: false,
    totals,
    thresholds: {
      heavyImageBytes: 200_000,
      heavyVideoBytes: 2_000_000,
    },
    exactDuplicateGroups: exactDuplicates(items),
    items,
  }
  const serialized = `${JSON.stringify(report, null, 2)}\n`
  if (OUTPUT) writeFileSync(resolve(ROOT, OUTPUT), serialized)
  else process.stdout.write(serialized)
}

await main()
