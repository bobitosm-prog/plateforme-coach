#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const STAGING_MUTATION_CLASSIFICATION_VERSION = 1

const A = new Set([
  '20260327_subscription_fields.sql',
  '20260327_trial_period.sql',
  '20260418_muscles_worked.sql',
  '20260529213128_add_next_diagnostic_at_to_profiles.sql',
  '20260530151940_add_profile_equipment.sql',
  '20260531104041_add_next_program_regen_at.sql',
])

const B = new Set([
  '20260412_standardize_session_types.sql',
  '20260415_backfill_badge_id.sql',
  '20260612_backfill_personal_records.sql',
  '20260703110000_canonicalize_profiles_objective.sql',
])

const C = new Set([
  '20260328_recipes.sql',
  '20260409_exercise_variants.sql',
  '20260412_exercise_descriptions.sql',
  '20260413_exercise_video_developpe_couche.sql',
  '20260413_exercise_video_developpe_incline.sql',
  '20260413_exercise_video_developpe_militaire.sql',
  '20260413_exercise_video_developpe_militaire_barre.sql',
  '20260413_exercise_video_rowing_barre.sql',
  '20260413_exercise_video_souleve_de_terre.sql',
  '20260413_exercise_video_souleve_terre_roumain.sql',
  '20260413_exercise_video_squat_barre.sql',
  '20260413_exercise_video_tractions_pronation.sql',
  '20260415_exercise_video_curl_barre_droit.sql',
  '20260415_exercise_video_curl_halteres.sql',
  '20260415_exercise_video_developpe_militaire_barre_debout.sql',
  '20260415_gamification_badges.sql',
  '20260415_gamification_fix_rls.sql',
  '20260419_curl_halteres_v4.sql',
  '20260419_dips_video_v4.sql',
  '20260419_militaire_video_v4.sql',
  '20260419_rdl_video_v4.sql',
  '20260419_souleve_video_v4.sql',
  '20260419_squat_video_v4.sql',
  '20260419_tractions_video_v4.sql',
  '20260420_elevations_laterales_v4.sql',
  '20260420_kettlebell_swing_v4.sql',
  '20260421_arnold_press_video.sql',
  '20260421_hip_thrust_video.sql',
  '20260422_curl_concentre_video.sql',
  '20260422_curl_halteres_alterne_video.sql',
  '20260422_curl_marteau_video.sql',
  '20260422_elevations_frontales_halteres_video.sql',
  '20260518180000_add_missing_parent_exercises.sql',
  '20260530145524_normalize_exercises_equipment.sql',
  '20260531043341_complete_variant_group.sql',
  '20260622120000_normalize_abdos_muscle_group.sql',
])

const D = new Set([
  '20260419_cleanup_empty_programs.sql',
  '20260419_coach_clients_unique.sql',
  '20260419_invited_by_coach.sql',
  '20260530033322_backfill_next_diagnostic_at_orphans.sql',
  '20260530034000_backfill_week_start_sunday_to_monday.sql',
  '20260701200000_dedup_exercises_db.sql',
])

const E = new Set([
  '20260530044500_backfill_full_name_capitalize.sql',
])

const F = new Set()

const CLASSIFICATIONS = { A, B, C, D, E, F }

const SENSITIVE = {
  '20260419_invited_by_coach.sql': [
    'hardcoded_email',
    'personal_coach_client_relationship',
  ],
  '20260530033322_backfill_next_diagnostic_at_orphans.sql': [
    'hardcoded_user_uuid',
    'personal_schedule',
  ],
  '20260530034000_backfill_week_start_sunday_to_monday.sql': [
    'hardcoded_diagnostic_uuid',
    'health_coaching_content',
  ],
  '20260412_standardize_session_types.sql': ['training_history'],
  '20260418_muscles_worked.sql': ['training_history'],
  '20260612_backfill_personal_records.sql': ['training_performance'],
  '20260703110000_canonicalize_profiles_objective.sql': ['nutrition_fitness_objective'],
}

const DEPENDENCY_BREAKS = {
  '20260419_coach_clients_unique.sql': [
    'coach_clients_coach_client_unique constraint would be absent',
    'coach/client duplicate prevention contract would be incomplete',
  ],
  '20260701200000_dedup_exercises_db.sql': [
    'canonical 176-row catalog and exercise identity would remain ambiguous before exercise_id rollout',
  ],
}

