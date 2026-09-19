-- Generic cooked seitan: align the curated journal entry with fitness-food-database.ts.
-- Branded/Ciqual products and historical consumption snapshots are intentionally unchanged.
UPDATE public.food_items
SET energy_kcal = 145, proteins = 25, carbohydrates = 6, fat = 2
WHERE source = 'fitness' AND name = 'Seitan'
  AND energy_kcal = 370 AND proteins = 75 AND carbohydrates = 14 AND fat = 2;
