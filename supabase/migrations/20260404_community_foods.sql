CREATE TABLE IF NOT EXISTS community_foods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  brand text,
  barcode text UNIQUE,
  calories_per_100g numeric NOT NULL,
  protein_per_100g numeric DEFAULT 0,
  carbs_per_100g numeric DEFAULT 0,
  fat_per_100g numeric DEFAULT 0,
  fiber_per_100g numeric DEFAULT 0,
  serving_size_g numeric DEFAULT 100,
  serving_name text DEFAULT '100g',
  created_by uuid REFERENCES auth.users(id),
  verified boolean DEFAULT false,
  uses_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_foods_name ON community_foods USING gin(to_tsvector('french', name));
CREATE INDEX IF NOT EXISTS idx_community_foods_barcode ON community_foods(barcode);

ALTER TABLE community_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read all" ON community_foods FOR SELECT USING (true);
CREATE POLICY "insert auth" ON community_foods FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS daily_food_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  meal_type text NOT NULL,
  food_id uuid REFERENCES community_foods(id),
  custom_name text,
  quantity_g numeric NOT NULL DEFAULT 100,
  calories numeric NOT NULL,
  protein numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fat numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE daily_food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own logs" ON daily_food_logs FOR ALL USING (auth.uid() = user_id);
