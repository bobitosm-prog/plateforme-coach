-- Backfill badge_id from badge_type on old rows and mark them as celebrated
UPDATE user_badges SET badge_id = badge_type, celebrated = true WHERE badge_id IS NULL AND badge_type IS NOT NULL;
