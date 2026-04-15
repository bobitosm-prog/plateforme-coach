-- Fix RLS policies for gamification tables

-- user_badges: ensure user can read/insert their own
DO $$ BEGIN
  CREATE POLICY "user_badges_select_own" ON user_badges FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "user_badges_insert_own" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- user_xp: ensure user can read/insert/update their own
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can upsert own xp" ON user_xp;
  DROP POLICY IF EXISTS "Users can update own xp" ON user_xp;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "user_xp_all_own" ON user_xp FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ensure badges are seeded (re-run in case migration wasn't applied)
INSERT INTO badges (id, name, description, category, xp_reward, icon, condition_type, condition_value, sort_order) VALUES
  ('first_workout', 'Premier Pas', '1ère séance complétée', 'training', 10, 'star', 'workout_count', 1, 1),
  ('10_workouts', '10 Séances', 'Régulier', 'training', 20, 'grid', 'workout_count', 10, 2),
  ('50_workouts', '50 Séances', 'Machine', 'training', 30, 'home', 'workout_count', 50, 3),
  ('volume_10t', 'Volume 10T', '10 tonnes soulevées', 'training', 40, 'clock', 'total_volume', 10000, 4),
  ('volume_50t', 'Volume 50T', 'Titan', 'training', 50, 'star-big', 'total_volume', 50000, 5),
  ('first_pr', 'Premier PR', 'Record personnel', 'training', 25, 'chart', 'pr_count', 1, 6),
  ('first_meal', '1er Repas', 'Repas loggé', 'nutrition', 10, 'doc', 'meal_count', 1, 1),
  ('first_weight', '1ère Pesée', 'Poids enregistré', 'nutrition', 10, 'list', 'weight_log_count', 1, 2),
  ('plan_7d', 'Plan 7J', '7j repas cochés', 'nutrition', 30, 'clock', 'nutrition_streak', 7, 3),
  ('scanner_50', 'Scanner Pro', '50 aliments scannés', 'nutrition', 20, 'scan', 'scan_count', 50, 4),
  ('macros_perfect', 'Macros Parfaits', 'Macros cible 3j', 'nutrition', 35, 'target', 'macros_on_target', 3, 5),
  ('streak_7', 'Semaine', '7 jours streak', 'streak', 15, 'flame', 'streak_days', 7, 1),
  ('streak_30', 'Mois Acier', '30 jours streak', 'streak', 50, 'flame-plus', 'streak_days', 30, 2),
  ('streak_90', 'Trimestre', '90 jours streak', 'streak', 100, 'flame-star', 'streak_days', 90, 3),
  ('streak_180', '6 Mois', 'Demi-année', 'streak', 150, 'flame-crown', 'streak_days', 180, 4),
  ('streak_365', '1 An', 'Légende', 'streak', 300, 'flame-legend', 'streak_days', 365, 5),
  ('first_photo', 'Avant/Après', '1ère photo uploadée', 'social', 15, 'camera', 'photo_count', 1, 1),
  ('share', 'Partageur', 'Partage ton profil', 'social', 10, 'share', 'share_count', 1, 2),
  ('referral', 'Ambassadeur', 'Parraine un ami', 'social', 50, 'users', 'referral_count', 1, 3),
  ('lifetime', 'À Vie', 'Abonnement lifetime', 'social', 100, 'crown', 'subscription_type', 1, 4)
ON CONFLICT (id) DO NOTHING;