const INDIVIDUAL_DECISION = new Set([
  ...D,
])
const INDIVIDUALLY_AUTHORIZED = new Set([
  '20260419_coach_clients_unique.sql',
  '20260701200000_dedup_exercises_db.sql',
])
const OPERATOR_REFUSED = new Set([
  '20260419_cleanup_empty_programs.sql',
  '20260419_invited_by_coach.sql',
  '20260530033322_backfill_next_diagnostic_at_orphans.sql',
  '20260530034000_backfill_week_start_sunday_to_monday.sql',
  '20260530044500_backfill_full_name_capitalize.sql',
])
export const FINAL_STAGING_OVERLAYS = Object.freeze([
  Object.freeze({
    sourcePath:
      'scripts/preproduction/overlays/20260419000010_invited_by_coach_schema_only.sql',
    stagingVersion: '20260419000010',
    stagingName: '20260419000010_invited_by_coach_schema_only.sql',
    sourceSha256:
      '5ac371ef59391920d8f5107638a3b7352d45dd66253850f2f25c6b895b8b9b46',
    replacesHistoricalMutation: '20260419_invited_by_coach.sql',
    justification:
      'Preserves required schema while excluding the hardcoded personal-email UPDATE.',
  }),
])

function categoryFor(file) {
  const matches = Object.entries(CLASSIFICATIONS)
    .filter(([, files]) => files.has(file))
    .map(([category]) => category)
  if (matches.length !== 1) {
    throw new Error(`${file} must have exactly one A-F classification`)
  }
  return matches[0]
}

function migrationStatements(migration) {
  return [
    ...migration.mutationInventory.statements,
    ...migration.mutationInventory.calls,
  ].filter(statement => statement.execution === 'migration')
}

function mutationType(file, statements, source) {
  if (/\bdedup\b/i.test(file)) return 'deduplication'
  if (/\bcleanup\b/i.test(file)) return 'nettoyage'
  if (statements.some(statement => statement.operation === 'delete_from')) {
    return 'delete'
  }
  if (/ON\s+CONFLICT[\s\S]+DO\s+UPDATE/i.test(source)) return 'upsert'
  if (/\bnormalize|canonicalize|standardize/i.test(file)) return 'normalisation'
  if (/\bbackfill\b/i.test(file) || /\bBackfill\b/.test(source)) return 'backfill'
  if (/exercises_db|badges|recipes/.test(source)) return 'donnée_de_référence'
  if (/RLS|POLICY/i.test(source)) return 'correction_de_sécurité'
  if (statements.some(statement => statement.operation === 'insert_into')) {
    return 'insert'
  }
  if (statements.some(statement => statement.operation === 'update')) {
    return 'update'
  }
  return 'autre'
}

function predicateSummary(source) {
  const predicates = []
  for (const match of source.matchAll(/\bWHERE\b([\s\S]{0,280}?)(?=;)/gi)) {
    const predicate = match[1].replace(/\s+/g, ' ').trim()
    if (predicate && !predicates.includes(predicate)) predicates.push(predicate)
  }
  return predicates.slice(0, 8)
}

function idempotenceFor(file, category, source) {
  if (category === 'D') return 'non_garantie_ou_destructive'
  if (category === 'E') return 'idempotente_par_predicat'
  if (/ON\s+CONFLICT/i.test(source)) return 'protegee_par_on_conflict'
  if (/WHERE[\s\S]+(?:IS NULL|NOT IN|!=|ILIKE|name\s*=)/i.test(source)) {
    return 'protegee_par_predicat_ou_affectation_deterministe'
  }
  if (category === 'A') return 'no_op_sur_base_vide_et_structure_idempotente'
  if (file === '20260328_recipes.sql') return 'identifiants_deterministes'
  return 'affectation_deterministe'
}

function emptyBehavior(category, file) {
  if (category === 'A') return 'structure créée; backfill sans ligne utilisateur'
  if (category === 'B') return 'no-op de données'
  if (category === 'C') return 'référence insérée ou catalogue enrichi'
  if (category === 'D') {
    if (file === '20260701200000_dedup_exercises_db.sql') {
      return 'peut supprimer un doublon créé par le catalogue'
    }
    return 'généralement no-op, mais non autorisable par hypothèse'
  }
  if (category === 'E') return 'no-op'
  return 'indéterminé'
}

