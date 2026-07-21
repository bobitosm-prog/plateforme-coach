export type CanonicalValue = null | boolean | number | string | bigint | readonly CanonicalValue[] | { readonly [key: string]: CanonicalValue }

export function canonicalSerialize(value: unknown): string {
  return serialize(value, '$')
}

function serialize(value: unknown, path: string): string {
  if (value === null) return 'null'
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`Non-finite number at ${path}`)
    return Object.is(value, -0) ? '0' : JSON.stringify(value)
  }
  if (typeof value === 'bigint') return JSON.stringify({ $bigint: value.toString() })
  if (Array.isArray(value)) return `[${value.map((item, index) => serialize(item, `${path}[${index}]`)).join(',')}]`
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const entries = Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${serialize(record[key], `${path}.${key}`)}`)
    return `{${entries.join(',')}}`
  }
  throw new TypeError(`Unsupported ${typeof value} at ${path}`)
}
