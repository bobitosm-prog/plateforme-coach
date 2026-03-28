-- ============================================================
-- Migration: recipes table + RLS + seed public recipes
-- Date: 2026-03-28
-- ============================================================

-- 1. Create the recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  category      text NOT NULL CHECK (category IN ('petit-dejeuner','dejeuner','collation','diner','dessert','smoothie','snack')),
  prep_time_min integer DEFAULT 0,
  cook_time_min integer DEFAULT 0,
  servings      integer DEFAULT 1,
  calories_per_serving  integer,
  proteins_per_serving  numeric(5,1),
  carbs_per_serving     numeric(5,1),
  fat_per_serving       numeric(5,1),
  ingredients   jsonb NOT NULL DEFAULT '[]'::jsonb,
  instructions  jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags          text[] DEFAULT '{}',
  image_url     text,
  is_favorite   boolean DEFAULT false,
  is_public     boolean DEFAULT false,
  source        text CHECK (source IN ('ai','coach','user')),
  created_at    timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Users can read their own recipes
CREATE POLICY "users_select_own_recipes"
  ON recipes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can read all public recipes
CREATE POLICY "users_select_public_recipes"
  ON recipes FOR SELECT
  USING (is_public = true);

-- Users can insert their own recipes
CREATE POLICY "users_insert_own_recipes"
  ON recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own recipes
CREATE POLICY "users_update_own_recipes"
  ON recipes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own recipes
CREATE POLICY "users_delete_own_recipes"
  ON recipes FOR DELETE
  USING (auth.uid() = user_id);

-- Admin full access (service role bypasses RLS, but explicit policy for app-level admin)
CREATE POLICY "admin_all_recipes"
  ON recipes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND u.raw_user_meta_data ->> 'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND u.raw_user_meta_data ->> 'role' = 'admin'
    )
  );

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_recipes_user_id   ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_category  ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON recipes(is_public) WHERE is_public = true;

-- ============================================================
-- 4. Seed 5 public recipes (user_id = NULL, is_public = true)
-- ============================================================

INSERT INTO recipes (
  id, user_id, title, description, category,
  prep_time_min, cook_time_min, servings,
  calories_per_serving, proteins_per_serving, carbs_per_serving, fat_per_serving,
  ingredients, instructions, tags, image_url, is_favorite, is_public, source
) VALUES

-- Bowl Poulet Teriyaki
(
  'a1b2c3d4-0001-4000-a000-000000000001',
  NULL,
  'Bowl Poulet Teriyaki',
  'Un bowl gourmand et riche en proteines avec du poulet grille, du riz basmati et des legumes croquants nappes d''une sauce teriyaki maison.',
  'dejeuner',
  15, 20, 1,
  550, 42.0, 55.0, 14.0,
  '[
    {"name": "Blanc de poulet", "quantity": "180", "unit": "g"},
    {"name": "Riz basmati", "quantity": "80", "unit": "g"},
    {"name": "Brocoli", "quantity": "80", "unit": "g"},
    {"name": "Carotte", "quantity": "60", "unit": "g"},
    {"name": "Edamames", "quantity": "40", "unit": "g"},
    {"name": "Sauce soja", "quantity": "15", "unit": "ml"},
    {"name": "Miel", "quantity": "10", "unit": "g"},
    {"name": "Gingembre frais", "quantity": "5", "unit": "g"},
    {"name": "Ail", "quantity": "1", "unit": "gousse"},
    {"name": "Graines de sesame", "quantity": "5", "unit": "g"},
    {"name": "Huile de sesame", "quantity": "5", "unit": "ml"}
  ]'::jsonb,
  '[
    "Cuire le riz basmati selon les instructions du paquet et reserver.",
    "Couper le blanc de poulet en lamelles et les faire griller a feu vif avec un filet d''huile de sesame pendant 6-7 minutes.",
    "Preparer la sauce teriyaki : melanger la sauce soja, le miel, le gingembre rape et l''ail emince dans un petit bol.",
    "Faire sauter les brocolis et les carottes taillees en rondelles pendant 4 minutes a la poele.",
    "Verser la sauce teriyaki sur le poulet et laisser carameliser 2 minutes.",
    "Dresser le bowl : riz au fond, poulet teriyaki, legumes sautes et edamames.",
    "Parsemer de graines de sesame et servir chaud."
  ]'::jsonb,
  ARRAY['high-protein','meal-prep','bowl','asiatique'],
  NULL, false, true, 'coach'
),

