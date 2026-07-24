import { readdirSync, readFileSync, statSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import {
  auditSupabaseConstructions,
  compareSupabaseConstructionBaseline,
  constructionKey,
  type SupabaseConstruction,
} from '../lib/supabase/construction-guard.ts'
import {
  CANONICAL_SUPABASE_CONSTRUCTIONS,
  LEGACY_SUPABASE_CONSTRUCTIONS,
} from '../lib/supabase/construction-baseline.ts'

const ROOT = resolve(import.meta.dirname, '..')
const roots = ['app', 'lib']
const standaloneFiles = ['proxy.ts']

function sourceFiles(directory: string): string[] {
  return readdirSync(directory)
    .flatMap(name => {
      const path = resolve(directory, name)
      return statSync(path).isDirectory() ? sourceFiles(path) : [path]
    })
    .filter(path => /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(path))
}

export function inventorySupabaseConstructions(root = ROOT): {
  readonly constructions: readonly SupabaseConstruction[]
  readonly uncalledRuntimeImports: readonly string[]
} {
  const files = [
    ...roots.flatMap(directory => sourceFiles(resolve(root, directory))),
    ...standaloneFiles.map(file => resolve(root, file)),
  ]
  const constructions: SupabaseConstruction[] = []
  const uncalledRuntimeImports: string[] = []
  for (const absolutePath of files) {
    const file = relative(root, absolutePath)
    const result = auditSupabaseConstructions(file, readFileSync(absolutePath, 'utf8'))
    constructions.push(...result.constructions)
    uncalledRuntimeImports.push(...result.uncalledRuntimeImports.map(value => `${file}:${value}`))
  }
  return {
    constructions: constructions.sort((a, b) =>
      a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column),
    uncalledRuntimeImports: uncalledRuntimeImports.sort(),
  }
}

export function checkSupabaseConstructionPolicy(root = ROOT) {
  const inventory = inventorySupabaseConstructions(root)
  const expected = [...CANONICAL_SUPABASE_CONSTRUCTIONS, ...LEGACY_SUPABASE_CONSTRUCTIONS]
  return {
    ...inventory,
    comparison: compareSupabaseConstructionBaseline(inventory.constructions, expected),
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const result = checkSupabaseConstructionPolicy()
  if (
    !result.comparison.ok
    || result.uncalledRuntimeImports.length > 0
  ) {
    console.error(JSON.stringify({
      error: 'SUPABASE_CONSTRUCTION_POLICY_VIOLATION',
      added: result.comparison.added,
      missing: result.comparison.missing,
      uncalledRuntimeImports: result.uncalledRuntimeImports,
    }, null, 2))
    process.exitCode = 1
  } else {
    const canonical = new Set<string>(CANONICAL_SUPABASE_CONSTRUCTIONS)
    const canonicalCount = result.constructions
      .map(constructionKey)
      .filter(key => canonical.has(key)).length
    console.log(JSON.stringify({
      status: 'ok',
      canonical: canonicalCount,
      legacy: result.constructions.length - canonicalCount,
      total: result.constructions.length,
    }))
  }
}
