import type { WebVitalInput } from './schema'

export function recordWebVital(input: WebVitalInput): { metric: string; roundedValue: number } {
  return { metric: input.name, roundedValue: Math.round(input.value) }
}
