-- Generated from phase6-seed-manifest.json. Do not edit manually.
-- Synthetic, namespace-scoped staging data only.
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '10s';

INSERT INTO auth.users
  (id, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at)
VALUES
  ('76000000-0000-4000-8000-000000000001'::uuid, 'phase6-admin@moovx.invalid', '2026-07-26T00:00:00.000Z'::timestamptz, '{"role":"super_admin","synthetic":true,"seed":"moovx-phase6-staging-seed-v1"}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000000-0000-4000-8000-000000000002'::uuid, 'phase6-coach@moovx.invalid', '2026-07-26T00:00:00.000Z'::timestamptz, '{"role":"coach","synthetic":true,"seed":"moovx-phase6-staging-seed-v1"}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000000-0000-4000-8000-000000000003'::uuid, 'phase6-client-1@moovx.invalid', '2026-07-26T00:00:00.000Z'::timestamptz, '{"role":"client","synthetic":true,"seed":"moovx-phase6-staging-seed-v1"}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000000-0000-4000-8000-000000000004'::uuid, 'phase6-client-2@moovx.invalid', '2026-07-26T00:00:00.000Z'::timestamptz, '{"role":"client","synthetic":true,"seed":"moovx-phase6-staging-seed-v1"}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000000-0000-4000-8000-000000000005'::uuid, 'phase6-client-3@moovx.invalid', '2026-07-26T00:00:00.000Z'::timestamptz, '{"role":"client","synthetic":true,"seed":"moovx-phase6-staging-seed-v1"}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000000-0000-4000-8000-000000000006'::uuid, 'phase6-client-4@moovx.invalid', '2026-07-26T00:00:00.000Z'::timestamptz, '{"role":"client","synthetic":true,"seed":"moovx-phase6-staging-seed-v1"}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000000-0000-4000-8000-000000000007'::uuid, 'phase6-client-5@moovx.invalid', '2026-07-26T00:00:00.000Z'::timestamptz, '{"role":"client","synthetic":true,"seed":"moovx-phase6-staging-seed-v1"}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000000-0000-4000-8000-000000000008'::uuid, 'phase6-client-6@moovx.invalid', '2026-07-26T00:00:00.000Z'::timestamptz, '{"role":"client","synthetic":true,"seed":"moovx-phase6-staging-seed-v1"}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000000-0000-4000-8000-000000000009'::uuid, 'phase6-client-7@moovx.invalid', '2026-07-26T00:00:00.000Z'::timestamptz, '{"role":"client","synthetic":true,"seed":"moovx-phase6-staging-seed-v1"}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  updated_at = EXCLUDED.updated_at;

INSERT INTO public.profiles
  (id, email, full_name, role, subscription_type, subscription_status,
   onboarding_completed, coach_onboarding_complete, objective, calorie_goal,
   protein_goal, carbs_goal, fat_goal, training_location, preferred_locale,
   needs_initial_generation, stripe_customer_id, stripe_subscription_id,
   stripe_account_id, created_at, updated_at)
VALUES
  ('76000000-0000-4000-8000-000000000001'::uuid, 'phase6-admin@moovx.invalid', 'Phase6 admin', 'super_admin', 'client_monthly', 'active', true, false, 'maintain', 2200, 130, 250, 70, 'gym', 'fr', false, NULL, NULL, NULL, '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000000-0000-4000-8000-000000000002'::uuid, 'phase6-coach@moovx.invalid', 'Phase6 coach', 'coach', 'coach_monthly', 'active', true, true, 'maintain', 2210, 130, 250, 70, 'gym', 'fr', false, NULL, NULL, NULL, '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000000-0000-4000-8000-000000000003'::uuid, 'phase6-client-1@moovx.invalid', 'Phase6 clientCanonical', 'client', 'client_monthly', 'active', true, false, 'cut', 2220, 130, 250, 70, 'gym', 'fr', false, NULL, NULL, NULL, '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000000-0000-4000-8000-000000000004'::uuid, 'phase6-client-2@moovx.invalid', 'Phase6 clientLegacy', 'client', 'invited', 'active', true, false, 'maintain', 2230, 130, 250, 70, 'gym', 'fr', false, NULL, NULL, NULL, '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000000-0000-4000-8000-000000000005'::uuid, 'phase6-client-3@moovx.invalid', 'Phase6 clientConflict', 'client', 'lifetime', 'lifetime', true, false, 'mass', 2240, 130, 250, 70, 'gym', 'fr', false, NULL, NULL, NULL, '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000000-0000-4000-8000-000000000006'::uuid, 'phase6-client-4@moovx.invalid', 'Phase6 clientInvalid', 'client', 'client_monthly', 'trialing', true, false, 'cut', 2250, 130, 250, 70, 'gym', 'fr', false, NULL, NULL, NULL, '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000000-0000-4000-8000-000000000007'::uuid, 'phase6-client-5@moovx.invalid', 'Phase6 clientUnsupported', 'client', 'client_monthly', 'past_due', true, false, 'maintain', 2260, 130, 250, 70, 'gym', 'fr', false, NULL, NULL, NULL, '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000000-0000-4000-8000-000000000008'::uuid, 'phase6-client-6@moovx.invalid', 'Phase6 clientCanonicalSecond', 'client', 'client_monthly', 'canceled', true, false, 'mass', 2270, 130, 250, 70, 'gym', 'fr', false, NULL, NULL, NULL, '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000000-0000-4000-8000-000000000009'::uuid, 'phase6-client-7@moovx.invalid', 'Phase6 clientNotFound', 'client', 'client_monthly', 'expired', true, false, 'cut', 2280, 130, 250, 70, 'gym', 'fr', false, NULL, NULL, NULL, '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  subscription_type = EXCLUDED.subscription_type,
  subscription_status = EXCLUDED.subscription_status,
  onboarding_completed = EXCLUDED.onboarding_completed,
  coach_onboarding_complete = EXCLUDED.coach_onboarding_complete,
  objective = EXCLUDED.objective,
  calorie_goal = EXCLUDED.calorie_goal,
  protein_goal = EXCLUDED.protein_goal,
  carbs_goal = EXCLUDED.carbs_goal,
  fat_goal = EXCLUDED.fat_goal,
  training_location = EXCLUDED.training_location,
  preferred_locale = EXCLUDED.preferred_locale,
  needs_initial_generation = EXCLUDED.needs_initial_generation,
  stripe_customer_id = NULL,
  stripe_subscription_id = NULL,
  stripe_account_id = NULL,
  updated_at = EXCLUDED.updated_at;

INSERT INTO public.coach_clients
  (id, coach_id, client_id, status, invited_by_coach, created_at)
VALUES ('76000001-0000-4000-8000-000000000001'::uuid, '76000000-0000-4000-8000-000000000002'::uuid, '76000000-0000-4000-8000-000000000004'::uuid, 'active', true, '2026-07-26T00:00:00.000Z'::timestamptz)
ON CONFLICT (coach_id, client_id) DO UPDATE SET
  status = EXCLUDED.status,
  invited_by_coach = EXCLUDED.invited_by_coach;

INSERT INTO public.meal_plans
  (id, user_id, created_by, name, plan, active, created_at)
VALUES
  ('76000002-0000-4000-8000-000000000001'::uuid, '76000000-0000-4000-8000-000000000003'::uuid, NULL, 'Phase6 canonical', '{"schemaVersion":1,"documentType":"nutrition_plan","planVersion":1,"timezone":"Europe/Zurich","content":{"days":[{"day":"monday","sourceStatus":"observed","meals":[],"declaredTotals":null},{"day":"tuesday","sourceStatus":"observed","meals":[],"declaredTotals":null},{"day":"wednesday","sourceStatus":"observed","meals":[],"declaredTotals":null},{"day":"thursday","sourceStatus":"observed","meals":[],"declaredTotals":null},{"day":"friday","sourceStatus":"observed","meals":[],"declaredTotals":null},{"day":"saturday","sourceStatus":"observed","meals":[],"declaredTotals":null},{"day":"sunday","sourceStatus":"observed","meals":[],"declaredTotals":null}],"rules":[],"alternatives":[]},"targets":{"energyKcal":{"status":"known","value":2283,"provenance":"declared"},"proteinG":{"status":"known","value":134,"provenance":"declared"},"carbsG":{"status":"known","value":266,"provenance":"declared"},"fatG":{"status":"known","value":76,"provenance":"declared"},"fiberG":{"status":"unknown","value":null,"provenance":"legacy_unknown"}},"totals":{"declared":null,"calculated":null,"calculationStatus":"unavailable","calculationVersion":"nutrition-invariants-v1","calculatedAt":null},"provenance":{"source":"platform","sourceVersion":"phase6-seed-v1","legacyFormat":null,"generatedAt":"2026-07-26T00:00:00.000Z"},"warnings":[]}'::jsonb, true, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000002-0000-4000-8000-000000000002'::uuid, '76000000-0000-4000-8000-000000000004'::uuid, NULL, 'Phase6 legacy_converted', '{"lundi":{"meals":[{"type":"Déjeuner","foods":[{"name":"Phase6 riz synthétique","qty":100,"kcal":130,"prot":3,"carb":28,"fat":1}]}]},"mardi":{"meals":[]},"mercredi":{"meals":[]},"jeudi":{"meals":[]},"vendredi":{"meals":[]},"samedi":{"meals":[]},"dimanche":{"meals":[]}}'::jsonb, true, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000002-0000-4000-8000-000000000003'::uuid, '76000000-0000-4000-8000-000000000005'::uuid, NULL, 'Phase6 conflict', '{"lundi":{"meals":[{"type":"Déjeuner","foods":[{"name":"Phase6 riz synthétique","qty":100,"kcal":130,"prot":3,"carb":28,"fat":1,"protein":3,"proteins":4}]}]},"mardi":{"meals":[]},"mercredi":{"meals":[]},"jeudi":{"meals":[]},"vendredi":{"meals":[]},"samedi":{"meals":[]},"dimanche":{"meals":[]}}'::jsonb, true, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000002-0000-4000-8000-000000000004'::uuid, '76000000-0000-4000-8000-000000000006'::uuid, NULL, 'Phase6 invalid', '{"lundi":{"meals":[{"type":"Déjeuner","foods":[{"name":"Phase6 riz synthétique","qty":100,"kcal":-1,"prot":3,"carb":28,"fat":1}]}]},"mardi":{"meals":[]},"mercredi":{"meals":[]},"jeudi":{"meals":[]},"vendredi":{"meals":[]},"samedi":{"meals":[]},"dimanche":{"meals":[]}}'::jsonb, true, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000002-0000-4000-8000-000000000005'::uuid, '76000000-0000-4000-8000-000000000007'::uuid, NULL, 'Phase6 legacy_unsupported', '{"monday":{"meals":[]}}'::jsonb, true, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000002-0000-4000-8000-000000000006'::uuid, '76000000-0000-4000-8000-000000000008'::uuid, NULL, 'Phase6 canonical', '{"schemaVersion":1,"documentType":"nutrition_plan","planVersion":1,"timezone":"Europe/Zurich","content":{"days":[{"day":"monday","sourceStatus":"observed","meals":[],"declaredTotals":null},{"day":"tuesday","sourceStatus":"observed","meals":[],"declaredTotals":null},{"day":"wednesday","sourceStatus":"observed","meals":[],"declaredTotals":null},{"day":"thursday","sourceStatus":"observed","meals":[],"declaredTotals":null},{"day":"friday","sourceStatus":"observed","meals":[],"declaredTotals":null},{"day":"saturday","sourceStatus":"observed","meals":[],"declaredTotals":null},{"day":"sunday","sourceStatus":"observed","meals":[],"declaredTotals":null}],"rules":[],"alternatives":[]},"targets":{"energyKcal":{"status":"known","value":2283,"provenance":"declared"},"proteinG":{"status":"known","value":134,"provenance":"declared"},"carbsG":{"status":"known","value":266,"provenance":"declared"},"fatG":{"status":"known","value":76,"provenance":"declared"},"fiberG":{"status":"unknown","value":null,"provenance":"legacy_unknown"}},"totals":{"declared":null,"calculated":null,"calculationStatus":"unavailable","calculationVersion":"nutrition-invariants-v1","calculatedAt":null},"provenance":{"source":"platform","sourceVersion":"phase6-seed-v1","legacyFormat":null,"generatedAt":"2026-07-26T00:00:00.000Z"},"warnings":[]}'::jsonb, true, '2026-07-26T00:00:00.000Z'::timestamptz)
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  created_by = EXCLUDED.created_by,
  name = EXCLUDED.name,
  plan = EXCLUDED.plan,
  active = EXCLUDED.active,
  created_at = EXCLUDED.created_at;

INSERT INTO public.client_meal_plans
  (id, client_id, coach_id, plan, created_at, updated_at)
VALUES
  ('76000003-0000-4000-8000-000000000001'::uuid, '76000000-0000-4000-8000-000000000003'::uuid, '76000000-0000-4000-8000-000000000002'::uuid, '{"schemaVersion":1,"documentType":"nutrition_plan","planVersion":1,"timezone":"Europe/Zurich","content":{"days":[{"day":"monday","sourceStatus":"observed","meals":[],"declaredTotals":null},{"day":"tuesday","sourceStatus":"observed","meals":[],"declaredTotals":null},{"day":"wednesday","sourceStatus":"observed","meals":[],"declaredTotals":null},{"day":"thursday","sourceStatus":"observed","meals":[],"declaredTotals":null},{"day":"friday","sourceStatus":"observed","meals":[],"declaredTotals":null},{"day":"saturday","sourceStatus":"observed","meals":[],"declaredTotals":null},{"day":"sunday","sourceStatus":"observed","meals":[],"declaredTotals":null}],"rules":[],"alternatives":[]},"targets":{"energyKcal":{"status":"known","value":2283,"provenance":"declared"},"proteinG":{"status":"known","value":134,"provenance":"declared"},"carbsG":{"status":"known","value":266,"provenance":"declared"},"fatG":{"status":"known","value":76,"provenance":"declared"},"fiberG":{"status":"unknown","value":null,"provenance":"legacy_unknown"}},"totals":{"declared":null,"calculated":null,"calculationStatus":"unavailable","calculationVersion":"nutrition-invariants-v1","calculatedAt":null},"provenance":{"source":"platform","sourceVersion":"phase6-seed-v1","legacyFormat":null,"generatedAt":"2026-07-26T00:00:00.000Z"},"warnings":[]}'::jsonb, '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000003-0000-4000-8000-000000000002'::uuid, '76000000-0000-4000-8000-000000000004'::uuid, '76000000-0000-4000-8000-000000000002'::uuid, '{"lundi":{"meals":[{"type":"Déjeuner","foods":[{"name":"Phase6 riz synthétique","qty":100,"kcal":130,"prot":3,"carb":28,"fat":1}]}]},"mardi":{"meals":[]},"mercredi":{"meals":[]},"jeudi":{"meals":[]},"vendredi":{"meals":[]},"samedi":{"meals":[]},"dimanche":{"meals":[]}}'::jsonb, '2026-07-26T00:00:00.000Z'::timestamptz, '2026-07-26T00:00:00.000Z'::timestamptz)
ON CONFLICT (id) DO UPDATE SET
  client_id = EXCLUDED.client_id,
  coach_id = EXCLUDED.coach_id,
  plan = EXCLUDED.plan,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

INSERT INTO public.saved_meals
  (id, user_id, name, meal_type, foods, total_calories, total_protein, total_carbs, total_fat, created_at)
VALUES
  ('76000004-0000-4000-8000-000000000001'::uuid, '76000000-0000-4000-8000-000000000003'::uuid, 'Phase6 canonical breakfast', 'breakfast', '[{"name":"Phase6 avoine synthétique","quantity":100,"calories":380,"protein":13,"carbs":68,"fat":7}]'::jsonb, 380, 13, 68, 7, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000004-0000-4000-8000-000000000002'::uuid, '76000000-0000-4000-8000-000000000004'::uuid, 'Phase6 legacy lunch', 'lunch', '[{"aliment":"Phase6 tofu synthétique","quantite_g":100,"kcal":144,"proteines":17,"glucides":3,"lipides":9}]'::jsonb, 144, 17, 3, 9, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000004-0000-4000-8000-000000000003'::uuid, '76000000-0000-4000-8000-000000000005'::uuid, 'Phase6 alias conflict', 'snack', '[{"name":"Phase6 alias synthétique","quantity":100,"calories":100,"protein":10,"proteins":11,"carbs":5,"fat":2}]'::jsonb, NULL, NULL, NULL, NULL, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000004-0000-4000-8000-000000000004'::uuid, '76000000-0000-4000-8000-000000000006'::uuid, 'Phase6 invalid snapshot', 'dinner', '[{"name":"Phase6 invalide synthétique","quantity":100,"calories":-1,"protein":1,"carbs":1,"fat":1}]'::jsonb, NULL, NULL, NULL, NULL, '2026-07-26T00:00:00.000Z'::timestamptz)
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  name = EXCLUDED.name,
  meal_type = EXCLUDED.meal_type,
  foods = EXCLUDED.foods,
  total_calories = EXCLUDED.total_calories,
  total_protein = EXCLUDED.total_protein,
  total_carbs = EXCLUDED.total_carbs,
  total_fat = EXCLUDED.total_fat,
  created_at = EXCLUDED.created_at;

INSERT INTO public.daily_food_logs
  (id, user_id, date, meal_type, custom_name, quantity_g, calories, protein, carbs, fat, created_at)
VALUES
  ('76000005-0000-4000-8000-000000000001'::uuid, '76000000-0000-4000-8000-000000000003'::uuid, '2026-07-20', 'lunch', 'Phase6 food 1-1', 100, 400, 30, 40, 12, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000005-0000-4000-8000-000000000002'::uuid, '76000000-0000-4000-8000-000000000003'::uuid, '2026-07-21', 'dinner', 'Phase6 food 1-2', 100, 405, 30, 40, 12, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000005-0000-4000-8000-000000000003'::uuid, '76000000-0000-4000-8000-000000000004'::uuid, '2026-07-20', 'lunch', 'Phase6 food 2-1', 100, 410, 30, 40, 12, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000005-0000-4000-8000-000000000004'::uuid, '76000000-0000-4000-8000-000000000004'::uuid, '2026-07-21', 'dinner', 'Phase6 food 2-2', 100, 415, 30, 40, 12, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000005-0000-4000-8000-000000000005'::uuid, '76000000-0000-4000-8000-000000000005'::uuid, '2026-07-20', 'lunch', 'Phase6 food 3-1', 100, 420, 30, 40, 12, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000005-0000-4000-8000-000000000006'::uuid, '76000000-0000-4000-8000-000000000005'::uuid, '2026-07-21', 'dinner', 'Phase6 food 3-2', 100, 425, 30, 40, 12, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000005-0000-4000-8000-000000000007'::uuid, '76000000-0000-4000-8000-000000000006'::uuid, '2026-07-20', 'lunch', 'Phase6 food 4-1', 100, 430, 30, 40, 12, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000005-0000-4000-8000-000000000008'::uuid, '76000000-0000-4000-8000-000000000006'::uuid, '2026-07-21', 'dinner', 'Phase6 food 4-2', 100, 435, 30, 40, 12, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000005-0000-4000-8000-000000000009'::uuid, '76000000-0000-4000-8000-000000000007'::uuid, '2026-07-20', 'lunch', 'Phase6 food 5-1', 100, 440, 30, 40, 12, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000005-0000-4000-8000-000000000010'::uuid, '76000000-0000-4000-8000-000000000007'::uuid, '2026-07-21', 'dinner', 'Phase6 food 5-2', 100, 445, 30, 40, 12, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000005-0000-4000-8000-000000000011'::uuid, '76000000-0000-4000-8000-000000000008'::uuid, '2026-07-20', 'lunch', 'Phase6 food 6-1', 100, 450, 30, 40, 12, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000005-0000-4000-8000-000000000012'::uuid, '76000000-0000-4000-8000-000000000008'::uuid, '2026-07-21', 'dinner', 'Phase6 food 6-2', 100, 455, 30, 40, 12, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000005-0000-4000-8000-000000000013'::uuid, '76000000-0000-4000-8000-000000000009'::uuid, '2026-07-20', 'lunch', 'Phase6 food 7-1', 100, 460, 30, 40, 12, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000005-0000-4000-8000-000000000014'::uuid, '76000000-0000-4000-8000-000000000009'::uuid, '2026-07-21', 'dinner', 'Phase6 food 7-2', 100, 465, 30, 40, 12, '2026-07-26T00:00:00.000Z'::timestamptz)
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  date = EXCLUDED.date,
  meal_type = EXCLUDED.meal_type,
  custom_name = EXCLUDED.custom_name,
  quantity_g = EXCLUDED.quantity_g,
  calories = EXCLUDED.calories,
  protein = EXCLUDED.protein,
  carbs = EXCLUDED.carbs,
  fat = EXCLUDED.fat,
  created_at = EXCLUDED.created_at;

INSERT INTO public.meal_tracking
  (id, user_id, date, meal_type, completed, created_at)
VALUES
  ('76000006-0000-4000-8000-000000000001'::uuid, '76000000-0000-4000-8000-000000000003'::uuid, '2026-07-21', 'lunch', true, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000006-0000-4000-8000-000000000002'::uuid, '76000000-0000-4000-8000-000000000004'::uuid, '2026-07-21', 'lunch', false, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000006-0000-4000-8000-000000000003'::uuid, '76000000-0000-4000-8000-000000000005'::uuid, '2026-07-21', 'lunch', true, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000006-0000-4000-8000-000000000004'::uuid, '76000000-0000-4000-8000-000000000006'::uuid, '2026-07-21', 'lunch', false, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000006-0000-4000-8000-000000000005'::uuid, '76000000-0000-4000-8000-000000000007'::uuid, '2026-07-21', 'lunch', true, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000006-0000-4000-8000-000000000006'::uuid, '76000000-0000-4000-8000-000000000008'::uuid, '2026-07-21', 'lunch', false, '2026-07-26T00:00:00.000Z'::timestamptz),
  ('76000006-0000-4000-8000-000000000007'::uuid, '76000000-0000-4000-8000-000000000009'::uuid, '2026-07-21', 'lunch', true, '2026-07-26T00:00:00.000Z'::timestamptz)
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  date = EXCLUDED.date,
  meal_type = EXCLUDED.meal_type,
  completed = EXCLUDED.completed,
  created_at = EXCLUDED.created_at;

DO $phase6_assert$
DECLARE
  v_client_ids uuid[] := ARRAY[
    '76000000-0000-4000-8000-000000000003'::uuid, '76000000-0000-4000-8000-000000000004'::uuid, '76000000-0000-4000-8000-000000000005'::uuid, '76000000-0000-4000-8000-000000000006'::uuid, '76000000-0000-4000-8000-000000000007'::uuid, '76000000-0000-4000-8000-000000000008'::uuid, '76000000-0000-4000-8000-000000000009'::uuid
  ];
BEGIN
  IF (SELECT count(*) FROM auth.users WHERE id::text LIKE '76000000-%') <> 9 THEN RAISE EXCEPTION 'phase6 auth.users volume mismatch'; END IF;
  IF (SELECT count(*) FROM public.profiles WHERE id::text LIKE '76000000-%') <> 9 THEN RAISE EXCEPTION 'phase6 profiles volume mismatch'; END IF;
  IF (SELECT count(*) FROM public.profiles WHERE id::text LIKE '76000000-%' AND role = 'super_admin') <> 1 THEN RAISE EXCEPTION 'phase6 admin volume mismatch'; END IF;
  IF (SELECT count(*) FROM public.profiles WHERE id::text LIKE '76000000-%' AND role = 'coach') <> 1 THEN RAISE EXCEPTION 'phase6 coach volume mismatch'; END IF;
  IF (SELECT count(*) FROM public.profiles WHERE id::text LIKE '76000000-%' AND role = 'client') <> 7 THEN RAISE EXCEPTION 'phase6 client volume mismatch'; END IF;
  IF (SELECT count(*) FROM public.coach_clients WHERE id::text LIKE '76000001-%' AND status = 'active') <> 1 THEN RAISE EXCEPTION 'phase6 relation volume mismatch'; END IF;
  IF (SELECT count(*) FROM public.meal_plans WHERE id::text LIKE '76000002-%') <> 6 THEN RAISE EXCEPTION 'phase6 meal_plans volume mismatch'; END IF;
  IF (SELECT count(*) FROM public.client_meal_plans WHERE id::text LIKE '76000003-%') <> 2 THEN RAISE EXCEPTION 'phase6 client_meal_plans volume mismatch'; END IF;
  IF (SELECT count(*) FROM public.saved_meals WHERE id::text LIKE '76000004-%') <> 4 THEN RAISE EXCEPTION 'phase6 saved_meals volume mismatch'; END IF;
  IF (SELECT count(*) FROM public.daily_food_logs WHERE id::text LIKE '76000005-%') <> 14 THEN RAISE EXCEPTION 'phase6 daily_food_logs volume mismatch'; END IF;
  IF (SELECT count(*) FROM public.meal_tracking WHERE id::text LIKE '76000006-%') <> 7 THEN RAISE EXCEPTION 'phase6 meal_tracking volume mismatch'; END IF;
  IF EXISTS (SELECT 1 FROM public.meal_plans WHERE id::text LIKE '76000002-%' AND NOT (user_id = ANY(v_client_ids))) THEN RAISE EXCEPTION 'phase6 foreign meal plan owner'; END IF;
  IF EXISTS (SELECT 1 FROM public.saved_meals WHERE id::text LIKE '76000004-%' AND NOT (user_id = ANY(v_client_ids))) THEN RAISE EXCEPTION 'phase6 foreign saved meal owner'; END IF;
  IF EXISTS (SELECT 1 FROM public.daily_food_logs WHERE id::text LIKE '76000005-%' AND NOT (user_id = ANY(v_client_ids))) THEN RAISE EXCEPTION 'phase6 foreign food log owner'; END IF;
  IF EXISTS (SELECT 1 FROM public.meal_tracking WHERE id::text LIKE '76000006-%' AND NOT (user_id = ANY(v_client_ids))) THEN RAISE EXCEPTION 'phase6 foreign tracking owner'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id::text LIKE '76000000-%' AND (stripe_customer_id IS NOT NULL OR stripe_subscription_id IS NOT NULL OR stripe_account_id IS NOT NULL)) THEN RAISE EXCEPTION 'phase6 Stripe id forbidden'; END IF;
END
$phase6_assert$;

COMMIT;
