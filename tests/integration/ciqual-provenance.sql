-- Run against the disposable snapshot after applying the migration twice.
DO $$
BEGIN
 IF (SELECT count(*) FROM food_items WHERE source='ANSES' AND source_version='2025' AND ciqual_code IS NOT NULL) <> 3484 THEN RAISE EXCEPTION 'Ciqual mapping incomplete'; END IF;
 IF (SELECT count(*) FROM food_items WHERE source='unverified') <> 15 THEN RAISE EXCEPTION 'Unmatched references not isolated'; END IF;
 IF EXISTS (SELECT 1 FROM selectable_food_items WHERE source='unverified' OR energy_kcal IS NULL OR proteins IS NULL OR carbohydrates IS NULL OR fat IS NULL) THEN RAISE EXCEPTION 'Invalid selectable record'; END IF;
 IF (SELECT count(*) FROM selectable_food_items WHERE source='ANSES') <> 3323 THEN RAISE EXCEPTION 'Unexpected complete Ciqual count'; END IF;
 IF EXISTS (SELECT 1 FROM food_items WHERE source='ANSES' AND nutrients_raw->>'energy_kcal'='-' AND energy_kcal IS NOT NULL) THEN RAISE EXCEPTION 'Unknown energy became zero'; END IF;
 IF EXISTS (SELECT 1 FROM food_items WHERE source='ANSES' AND nutrients_raw->>'fat' LIKE '<%' AND fat=0) THEN RAISE EXCEPTION 'Threshold became exact zero'; END IF;
 IF NOT EXISTS(SELECT 1 FROM food_items WHERE source='ANSES' AND nutrients_raw->>'fat'='traces' AND fat=0) THEN RAISE EXCEPTION 'Raw trace information lost'; END IF;
 IF (SELECT calories FROM historical_log WHERE id=123) <> 123 THEN RAISE EXCEPTION 'History changed'; END IF;
 IF has_table_privilege('authenticated','selectable_food_items','INSERT') OR has_table_privilege('anon','selectable_food_items','UPDATE') THEN RAISE EXCEPTION 'Unexpected write grants'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.selectable_food_items'::regclass AND reloptions @> ARRAY['security_invoker=true']) THEN RAISE EXCEPTION 'View bypasses RLS'; END IF;
END $$;
SET ROLE authenticated;
SELECT count(*) AS visible_complete_references FROM public.selectable_food_items;
RESET ROLE;
