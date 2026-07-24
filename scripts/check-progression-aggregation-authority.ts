import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  auditProgressionAggregationSource,
  compareProgressionAggregationBaseline,
} from '../lib/progression/aggregation-authority-guard.ts'
import { INTENTIONAL_LEGACY_PROGRESSION_AGGREGATIONS } from '../lib/progression/aggregation-authority-baseline.ts'

const ROOT = resolve(import.meta.dirname, '..')
function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap(name => {
    const path = resolve(directory, name)
    return statSync(path).isDirectory() ? sourceFiles(path) : [path]
  }).filter(path => /\.[cm]?[jt]sx?$/.test(path))
}

export function checkProgressionAggregationAuthority(root = ROOT) {
  const consumers = [
    ...sourceFiles(resolve(root, 'app')).map(file => file.slice(root.length + 1)),
    ...sourceFiles(resolve(root, 'lib'))
      .map(file => file.slice(root.length + 1))
      .filter(file => !file.startsWith('lib/progression/')),
  ].sort()
  const actual = consumers.flatMap(file =>
    auditProgressionAggregationSource(file, readFileSync(resolve(root, file), 'utf8')))
  return {
    consumers,
    actual,
    comparison: compareProgressionAggregationBaseline(
      actual,
      INTENTIONAL_LEGACY_PROGRESSION_AGGREGATIONS,
    ),
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const result = checkProgressionAggregationAuthority()
  if (!result.comparison.ok) {
    console.error(JSON.stringify({
      error: 'PROGRESSION_AGGREGATION_AUTHORITY_VIOLATION',
      ...result.comparison,
    }, null, 2))
    process.exitCode = 1
  } else {
    console.log(JSON.stringify({
      status: 'ok',
      auditedConsumers: result.consumers.length,
      intentionalLegacy: result.actual.length,
    }))
  }
}