function populatedBehavior(category) {
  if (category === 'A') return 'backfill borné puis contrat structurel final'
  if (category === 'B') return 'conversion des données historiques correspondantes'
  if (category === 'C') return 'enrichissement déterministe des références'
  if (category === 'D') return 'réécriture ou suppression potentiellement irréversible'
  if (category === 'E') return 'nettoyage historique sans dépendance aval'
  return 'analyse supplémentaire requise'
}

function riskFor(category, file) {
  if (category === 'D') {
    return DEPENDENCY_BREAKS[file]
      ? 'élevé_destructif_et_exclusion_structurelle'
      : 'élevé_destructif_personnel_ou_ambigu'
  }
  if (category === 'E') return 'faible_mais_inutile'
  if (category === 'B') return 'modéré_données_historiques'
  if (category === 'C') return 'faible_référence_non_personnelle'
  if (category === 'A') return 'faible_sur_base_vide'
  return 'inconnu'
}

function necessityFor(category, file) {
  if (category === 'A') return 'requise_pour_schema_final'
  if (category === 'B') return 'compatibilité_historique_uniquement'
  if (category === 'C') return 'requise_pour_références_et_contrats_aval'
  if (category === 'E') return 'inutile_sur_staging_neuf'
  if (DEPENDENCY_BREAKS[file]) return 'décision_individuelle_requise_pour_schema_final'
  return 'non_requise_sur_base_vide_mais_décision_individuelle_requise'
}

export function buildMutationClassification({
  migrationManifest,
  repositoryRoot,
}) {
  const blocked = migrationManifest.migrations.filter(
    migration => migration.authorization === 'blocked_data_mutation',
  )
  if (blocked.length !== 53) {
    throw new Error(`Expected 53 blocked migrations, received ${blocked.length}`)
  }

  const migrations = blocked.map(migration => {
    const file = migration.historicalName
    const source = readFileSync(resolve(repositoryRoot, migration.sourcePath), 'utf8')
    const statements = migrationStatements(migration)
    const category = categoryFor(file)
    const tables = [...new Set(statements.map(statement => statement.target))]
    const sensitiveSignals = SENSITIVE[file] ?? []
    const hasUnallowlistedProductionUrl =
      /https?:\/\/(?:app\.)?moovx\.ch/i.test(source)

    return {
      sourcePath: migration.sourcePath,
      historicalVersion: migration.historicalVersion,
      historicalName: file,
      stagingVersion: migration.stagingVersion,
      stagingName: migration.stagingName,
      sourceSha256: migration.sourceSha256,
      absoluteOrder: migration.absoluteOrder,
      category,
      mutationType: mutationType(file, statements, source),
      operations: [...new Set(statements.map(statement => statement.operation))],
      tables,
      predicates: predicateSummary(source),
      scope: tables.length === 1 ? `table:${tables[0]}` : `tables:${tables.join(',')}`,
      emptyDatabaseBehavior: emptyBehavior(category, file),
      populatedDatabaseBehavior: populatedBehavior(category),
      idempotence: idempotenceFor(file, category, source),
      downstreamDependencies: [
        ...migration.knownDependencies,
        ...(DEPENDENCY_BREAKS[file] ?? []),
      ],
      sensitiveSignals,
      containsPotentialPersonalData: sensitiveSignals.length > 0,
      containsUnallowlistedProductionUrl: hasUnallowlistedProductionUrl,
      destructiveRisk: riskFor(category, file),
      stagingNecessity: necessityFor(category, file),
      requiresIndividualDecision: INDIVIDUAL_DECISION.has(file),
    }
  })

  const totals = Object.fromEntries(
    Object.keys(CLASSIFICATIONS).map(category => [
      category,
      migrations.filter(migration => migration.category === category).length,
    ]),
  )

  return {
    schemaVersion: STAGING_MUTATION_CLASSIFICATION_VERSION,
    authority: 'moovx-staging-mutation-classification',
    sourceManifestAuthority: migrationManifest.authority,
    migrationCount: migrations.length,
    totals,
    migrations,
  }
}

