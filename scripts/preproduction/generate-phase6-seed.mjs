#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXED_TIMESTAMP = '2026-07-26T00:00:00.000Z'
const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

function jsonSql(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`
}

export function phase6PlanFixtures() {
  const canonical = {
    schemaVersion: 1,
    documentType: 'nutrition_plan',
    planVersion: 1,
    timezone: 'Europe/Zurich',
    content: {
      days: DAY_KEYS.map(day => ({
        day,
        sourceStatus: 'observed',
        meals: [],
        declaredTotals: null,
      })),
      rules: [],
      alternatives: [],
    },
    targets: {
      energyKcal: { status: 'known', value: 2283, provenance: 'declared' },
      proteinG: { status: 'known', value: 134, provenance: 'declared' },
      carbsG: { status: 'known', value: 266, provenance: 'declared' },
      fatG: { status: 'known', value: 76, provenance: 'declared' },
      fiberG: { status: 'unknown', value: null, provenance: 'legacy_unknown' },
    },
    totals: {
      declared: null,
      calculated: null,
      calculationStatus: 'unavailable',
      calculationVersion: 'nutrition-invariants-v1',
      calculatedAt: null,
    },
    provenance: {
      source: 'platform',
      sourceVersion: 'phase6-seed-v1',
      legacyFormat: null,
      generatedAt: FIXED_TIMESTAMP,
    },
    warnings: [],
  }
  const legacy = {
    lundi: {
      meals: [{
        type: 'Déjeuner',
        foods: [{
          name: 'Phase6 riz synthétique',
          qty: 100,
          kcal: 130,
          prot: 3,
          carb: 28,
          fat: 1,
        }],
      }],
    },
    mardi: { meals: [] },
    mercredi: { meals: [] },
    jeudi: { meals: [] },
    vendredi: { meals: [] },
    samedi: { meals: [] },
    dimanche: { meals: [] },
  }
  const conflict = structuredClone(legacy)
  conflict.lundi.meals[0].foods[0].protein = 3
  conflict.lundi.meals[0].foods[0].proteins = 4
  const invalid = structuredClone(legacy)
  invalid.lundi.meals[0].foods[0].kcal = -1
  return {
    canonical,
    legacy,
    conflict,
    invalid,
    legacy_unsupported: { monday: { meals: [] } },
  }
}

function savedMealFoods(fixture) {
  if (fixture === 'canonical') {
    return [{
      name: 'Phase6 avoine synthétique',
      quantity: 100,
      calories: 380,
      protein: 13,
      carbs: 68,
      fat: 7,
    }]
  }
  if (fixture === 'legacy') {
    return [{
      aliment: 'Phase6 tofu synthétique',
      quantite_g: 100,
      kcal: 144,
      proteines: 17,
      glucides: 3,
      lipides: 9,
    }]
  }
  if (fixture === 'conflict') {
    return [{
      name: 'Phase6 alias synthétique',
      quantity: 100,
      calories: 100,
      protein: 10,
      proteins: 11,
      carbs: 5,
      fat: 2,
    }]
  }
  return [{
    name: 'Phase6 invalide synthétique',
    quantity: 100,
    calories: -1,
    protein: 1,
    carbs: 1,
    fat: 1,
  }]
}

function assertManifest(manifest) {
  if (
    manifest.schemaVersion !== 2
    || manifest.authority !== 'moovx-phase6-staging-auth-v2'
    || manifest.environment !== 'staging'
    || manifest.projectRef !== 'cycbnnojcymjnaqomlyj'
    || manifest.supabaseUrl !== 'https://cycbnnojcymjnaqomlyj.supabase.co'
    || manifest.namespace !== '76100000'
  ) {
    throw new Error('Invalid Phase 6 Auth v2 seed authority')
  }
  if (manifest.personas.length !== 9) throw new Error('Expected 9 personas')
  if (manifest.personalPlans.length !== 6) throw new Error('Expected 6 personal plans')
  if (manifest.coachPlans.length !== 2) throw new Error('Expected 2 coach plans')
  if (manifest.savedMeals.length !== 4) throw new Error('Expected 4 saved meals')
  const ids = [
    ...manifest.personas.map(row => row.id),
    manifest.relation.id,
    ...manifest.personalPlans.map(row => row.id),
    ...manifest.coachPlans.map(row => row.id),
    ...manifest.savedMeals.map(row => row.id),
  ]
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate deterministic seed id')
  if (ids.some(id => !id.startsWith('7610000'))) {
    throw new Error('Seed id outside Phase 6 Auth v2 namespace')
  }
  if (manifest.personas.some(persona =>
    !persona.email.endsWith('@moovx.invalid')
    || !persona.email.startsWith('phase6-v2-')
    || persona.email.includes('+')
  )) {
    throw new Error('Persona email must use the synthetic moovx.invalid domain')
  }
  if (JSON.stringify(manifest).match(/sk_(?:live|test)_|cus_|sub_|acct_/)) {
    throw new Error('Stripe-shaped identifier forbidden in seed manifest')
  }
}

export function buildPhase6SeedSql(manifest, { transaction = true } = {}) {
  assertManifest(manifest)
  const people = new Map(manifest.personas.map(persona => [persona.key, persona]))
  const clients = manifest.personas.filter(persona => persona.role === 'client')
  const fixtures = phase6PlanFixtures()
  const expectedAuthRows = manifest.personas.map(persona =>
    `      (${sqlString(persona.id)}::uuid, ${sqlString(persona.email)})`)
    .join(',\n')
  const lines = [
    '-- Generated from phase6-auth-v2-manifest.json. Do not edit manually.',
    '-- Relational staging data only. Auth users are read-only prerequisites.',
    ...(transaction ? ['BEGIN;'] : []),
    "SET LOCAL statement_timeout = '60s';",
    "SET LOCAL lock_timeout = '10s';",
    '',
    'DO $phase6_auth_precondition$',
    'DECLARE',
    '  v_verified_count integer;',
    'BEGIN',
    '  WITH expected(id, email) AS (',
    '    VALUES',
    expectedAuthRows,
    '  )',
    '  SELECT count(*) INTO v_verified_count',
    '  FROM expected',
    '  JOIN auth.users AS users',
    '    ON users.id = expected.id',
    '   AND lower(users.email) = lower(expected.email)',
    '   AND users.email_confirmed_at IS NOT NULL',
    "   AND users.encrypted_password IS NOT NULL",
    "   AND users.encrypted_password <> ''",
    '   AND users.instance_id IS NOT NULL',
    '  WHERE EXISTS (',
    '    SELECT 1',
    '    FROM auth.identities AS identities',
    '    WHERE identities.user_id = expected.id',
    "      AND identities.provider = 'email'",
    "      AND lower(identities.identity_data->>'email') = lower(expected.email)",
    '  );',
    '  IF v_verified_count <> 9 THEN',
    "    RAISE EXCEPTION 'phase6 Auth v2 prerequisite mismatch';",
    '  END IF;',
    'END',
    '$phase6_auth_precondition$;',
    '',
    'INSERT INTO public.profiles',
    '  (id, email, full_name, role, status, subscription_type, subscription_status,',
    '   onboarding_completed, coach_onboarding_complete, objective, calorie_goal,',
    '   protein_goal, carbs_goal, fat_goal, training_location, preferred_locale,',
    '   needs_initial_generation, stripe_customer_id, stripe_subscription_id,',
    '   stripe_account_id, created_at, updated_at)',
    'VALUES',
    manifest.personas.map((persona, index) => [
      `  (${sqlString(persona.id)}::uuid`,
      `${sqlString(persona.email)}`,
      `${sqlString(persona.fullName)}`,
      `${sqlString(persona.role)}`,
      "'active'",
      `${sqlString(persona.subscriptionType)}`,
      `${sqlString(persona.subscriptionStatus)}`,
      'true',
      `${persona.role === 'coach'}`,
      `${sqlString(persona.objective)}`,
      `${2200 + index * 10}`,
      '130',
      '250',
      '70',
      "'gym'",
      "'fr'",
      'false',
      'NULL',
      'NULL',
      'NULL',
      `${sqlString(FIXED_TIMESTAMP)}::timestamptz`,
      `${sqlString(FIXED_TIMESTAMP)}::timestamptz)`,
    ].join(', ')).join(',\n'),
    'ON CONFLICT (id) DO UPDATE SET',
    '  email = EXCLUDED.email,',
    '  full_name = EXCLUDED.full_name,',
    '  role = EXCLUDED.role,',
    '  status = EXCLUDED.status,',
    '  subscription_type = EXCLUDED.subscription_type,',
    '  subscription_status = EXCLUDED.subscription_status,',
    '  onboarding_completed = EXCLUDED.onboarding_completed,',
    '  coach_onboarding_complete = EXCLUDED.coach_onboarding_complete,',
    '  objective = EXCLUDED.objective,',
    '  calorie_goal = EXCLUDED.calorie_goal,',
    '  protein_goal = EXCLUDED.protein_goal,',
    '  carbs_goal = EXCLUDED.carbs_goal,',
    '  fat_goal = EXCLUDED.fat_goal,',
    '  training_location = EXCLUDED.training_location,',
    '  preferred_locale = EXCLUDED.preferred_locale,',
    '  needs_initial_generation = EXCLUDED.needs_initial_generation,',
    '  stripe_customer_id = NULL,',
    '  stripe_subscription_id = NULL,',
    '  stripe_account_id = NULL,',
    '  updated_at = EXCLUDED.updated_at;',
    '',
  ]

  const relationCoach = people.get(manifest.relation.coachKey)
  const relationClient = people.get(manifest.relation.clientKey)
  lines.push(
    'INSERT INTO public.coach_clients',
    '  (id, coach_id, client_id, status, invited_by_coach, created_at)',
    `VALUES (${sqlString(manifest.relation.id)}::uuid, ${sqlString(relationCoach.id)}::uuid, ${sqlString(relationClient.id)}::uuid, ${sqlString(manifest.relation.status)}, ${manifest.relation.invitedByCoach}, ${sqlString(FIXED_TIMESTAMP)}::timestamptz)`,
    'ON CONFLICT (coach_id, client_id) DO UPDATE SET',
    '  status = EXCLUDED.status,',
    '  invited_by_coach = EXCLUDED.invited_by_coach;',
    '',
    'INSERT INTO public.meal_plans',
    '  (id, user_id, created_by, name, plan, active, created_at)',
    'VALUES',
    manifest.personalPlans.map(row => {
      const owner = people.get(row.ownerKey)
      return `  (${sqlString(row.id)}::uuid, ${sqlString(owner.id)}::uuid, NULL, ${sqlString(`Phase6 ${row.expectedStatus}`)}, ${jsonSql(fixtures[row.fixture])}, true, ${sqlString(FIXED_TIMESTAMP)}::timestamptz)`
    }).join(',\n'),
    'ON CONFLICT (id) DO UPDATE SET',
    '  user_id = EXCLUDED.user_id,',
    '  created_by = EXCLUDED.created_by,',
    '  name = EXCLUDED.name,',
    '  plan = EXCLUDED.plan,',
    '  active = EXCLUDED.active,',
    '  created_at = EXCLUDED.created_at;',
    '',
    'INSERT INTO public.client_meal_plans',
    '  (id, client_id, coach_id, plan, created_at, updated_at)',
    'VALUES',
    manifest.coachPlans.map(row => {
      const client = people.get(row.clientKey)
      const coach = people.get(row.coachKey)
      return `  (${sqlString(row.id)}::uuid, ${sqlString(client.id)}::uuid, ${sqlString(coach.id)}::uuid, ${jsonSql(fixtures[row.fixture])}, ${sqlString(FIXED_TIMESTAMP)}::timestamptz, ${sqlString(FIXED_TIMESTAMP)}::timestamptz)`
    }).join(',\n'),
    'ON CONFLICT (id) DO UPDATE SET',
    '  client_id = EXCLUDED.client_id,',
    '  coach_id = EXCLUDED.coach_id,',
    '  plan = EXCLUDED.plan,',
    '  created_at = EXCLUDED.created_at,',
    '  updated_at = EXCLUDED.updated_at;',
    '',
    'INSERT INTO public.saved_meals',
    '  (id, user_id, name, meal_type, foods, total_calories, total_protein, total_carbs, total_fat, created_at)',
    'VALUES',
    manifest.savedMeals.map(row => {
      const owner = people.get(row.ownerKey)
      const totals = row.fixture === 'canonical'
        ? [380, 13, 68, 7]
        : row.fixture === 'legacy'
          ? [144, 17, 3, 9]
          : [null, null, null, null]
      return `  (${sqlString(row.id)}::uuid, ${sqlString(owner.id)}::uuid, ${sqlString(row.name)}, ${sqlString(row.mealType)}, ${jsonSql(savedMealFoods(row.fixture))}, ${totals.map(value => value ?? 'NULL').join(', ')}, ${sqlString(FIXED_TIMESTAMP)}::timestamptz)`
    }).join(',\n'),
    'ON CONFLICT (id) DO UPDATE SET',
    '  user_id = EXCLUDED.user_id,',
    '  name = EXCLUDED.name,',
    '  meal_type = EXCLUDED.meal_type,',
    '  foods = EXCLUDED.foods,',
    '  total_calories = EXCLUDED.total_calories,',
    '  total_protein = EXCLUDED.total_protein,',
    '  total_carbs = EXCLUDED.total_carbs,',
    '  total_fat = EXCLUDED.total_fat,',
    '  created_at = EXCLUDED.created_at;',
    '',
  )

  const logRows = []
  let logIndex = 1
  for (const [clientIndex, client] of clients.entries()) {
    for (const [dateIndex, date] of manifest.dailyFoodLogs.dates.entries()) {
      const id = `${manifest.namespaces.dailyFoodLogs}-0000-4000-8000-${String(logIndex).padStart(12, '0')}`
      const calories = 400 + clientIndex * 10 + dateIndex * 5
      logRows.push(
        `  (${sqlString(id)}::uuid, ${sqlString(client.id)}::uuid, ${sqlString(date)}, ${sqlString(dateIndex === 0 ? 'lunch' : 'dinner')}, ${sqlString(`Phase6 food ${clientIndex + 1}-${dateIndex + 1}`)}, 100, ${calories}, 30, 40, 12, ${sqlString(FIXED_TIMESTAMP)}::timestamptz)`,
      )
      logIndex += 1
    }
  }
  lines.push(
    'INSERT INTO public.daily_food_logs',
    '  (id, user_id, date, meal_type, custom_name, quantity_g, calories, protein, carbs, fat, created_at)',
    'VALUES',
    logRows.join(',\n'),
    'ON CONFLICT (id) DO UPDATE SET',
    '  user_id = EXCLUDED.user_id,',
    '  date = EXCLUDED.date,',
    '  meal_type = EXCLUDED.meal_type,',
    '  custom_name = EXCLUDED.custom_name,',
    '  quantity_g = EXCLUDED.quantity_g,',
    '  calories = EXCLUDED.calories,',
    '  protein = EXCLUDED.protein,',
    '  carbs = EXCLUDED.carbs,',
    '  fat = EXCLUDED.fat,',
    '  created_at = EXCLUDED.created_at;',
    '',
    'INSERT INTO public.meal_tracking',
    '  (id, user_id, date, meal_type, completed, created_at)',
    'VALUES',
    clients.map((client, index) => {
      const id = `${manifest.namespaces.mealTracking}-0000-4000-8000-${String(index + 1).padStart(12, '0')}`
      return `  (${sqlString(id)}::uuid, ${sqlString(client.id)}::uuid, ${sqlString(manifest.mealTracking.date)}, 'lunch', ${index % 2 === 0}, ${sqlString(FIXED_TIMESTAMP)}::timestamptz)`
    }).join(',\n'),
    'ON CONFLICT (id) DO UPDATE SET',
    '  user_id = EXCLUDED.user_id,',
    '  date = EXCLUDED.date,',
    '  meal_type = EXCLUDED.meal_type,',
    '  completed = EXCLUDED.completed,',
    '  created_at = EXCLUDED.created_at;',
    '',
    'DO $phase6_assert$',
    'DECLARE',
    '  v_client_ids uuid[] := ARRAY[',
    `    ${clients.map(client => `${sqlString(client.id)}::uuid`).join(', ')}`,
    '  ];',
    'BEGIN',
    `  IF (SELECT count(*) FROM public.profiles WHERE id::text LIKE '${manifest.namespaces.users}-%') <> 9 THEN RAISE EXCEPTION 'phase6 profiles volume mismatch'; END IF;`,
    `  IF (SELECT count(*) FROM public.profiles WHERE id::text LIKE '${manifest.namespaces.users}-%' AND role = 'super_admin') <> 1 THEN RAISE EXCEPTION 'phase6 admin volume mismatch'; END IF;`,
    `  IF (SELECT count(*) FROM public.profiles WHERE id::text LIKE '${manifest.namespaces.users}-%' AND role = 'coach') <> 1 THEN RAISE EXCEPTION 'phase6 coach volume mismatch'; END IF;`,
    `  IF (SELECT count(*) FROM public.profiles WHERE id::text LIKE '${manifest.namespaces.users}-%' AND role = 'client') <> 7 THEN RAISE EXCEPTION 'phase6 client volume mismatch'; END IF;`,
    `  IF (SELECT count(*) FROM public.coach_clients WHERE id::text LIKE '${manifest.namespaces.coachClients}-%' AND status = 'active') <> 1 THEN RAISE EXCEPTION 'phase6 relation volume mismatch'; END IF;`,
    `  IF (SELECT count(*) FROM public.meal_plans WHERE id::text LIKE '${manifest.namespaces.mealPlans}-%') <> 6 THEN RAISE EXCEPTION 'phase6 meal_plans volume mismatch'; END IF;`,
    `  IF (SELECT count(*) FROM public.client_meal_plans WHERE id::text LIKE '${manifest.namespaces.clientMealPlans}-%') <> 2 THEN RAISE EXCEPTION 'phase6 client_meal_plans volume mismatch'; END IF;`,
    `  IF (SELECT count(*) FROM public.saved_meals WHERE id::text LIKE '${manifest.namespaces.savedMeals}-%') <> 4 THEN RAISE EXCEPTION 'phase6 saved_meals volume mismatch'; END IF;`,
    `  IF (SELECT count(*) FROM public.daily_food_logs WHERE id::text LIKE '${manifest.namespaces.dailyFoodLogs}-%') <> 14 THEN RAISE EXCEPTION 'phase6 daily_food_logs volume mismatch'; END IF;`,
    `  IF (SELECT count(*) FROM public.meal_tracking WHERE id::text LIKE '${manifest.namespaces.mealTracking}-%') <> 7 THEN RAISE EXCEPTION 'phase6 meal_tracking volume mismatch'; END IF;`,
    `  IF EXISTS (SELECT 1 FROM public.meal_plans WHERE id::text LIKE '${manifest.namespaces.mealPlans}-%' AND NOT (user_id = ANY(v_client_ids))) THEN RAISE EXCEPTION 'phase6 foreign meal plan owner'; END IF;`,
    `  IF EXISTS (SELECT 1 FROM public.saved_meals WHERE id::text LIKE '${manifest.namespaces.savedMeals}-%' AND NOT (user_id = ANY(v_client_ids))) THEN RAISE EXCEPTION 'phase6 foreign saved meal owner'; END IF;`,
    `  IF EXISTS (SELECT 1 FROM public.daily_food_logs WHERE id::text LIKE '${manifest.namespaces.dailyFoodLogs}-%' AND NOT (user_id = ANY(v_client_ids))) THEN RAISE EXCEPTION 'phase6 foreign food log owner'; END IF;`,
    `  IF EXISTS (SELECT 1 FROM public.meal_tracking WHERE id::text LIKE '${manifest.namespaces.mealTracking}-%' AND NOT (user_id = ANY(v_client_ids))) THEN RAISE EXCEPTION 'phase6 foreign tracking owner'; END IF;`,
    `  IF EXISTS (SELECT 1 FROM public.profiles WHERE id::text LIKE '${manifest.namespaces.users}-%' AND (stripe_customer_id IS NOT NULL OR stripe_subscription_id IS NOT NULL OR stripe_account_id IS NOT NULL)) THEN RAISE EXCEPTION 'phase6 Stripe id forbidden'; END IF;`,
    'END',
    '$phase6_assert$;',
    '',
    ...(transaction ? ['COMMIT;'] : []),
    '',
  )
  return lines.join('\n')
}

function main() {
  const manifestPath = resolve(
    process.argv[2] ?? 'scripts/preproduction/phase6-auth-v2-manifest.json',
  )
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  process.stdout.write(buildPhase6SeedSql(manifest))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    process.stderr.write(
      `Phase 6 seed generation refused: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    )
    process.exitCode = 1
  }
}
