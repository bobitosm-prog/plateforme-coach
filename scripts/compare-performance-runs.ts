import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { stableJson } from '../lib/performance/baseline.ts'
import {
  COMPARISON_JOURNEYS,
  COMPARISON_METRICS,
  comparePerformanceRuns,
  type PerformanceComparisonReport,
  type SeriesComparison,
} from '../lib/performance/comparison/index.ts'

export const DEFAULT_COMPARISON_PATHS = {
  before: [
    'perf/baseline/phase-8-baseline-run-1.json',
    'perf/baseline/phase-8-baseline-run-2.json',
  ],
  after: [
    'perf/baseline/phase-8-after-validation-run-1.json',
    'perf/baseline/phase-8-after-validation-run-2.json',
  ],
  output: 'perf/baseline/phase-8-comparison.json',
} as const

type CliIo = {
  log(message: string): void
  error(message: string): void
}

export function runPerformanceComparisonCli(
  args: readonly string[],
  io: CliIo = console,
): number {
  const paths = parseArguments(args)
  if (!paths.ok) {
    io.error(paths.issue)
    return 1
  }
  let before: unknown[]
  let after: unknown[]
  try {
    before = paths.before.map(readArtifact)
    after = paths.after.map(readArtifact)
  } catch {
    io.error('Unable to read a comparison artifact')
    return 1
  }
  const result = comparePerformanceRuns(before, after)
  if (result.status === 'invalid') {
    io.error(`Invalid comparison: ${result.issues.join(', ')}`)
    return 1
  }
  if (result.status === 'unavailable') {
    io.error(`Unavailable comparison: ${result.issues.join(', ')}`)
    return 1
  }
  writeFileSync(resolve(paths.output), stableJson(result.report), { mode: 0o600 })
  io.log(renderSummary(result.report))
  return 0
}

function parseArguments(args: readonly string[]):
  | { ok: true; before: string[]; after: string[]; output: string }
  | { ok: false; issue: string } {
  if (!args.length) {
    return {
      ok: true,
      before: [...DEFAULT_COMPARISON_PATHS.before],
      after: [...DEFAULT_COMPARISON_PATHS.after],
      output: DEFAULT_COMPARISON_PATHS.output,
    }
  }
  const values = new Map<string, string[]>()
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]
    const value = args[index + 1]
    if (!['--before', '--after', '--output'].includes(flag) || !value) return { ok: false, issue: 'Invalid CLI arguments' }
    values.set(flag, [...(values.get(flag) ?? []), value])
  }
  const before = values.get('--before') ?? []
  const after = values.get('--after') ?? []
  const output = values.get('--output') ?? []
  if (before.length !== 2 || after.length !== 2 || output.length !== 1) {
    return { ok: false, issue: 'Exactly two --before, two --after and one --output are required' }
  }
  return { ok: true, before, after, output: output[0] }
}

function readArtifact(path: string): unknown {
  return JSON.parse(readFileSync(resolve(path), 'utf8')) as unknown
}

function renderSummary(report: PerformanceComparisonReport): string {
  const lines = ['Phase 8 Core Web Vitals comparison (median deltas; negative is improvement)']
  for (const journey of COMPARISON_JOURNEYS) {
    lines.push(journey)
    for (const metric of COMPARISON_METRICS) {
      const comparison = report.journeys[journey].metrics[metric]
      lines.push(`  ${metric.toUpperCase()}: ${formatSeries(comparison)}`)
    }
  }
  lines.push(`Report: ${DEFAULT_COMPARISON_PATHS.output}`)
  return lines.join('\n')
}

function formatSeries(series: SeriesComparison): string {
  if (series.status !== 'comparable') return series.status
  const percent = series.deltaPercent === null ? 'n/a' : `${series.deltaPercent.toFixed(3)}%`
  return `${series.before.median} -> ${series.after.median}; delta ${series.deltaAbsolute} (${percent}); ${series.dispersion}`
}

const isDirect = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isDirect) process.exitCode = runPerformanceComparisonCli(process.argv.slice(2))
