import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const adr = readFileSync('docs/adr/0007-nutrition-plan-persistence-contract.md', 'utf8')
const model = readFileSync('docs/NUTRITION_CANONICAL_MODEL.md', 'utf8')
const producers = readFileSync('docs/NUTRITION_PLAN_PRODUCERS.md', 'utf8')
const repositories = readFileSync('docs/NUTRITION_REPOSITORIES.md', 'utf8')
const types = readFileSync('lib/supabase/database.types.ts', 'utf8')

function tableBlock(table: string, nextTable: string): string {
  return types.slice(types.indexOf(`      ${table}: {`), types.indexOf(`      ${nextTable}: {`))
}

describe('ADR 0007 Nutrition plan persistence contract', () => {
  it('selects only generated meal_plans columns as SQL authorities', () => {
    const block = tableBlock('meal_plans', 'meal_tracking')
    for (const field of ['user_id', 'created_by', 'name', 'plan', 'active', 'created_at']) {
      expect(block).toContain(`${field}:`)
      expect(adr).toContain(`| \`${field}\` | SQL`)
    }
    expect(block).not.toMatch(/plan_data|is_active|total_calories|protein_g|carbs_g|fat_g|objective/)
    expect(adr).toContain('`plan` et `active` sont donc retenus')
  })

  it('keeps coach/client authority in SQL and additions future-only', () => {
    const block = tableBlock('client_meal_plans', 'client_programs')
    for (const field of ['client_id', 'coach_id', 'plan', 'created_at', 'updated_at']) {
      expect(block).toContain(`${field}:`)
    }
    expect(block).not.toMatch(/week_start|status|calorie_target|protein_target|carb_target|fat_target/)
    expect(adr).toContain('| `week_start` | future colonne SQL `date` |')
    expect(adr).toContain('| `status` | future colonne SQL bornée |')
    expect(adr).toContain("La relation coach/client faisant autorité n'est jamais copiée dans le")
  })

  it('requires provenance and separates declared and calculated totals', () => {
    expect(adr).toContain('schemaVersion: 1')
    expect(adr).toContain('documentType: "nutrition_plan"')
    expect(adr).toContain('declared: nutrition total | null')
    expect(adr).toContain('calculated: nutrition total | null')
    expect(adr).toContain('provenance: declared | generated | imported | legacy_unknown')
    expect(adr).toContain('Une inconnue ne devient jamais zéro.')
  })

  it('keeps legacy plans readable without making aliases canonical', () => {
    expect(adr).toContain('JSON brut de `plan`')
    expect(adr).toContain('forme runtime `plan_data` uniquement')
    expect(adr).toContain('`active` prime sur `is_active`')
    expect(adr).toContain('interdit une réécriture automatique')
  })

  it('covers all seven characterized producers', () => {
    for (const producer of [
      'NutritionPreferences',
      'useInitialGeneration',
      'diagnostic hebdomadaire',
      'useClientDetailAi',
      'sauvegarde manuelle coach',
      'onboarding photo',
      'calculateur ABS',
    ]) {
      expect(producers).toContain(producer)
    }
    expect(adr).toContain('Sept producteurs persistants')
  })

  it('keeps canonical and repository documents aligned', () => {
    expect(model).toContain('ADR 0007')
    expect(model).toContain('`plan` et `active`')
    expect(repositories).toContain('ADR 0007')
    expect(repositories).toContain('aucune colonne runtime absente')
  })

  it('defines a reversible migration sequence without executing it', () => {
    expect(adr).toContain('adaptateurs read-only')
    expect(adr).toContain('double lecture canonique-prioritaire')
    expect(adr).toContain('migrer additivement')
    expect(adr).toContain('backfill dans une tranche séparée')
    expect(adr).toContain('Le rollback conserve toutes les colonnes et tous les JSON bruts')
  })
})
