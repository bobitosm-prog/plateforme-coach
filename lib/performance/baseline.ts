export const REQUEST_CATEGORIES = [
  'auth', 'postgrest', 'realtime', 'next-api', 'document',
  'javascript', 'css', 'font', 'image-media', 'other-local',
] as const

export type RequestCategory = (typeof REQUEST_CATEGORIES)[number]

export type RequestSample = {
  category: RequestCategory
  resourceType: string
}

export type NumericSummary = {
  values: number[]
  min: number
  median: number
  max: number
}

export type RequestSummary = {
  total: number
  application: number
  categories: Record<RequestCategory, number>
}

const STATIC_CATEGORIES = new Set<RequestCategory>(['javascript', 'css', 'font', 'image-media'])

export function classifyLocalRequest(rawUrl: string, resourceType: string): RequestCategory {
  const url = new URL(rawUrl)
  const pathname = url.pathname.toLowerCase()

  if (pathname.startsWith('/auth/v1/')) return 'auth'
  if (pathname.startsWith('/rest/v1/')) return 'postgrest'
  if (pathname.startsWith('/realtime/v1/')) return 'realtime'
  if (pathname.startsWith('/api/')) return 'next-api'
  if (resourceType === 'document') return 'document'
  if (resourceType === 'script' || pathname.endsWith('.js')) return 'javascript'
  if (resourceType === 'stylesheet' || pathname.endsWith('.css')) return 'css'
  if (resourceType === 'font' || /\.(?:woff2?|ttf|otf)$/.test(pathname)) return 'font'
  if (['image', 'media'].includes(resourceType) || /\.(?:avif|gif|jpe?g|png|svg|webp|mp4|webm)$/.test(pathname)) return 'image-media'
  return 'other-local'
}

export function summarizeRequests(samples: readonly RequestSample[]): RequestSummary {
  const categories = Object.fromEntries(REQUEST_CATEGORIES.map(category => [category, 0])) as Record<RequestCategory, number>
  for (const sample of samples) categories[sample.category] += 1
  return {
    total: samples.length,
    application: samples.filter(sample => !STATIC_CATEGORIES.has(sample.category)).length,
    categories,
  }
}

export function summarizeNumbers(values: readonly number[]): NumericSummary {
  if (!values.length || values.some(value => !Number.isFinite(value))) throw new Error('Finite measurements are required')
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
  return { values: [...values], min: sorted[0], median, max: sorted.at(-1) as number }
}

export function stableJson(value: unknown): string {
  const sort = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(sort)
    if (input && typeof input === 'object') {
      return Object.fromEntries(Object.entries(input).sort(([left], [right]) => left.localeCompare(right)).map(([key, nested]) => [key, sort(nested)]))
    }
    return input
  }
  return `${JSON.stringify(sort(value), null, 2)}\n`
}
