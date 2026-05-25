-- F3.2 Sprint i18n closure — add EN/DE columns to exercises_db
-- Additive only, NULL-able, no data destruction
-- Backfill via script Node + Claude API in F3.4

ALTER TABLE exercises_db
  ADD COLUMN IF NOT EXISTS name_en        text,
  ADD COLUMN IF NOT EXISTS name_de        text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_de text,
  ADD COLUMN IF NOT EXISTS tips_en        text,
  ADD COLUMN IF NOT EXISTS tips_de        text;

-- Optional indexes for search if needed later — skipped for now (low volume 178 rows)

COMMENT ON COLUMN exercises_db.name_en        IS 'i18n EN translation of name';
COMMENT ON COLUMN exercises_db.name_de        IS 'i18n DE translation of name';
COMMENT ON COLUMN exercises_db.description_en IS 'i18n EN translation of description';
COMMENT ON COLUMN exercises_db.description_de IS 'i18n DE translation of description';
COMMENT ON COLUMN exercises_db.tips_en        IS 'i18n EN translation of tips';
COMMENT ON COLUMN exercises_db.tips_de        IS 'i18n DE translation of tips';
