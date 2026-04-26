-- Add training_program_id FK on client_programs
-- This allows tracking which template a client_programs row was
-- assigned from, enabling features like push global update from
-- template to all clients having it assigned.
-- Nullable because legacy assignments do not have this link, and
-- AI-generated programs (no template behind) will also stay null.

ALTER TABLE client_programs
ADD COLUMN IF NOT EXISTS training_program_id UUID
REFERENCES training_programs(id) ON DELETE SET NULL;

-- Index for querying clients having a specific template assigned
CREATE INDEX IF NOT EXISTS idx_client_programs_training_program_id
ON client_programs(training_program_id)
WHERE training_program_id IS NOT NULL;
