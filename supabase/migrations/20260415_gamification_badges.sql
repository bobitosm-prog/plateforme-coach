-- Gamification system: badges, user_badges, user_xp

CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  xp_reward INT NOT NULL DEFAULT 10,
  icon TEXT,
  condition_type TEXT NOT NULL,
  condition_value INT NOT NULL,
  sort_order INT DEFAULT 0
);

-- user_badges already exists but may need badge_id column
-- Check and add if needed
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_badges' AND column_name = 'badge_id') THEN
    ALTER TABLE user_badges ADD COLUMN badge_id TEXT REFERENCES badges(id);
  END IF;
END $$;

-- Ensure unique constraint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_badges_user_badge_unique') THEN
    ALTER TABLE user_badges ADD CONSTRAINT user_badges_user_badge_unique UNIQUE(user_id, badge_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS user_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  total_xp INT DEFAULT 0,
  level INT DEFAULT 1,
  level_name TEXT DEFAULT 'Débutant'
);

-- RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read badges" ON badges FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can read own xp" ON user_xp FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can upsert own xp" ON user_xp FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own xp" ON user_xp FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed badges
INSERT INTO badges VALUES
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
