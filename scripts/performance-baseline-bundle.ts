import { gzipSync } from 'node:zlib'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

type ClientReferenceManifest = {
  clientModules: Record<string, { chunks: string[] }>
  entryCSSFiles: Record<string, Array<{ inlined: boolean; path: string }>>
}

type FileSize = { file: string; rawBytes: number; gzipBytes: number }

const ROUTE_MANIFESTS = {
  client: 'server/app/page_client-reference-manifest.js',
  coach: 'server/app/coach/page_client-reference-manifest.js',
  clientDetail: 'server/app/client/[id]/page_client-reference-manifest.js',
} as const

function readClientManifest(buildDir: string, relativePath: string): ClientReferenceManifest {
  const source = readFileSync(join(buildDir, relativePath), 'utf8')
  const start = source.indexOf('={', source.indexOf('__RSC_MANIFEST[')) + 1
  if (start <= 0) throw new Error(`Invalid client reference manifest: ${relativePath}`)
  return JSON.parse(source.slice(start).replace(/;\s*$/, '')) as ClientReferenceManifest
}

function manifestFiles(manifest: ClientReferenceManifest): string[] {
  const chunks = Object.values(manifest.clientModules).flatMap(module => module.chunks).filter(value => value.startsWith('static/'))
  const css = Object.values(manifest.entryCSSFiles).flat().filter(entry => !entry.inlined).map(entry => entry.path)
  return [...new Set([...chunks, ...css])].sort()
}

function measureFile(buildDir: string, file: string): FileSize {
  const encodedPath = join(buildDir, file)
  const path = existsSync(encodedPath) ? encodedPath : join(buildDir, decodeURIComponent(file))
  const bytes = readFileSync(path)
  return { file, rawBytes: statSync(path).size, gzipBytes: gzipSync(bytes, { level: 9 }).byteLength }
}

function total(files: readonly FileSize[]) {
  return files.reduce((sum, file) => ({ rawBytes: sum.rawBytes + file.rawBytes, gzipBytes: sum.gzipBytes + file.gzipBytes }), { rawBytes: 0, gzipBytes: 0 })
}

export function analyzeProductionBundles(buildDir: string) {
  const buildManifest = JSON.parse(readFileSync(join(buildDir, 'build-manifest.json'), 'utf8')) as { polyfillFiles: string[]; rootMainFiles: string[] }
  const framework = [...new Set([...buildManifest.polyfillFiles, ...buildManifest.rootMainFiles])]
  const routeFiles = Object.fromEntries(Object.entries(ROUTE_MANIFESTS).map(([route, manifest]) => [route, [...new Set([...framework, ...manifestFiles(readClientManifest(buildDir, manifest))])].sort()])) as Record<keyof typeof ROUTE_MANIFESTS, string[]>
  const appearances = new Map<string, number>()
  for (const files of Object.values(routeFiles)) for (const file of files) appearances.set(file, (appearances.get(file) ?? 0) + 1)
  const sharedNames = [...appearances].filter(([, count]) => count > 1).map(([file]) => file).sort()
  const allNames = [...appearances.keys()].sort()
  const measured = new Map(allNames.map(file => [file, measureFile(buildDir, file)]))
  const details = Object.fromEntries(Object.entries(routeFiles).map(([route, files]) => {
    const all = files.map(file => measured.get(file) as FileSize)
    const own = all.filter(file => appearances.get(file.file) === 1)
    return [route, { all, totals: total(all), routeSpecific: own, routeSpecificTotals: total(own) }]
  }))
  const shared = sharedNames.map(file => measured.get(file) as FileSize)
  const deduplicated = allNames.map(file => measured.get(file) as FileSize)
  return {
    manifests: ['build-manifest.json', ...Object.values(ROUTE_MANIFESTS)],
    method: 'Union of root framework files and App Router client-reference chunks/CSS; shared files are those present in more than one measured route.',
    routes: details,
    shared: { files: shared, totals: total(shared) },
    globalDeduplicated: { files: deduplicated, totals: total(deduplicated) },
  }
}