export function buildCandidatePlan({
  migrationManifest,
  classification,
  plan,
}) {
  for (const migration of classification.migrations) {
    if (migration.category !== categoryFor(migration.historicalName)) {
      throw new Error(
        `Classification drift detected for ${migration.historicalName}`,
      )
    }
  }
  const includedCategories = plan === 'strict'
    ? new Set(['A', 'C'])
    : plan === 'compatibility'
      ? new Set(['A', 'B', 'C'])
      : plan === 'final'
        ? new Set(['A', 'B', 'C'])
      : null
  if (!includedCategories) throw new Error(`Unsupported mutation plan: ${plan}`)

  const byName = new Map(
    classification.migrations.map(migration => [migration.historicalName, migration]),
  )
  const excluded = []
  const included = []
  for (const migration of migrationManifest.migrations) {
    const decision = byName.get(migration.historicalName)
    const individuallyAuthorized =
      plan === 'final' && INDIVIDUALLY_AUTHORIZED.has(migration.historicalName)
    if (
      !decision
      || includedCategories.has(decision.category)
      || individuallyAuthorized
    ) included.push(migration)
    else excluded.push(decision)
  }
  const dependencyBreaks = excluded.flatMap(migration =>
    migration.downstreamDependencies
      .filter(dependency => !dependency.endsWith('.sql'))
      .map(dependency => ({
        migration: migration.historicalName,
        dependency,
      })),
  )
  const forbidden = included
    .map(migration => byName.get(migration.historicalName))
    .filter(Boolean)
    .filter(decision =>
      ['D', 'F'].includes(decision.category)
      && !(
        plan === 'final'
        && INDIVIDUALLY_AUTHORIZED.has(decision.historicalName)
      ),
    )
  const overlays = plan === 'final' ? FINAL_STAGING_OVERLAYS : []
  const versions = [
    ...included.map(migration => migration.stagingVersion),
    ...overlays.map(overlay => overlay.stagingVersion),
  ]
  const orderedNames = [
    ...included.map(migration => migration.stagingName),
    ...overlays.map(overlay => overlay.stagingName),
  ].sort()

  return {
    plan,
    includedCategories: [...includedCategories],
    sourceMigrationCount: migrationManifest.migrations.length,
    includedHistoricalMigrationCount: included.length,
    overlayMigrationCount: overlays.length,
    includedMigrationCount: included.length + overlays.length,
    excludedMigrationCount: excluded.length,
    includedHistoricalMigrations:
      included.map(migration => migration.historicalName),
    includedMigrations: [
      ...included.map(migration => migration.historicalName),
      ...overlays.map(overlay => overlay.stagingName),
    ],
    overlays,
    excludedMigrations: excluded.map(migration => migration.historicalName),
    excludedByCategory: Object.fromEntries(
      ['A', 'B', 'C', 'D', 'E', 'F'].map(category => [
        category,
        excluded
          .filter(migration => migration.category === category)
          .map(migration => migration.historicalName),
      ]),
    ),
    uniqueStagingVersionCount: new Set(versions).size,
    collisions: versions.length - new Set(versions).size,
    historicalOrderPreserved: orderedNames.every(
      (name, index) => index === 0 || name > orderedNames[index - 1],
    ),
    dependencyBreaks: plan === 'final' ? [] : dependencyBreaks,
    forbiddenIncluded: forbidden.map(migration => migration.historicalName),
    acceptableForSupabaseDryRun:
      (plan === 'final' || dependencyBreaks.length === 0)
      && forbidden.length === 0
      && (
        plan !== 'final'
        || excluded.every(migration =>
          OPERATOR_REFUSED.has(migration.historicalName),
        )
      ),
    probableFinalSchema:
      plan === 'final' || dependencyBreaks.length === 0
        ? 'complete'
        : 'incomplete',
  }
}

function valueFor(argv, name) {
  const index = argv.indexOf(name)
  if (index === -1 || !argv[index + 1] || argv[index + 1].startsWith('--')) {
    throw new Error(`Missing required argument: ${name}`)
  }
  return argv[index + 1]
}

function main() {
  const argv = process.argv.slice(2)
  const manifest = JSON.parse(
    readFileSync(resolve(valueFor(argv, '--manifest')), 'utf8'),
  )
  const classification = buildMutationClassification({
    migrationManifest: manifest,
    repositoryRoot: process.cwd(),
  })
  const plan = argv.includes('--plan')
    ? buildCandidatePlan({
        migrationManifest: manifest,
        classification,
        plan: valueFor(argv, '--plan'),
      })
    : null
  process.stdout.write(`${JSON.stringify({ classification, plan }, null, 2)}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    process.stderr.write(
      `staging mutation classification refused: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    )
    process.exitCode = 1
  }
}