-- Overnight Oats Proteines
(
  'a1b2c3d4-0002-4000-a000-000000000002',
  NULL,
  'Overnight Oats Proteines',
  'Des flocons d''avoine prepares la veille avec de la whey, du yaourt grec et des fruits pour un petit-dejeuner rapide et riche en proteines.',
  'petit-dejeuner',
  10, 0, 1,
  420, 35.0, 48.0, 10.0,
  '[
    {"name": "Flocons d''avoine", "quantity": "60", "unit": "g"},
    {"name": "Whey proteine vanille", "quantity": "30", "unit": "g"},
    {"name": "Yaourt grec 0%", "quantity": "100", "unit": "g"},
    {"name": "Lait d''amande", "quantity": "100", "unit": "ml"},
    {"name": "Graines de chia", "quantity": "10", "unit": "g"},
    {"name": "Banane", "quantity": "0.5", "unit": "piece"},
    {"name": "Myrtilles", "quantity": "40", "unit": "g"},
    {"name": "Cannelle", "quantity": "1", "unit": "pincee"}
  ]'::jsonb,
  '[
    "Dans un bocal ou un bol, melanger les flocons d''avoine, la whey proteine, les graines de chia et la cannelle.",
    "Ajouter le yaourt grec et le lait d''amande, bien remuer jusqu''a obtenir un melange homogene.",
    "Couvrir et placer au refrigerateur pendant au moins 6 heures ou toute la nuit.",
    "Le matin, remuer les overnight oats et ajouter un peu de lait si la texture est trop epaisse.",
    "Garnir avec les rondelles de banane et les myrtilles fraiches.",
    "Deguster froid directement du refrigerateur."
  ]'::jsonb,
  ARRAY['high-protein','meal-prep','petit-dejeuner','rapide','sans-cuisson'],
  NULL, false, true, 'coach'
),

-- Smoothie Power Banane-Beurre de Cacahuete
(
  'a1b2c3d4-0003-4000-a000-000000000003',
  NULL,
  'Smoothie Power Banane-Beurre de Cacahuete',
  'Un smoothie onctueux et energetique parfait en post-entrainement, avec de la whey, de la banane et du beurre de cacahuete.',
  'smoothie',
  5, 0, 1,
  480, 38.0, 45.0, 18.0,
  '[
    {"name": "Banane", "quantity": "1", "unit": "piece"},
    {"name": "Whey proteine chocolat", "quantity": "30", "unit": "g"},
    {"name": "Beurre de cacahuete", "quantity": "15", "unit": "g"},
    {"name": "Lait d''amande", "quantity": "250", "unit": "ml"},
    {"name": "Flocons d''avoine", "quantity": "20", "unit": "g"},
    {"name": "Cacao en poudre non sucre", "quantity": "5", "unit": "g"},
    {"name": "Glacons", "quantity": "4", "unit": "pieces"}
  ]'::jsonb,
  '[
    "Eplucher la banane et la couper en morceaux grossiers.",
    "Placer la banane, la whey proteine, le beurre de cacahuete, les flocons d''avoine et le cacao dans un blender.",
    "Ajouter le lait d''amande et les glacons.",
    "Mixer a puissance maximale pendant 45 a 60 secondes jusqu''a obtenir une texture lisse et onctueuse.",
    "Verser dans un grand verre et deguster immediatement apres l''entrainement."
  ]'::jsonb,
  ARRAY['high-protein','post-workout','smoothie','rapide','sans-cuisson'],
  NULL, false, true, 'coach'
),

