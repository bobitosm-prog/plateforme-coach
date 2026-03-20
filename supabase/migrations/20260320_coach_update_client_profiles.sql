-- Allow coaches to update profiles of their clients
CREATE POLICY "coaches can update client profiles"
ON profiles FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM coach_clients
    WHERE coach_id = auth.uid() AND client_id = profiles.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM coach_clients
    WHERE coach_id = auth.uid() AND client_id = profiles.id
  )
);
