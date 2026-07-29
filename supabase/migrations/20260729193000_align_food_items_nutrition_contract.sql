-- Align food_items schema with current nutrition consumers.
-- Existing legacy columns are preserved for compatibility.

ALTER TABLE public.food_items
ADD COLUMN IF NOT EXISTS energy_kcal numeric DEFAULT 0;

ALTER TABLE public.food_items
ADD COLUMN IF NOT EXISTS proteins numeric DEFAULT 0;

ALTER TABLE public.food_items
ADD COLUMN IF NOT EXISTS carbohydrates numeric DEFAULT 0;
