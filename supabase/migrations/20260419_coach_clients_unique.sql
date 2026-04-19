-- Remove duplicate coach_clients entries (keep the oldest)
DELETE FROM coach_clients a
USING coach_clients b
WHERE a.id > b.id
  AND a.coach_id = b.coach_id
  AND a.client_id = b.client_id;

-- Add unique constraint to prevent future duplicates
ALTER TABLE coach_clients
  DROP CONSTRAINT IF EXISTS coach_clients_coach_client_unique;

ALTER TABLE coach_clients
  ADD CONSTRAINT coach_clients_coach_client_unique
  UNIQUE (coach_id, client_id);
