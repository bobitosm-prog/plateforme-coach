// scripts/backfill-exercise-id.ts
// Usage:
//   npx tsx scripts/backfill-exercise-id.ts           # dry-run (rapport, zéro écriture)
//   npx tsx scripts/backfill-exercise-id.ts --apply   # UPDATE DB (après review du rapport)

import dotenv from 'dotenv'; dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import { findExerciseMatch, normalizeExerciseName } from '../lib/exercise-matching'

const APPLY = process.argv.includes('--apply')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Review Marco 02/07 : exercices distincts, fusion polluerait la progression
const EXCLUDED_NAMES = new Set([
  'Développé militaire haltères assis',
  'Squat bulgare haltères',
  'Tirage vertical prise neutre (poulie)',
  'Tirage vertical poulie prise large',
  'Tirage vertical poitrine prise large',
  'Élévations latérales câble',
  'Elevations laterales poulie unilaterale',
])

interface CatalogEntry { id: string; name: string }
interface NameGroup { exercise_name: string; count: number }
interface Mapping { name: string; canonicalName: string; canonicalId: string; sets: number; type: 'EXACT' | 'PREFIX' }

async function main() {
  // 1. Load catalog
  const { data: catalog, error: catErr } = await supabase.from('exercises_db').select('id, name')
  if (catErr || !catalog) { console.error('Failed to load catalog:', catErr); process.exit(1) }
  console.log(`Catalogue: ${catalog.length} exercices canoniques\n`)

  // 2. Load ALL exercise_name with exercise_id IS NULL (paginated to avoid 1000-row cap)
  const PAGE_SIZE = 1000
  const allRows: string[] = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('workout_sets')
      .select('exercise_name')
      .is('exercise_id', null)
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) { console.error('Failed to load sets:', error); process.exit(1) }
    if (!data || data.length === 0) break
    for (const row of data) allRows.push(row.exercise_name)
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  console.log(`Chargé ${allRows.length} sets avec exercise_id NULL (pagination ${PAGE_SIZE})`)

  // Group by exercise_name
  const counts: Record<string, number> = {}
  for (const name of allRows) {
    counts[name] = (counts[name] || 0) + 1
  }
  const groups: NameGroup[] = Object.entries(counts).map(([exercise_name, count]) => ({ exercise_name, count }))

  console.log(`Noms distincts: ${groups.length}`)
  const totalSets = groups.reduce((s, g) => s + g.count, 0)
  console.log(`Sets totaux à résoudre: ${totalSets}\n`)

  // 3. Resolve each name
  const exact: Mapping[] = []
  const prefix: Mapping[] = []
  const excluded: { name: string; sets: number; wouldMap: string }[] = []
  const unresolved: { name: string; sets: number }[] = []

  for (const g of groups) {
    if (EXCLUDED_NAMES.has(g.exercise_name)) {
      const match = findExerciseMatch(catalog as CatalogEntry[], g.exercise_name)
      excluded.push({ name: g.exercise_name, sets: g.count, wouldMap: match?.name || '?' })
      continue
    }
    const match = findExerciseMatch(catalog as CatalogEntry[], g.exercise_name)
    if (match && match.name) {
      const normInput = normalizeExerciseName(g.exercise_name)
      const normMatch = normalizeExerciseName(match.name)
      const type = normInput === normMatch ? 'EXACT' : 'PREFIX'
      const mapping: Mapping = {
        name: g.exercise_name,
        canonicalName: match.name,
        canonicalId: match.id,
        sets: g.count,
        type,
      }
      if (type === 'EXACT') exact.push(mapping)
      else prefix.push(mapping)
    } else {
      unresolved.push({ name: g.exercise_name, sets: g.count })
    }
  }

  // Sort each section by sets desc
  exact.sort((a, b) => b.sets - a.sets)
  prefix.sort((a, b) => b.sets - a.sets)
  excluded.sort((a, b) => b.sets - a.sets)
  unresolved.sort((a, b) => b.sets - a.sets)

  // 4. Report
  const exactSets = exact.reduce((s, m) => s + m.sets, 0)
  const prefixSets = prefix.reduce((s, m) => s + m.sets, 0)
  const excludedSets = excluded.reduce((s, m) => s + m.sets, 0)
  const unresolvedSets = unresolved.reduce((s, m) => s + m.sets, 0)

  console.log('═══════════════════════════════════════════════════════')
  console.log(`EXACT (${exact.length} noms / ${exactSets} sets)`)
  console.log('═══════════════════════════════════════════════════════')
  for (const m of exact) {
    console.log(`  ✓ "${m.name}" → "${m.canonicalName}" (${m.sets} sets)`)
  }

  console.log('')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`PREFIX (${prefix.length} noms / ${prefixSets} sets) ← REVIEWER MANUELLEMENT`)
  console.log('═══════════════════════════════════════════════════════')
  for (const m of prefix) {
    console.log(`  ⚠ "${m.name}" → "${m.canonicalName}" (${m.sets} sets)`)
  }

  console.log('')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`EXCLUDED (${excluded.length} noms / ${excludedSets} sets) — review Marco 02/07`)
  console.log('═══════════════════════════════════════════════════════')
  for (const e of excluded) {
    console.log(`  ⊘ "${e.name}" (aurait → "${e.wouldMap}") (${e.sets} sets)`)
  }

  console.log('')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`UNRESOLVED (${unresolved.length} noms / ${unresolvedSets} sets)`)
  console.log('═══════════════════════════════════════════════════════')
  for (const u of unresolved) {
    console.log(`  ✗ "${u.name}" (${u.sets} sets)`)
  }

  console.log('')
  console.log('───────────────────────────────────────────────────────')
  console.log(`TOTAUX: ${exact.length + prefix.length + excluded.length + unresolved.length} noms / ${totalSets} sets`)
  console.log(`  EXACT:      ${exact.length} noms / ${exactSets} sets (${totalSets ? Math.round(exactSets / totalSets * 100) : 0}%)`)
  console.log(`  PREFIX:     ${prefix.length} noms / ${prefixSets} sets (${totalSets ? Math.round(prefixSets / totalSets * 100) : 0}%)`)
  console.log(`  EXCLUDED:   ${excluded.length} noms / ${excludedSets} sets (${totalSets ? Math.round(excludedSets / totalSets * 100) : 0}%)`)
  console.log(`  UNRESOLVED: ${unresolved.length} noms / ${unresolvedSets} sets (${totalSets ? Math.round(unresolvedSets / totalSets * 100) : 0}%)`)
  console.log(`  COUVERTURE: ${totalSets ? Math.round((exactSets + prefixSets) / totalSets * 100) : 0}%`)
  console.log('───────────────────────────────────────────────────────')

  // 5. Apply (only with --apply flag)
  if (!APPLY) {
    console.log('\n🔒 DRY-RUN : aucune écriture. Relancer avec --apply pour appliquer.')
    process.exit(0)
  }

  console.log('\n🔧 MODE APPLY : mise à jour en cours...\n')
  const allMappings = [...exact, ...prefix]
  let totalUpdated = 0

  for (const m of allMappings) {
    const { error } = await supabase
      .from('workout_sets')
      .update({ exercise_id: m.canonicalId })
      .eq('exercise_name', m.name)
      .is('exercise_id', null)

    if (error) {
      console.error(`  ✗ "${m.name}": ${error.message}`)
    } else {
      console.log(`  ✓ "${m.name}" → ${m.canonicalId} (${m.sets} sets)`)
      totalUpdated += m.sets
    }
  }

  console.log(`\n✅ APPLY terminé : ${totalUpdated} sets mis à jour.`)
  console.log(`   UNRESOLVED restants : ${unresolved.length} noms / ${unresolvedSets} sets (exercise_id reste null).`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