-- Salade Cesar Proteinee
(
  'a1b2c3d4-0004-4000-a000-000000000004',
  NULL,
  'Salade Cesar Proteinee',
  'Une version fitness de la classique salade Cesar, avec du poulet grille, des oeufs durs et une sauce legere au yaourt grec.',
  'dejeuner',
  15, 10, 1,
  420, 45.0, 15.0, 20.0,
  '[
    {"name": "Blanc de poulet", "quantity": "150", "unit": "g"},
    {"name": "Laitue romaine", "quantity": "120", "unit": "g"},
    {"name": "Oeuf dur", "quantity": "1", "unit": "piece"},
    {"name": "Parmesan rape", "quantity": "15", "unit": "g"},
    {"name": "Yaourt grec 0%", "quantity": "30", "unit": "g"},
    {"name": "Moutarde de Dijon", "quantity": "5", "unit": "g"},
    {"name": "Jus de citron", "quantity": "10", "unit": "ml"},
    {"name": "Ail", "quantity": "0.5", "unit": "gousse"},
    {"name": "Huile d''olive", "quantity": "10", "unit": "ml"},
    {"name": "Pain complet", "quantity": "30", "unit": "g"},
    {"name": "Sel et poivre", "quantity": "1", "unit": "pincee"}
  ]'::jsonb,
  '[
    "Faire griller le blanc de poulet assaisonne de sel et poivre dans une poele chaude pendant 5-6 minutes de chaque cote. Laisser reposer puis trancher.",
    "Faire cuire l''oeuf dur pendant 10 minutes dans l''eau bouillante, refroidir et couper en quartiers.",
    "Couper le pain complet en petits cubes et les faire dorer a la poele avec un filet d''huile d''olive pour obtenir des croutons maison.",
    "Preparer la sauce Cesar legere : melanger le yaourt grec, la moutarde, le jus de citron, l''ail emince et un filet d''huile d''olive.",
    "Laver et essorer la laitue romaine, la couper en morceaux.",
    "Dresser la salade : disposer la romaine, ajouter le poulet tranche, les quartiers d''oeuf et les croutons.",
    "Napper de sauce Cesar, saupoudrer de parmesan rape et servir aussitot."
  ]'::jsonb,
  ARRAY['high-protein','salade','low-carb','classique'],
  NULL, false, true, 'coach'
),

-- Steak Patate Douce Fitness
(
  'a1b2c3d4-0005-4000-a000-000000000005',
  NULL,
  'Steak Patate Douce Fitness',
  'Un repas complet et equilibre avec un steak de boeuf maigre, de la patate douce rotie et des haricots verts, ideal pour la prise de muscle.',
  'diner',
  10, 25, 1,
  520, 40.0, 45.0, 16.0,
  '[
    {"name": "Steak de boeuf 5% MG", "quantity": "150", "unit": "g"},
    {"name": "Patate douce", "quantity": "200", "unit": "g"},
    {"name": "Haricots verts", "quantity": "100", "unit": "g"},
    {"name": "Huile d''olive", "quantity": "8", "unit": "ml"},
    {"name": "Ail en poudre", "quantity": "2", "unit": "g"},
    {"name": "Paprika", "quantity": "2", "unit": "g"},
    {"name": "Romarin sec", "quantity": "1", "unit": "pincee"},
    {"name": "Sel et poivre", "quantity": "1", "unit": "pincee"},
    {"name": "Beurre", "quantity": "5", "unit": "g"}
  ]'::jsonb,
  '[
    "Prechauffer le four a 200 degres Celsius.",
    "Eplucher la patate douce et la couper en cubes. Les disposer sur une plaque avec un filet d''huile d''olive, le paprika et l''ail en poudre. Enfourner 20-25 minutes.",
    "Faire cuire les haricots verts a la vapeur ou dans l''eau bouillante salee pendant 8 minutes. Egoutter et reserver.",
    "Sortir le steak du refrigerateur 15 minutes avant la cuisson pour qu''il soit a temperature ambiante.",
    "Saisir le steak dans une poele tres chaude avec un filet d''huile d''olive, 3 minutes de chaque cote pour une cuisson a point.",
    "En fin de cuisson, ajouter la noix de beurre et le romarin dans la poele, arroser le steak avec le beurre fondu.",
    "Laisser reposer le steak 3 minutes sur une planche, puis dresser avec la patate douce rotie et les haricots verts."
  ]'::jsonb,
  ARRAY['high-protein','muscle-building','diner','classique'],
  NULL, false, true, 'coach'
)

ON CONFLICT DO NOTHING;
